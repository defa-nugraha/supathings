<?php

namespace App\Services\Ai;

use App\Models\ActuatorCommand;
use App\Models\AiAnalysis;
use App\Models\ControlRule;
use App\Models\CultivationBatch;
use App\Models\CultivationExpense;
use App\Models\HarvestRecord;
use App\Models\IotDevice;
use App\Models\SensorReading;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiCultivationService
{
    private const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

    /**
     * @return array<string, mixed>
     */
    public function analyze(User $user, CarbonInterface $from, CarbonInterface $to): array
    {
        $context = $this->context($user, $from, $to);
        $fingerprint = hash('sha256', json_encode($context, JSON_THROW_ON_ERROR));

        try {
            $result = $this->generate(
                'Anda adalah SupaThings AI untuk budidaya jamur tiram. Gunakan hanya data yang diberikan. Bedakan fakta dan inferensi. Jangan mengarang angka. Berikan rekomendasi yang dapat diverifikasi operator dan jangan mengendalikan aktuator.',
                'Analisis lingkungan, anomali, tren, risiko, rekomendasi operator, prediksi tren sederhana, dan implikasi biaya. Jangan mengubah aturan kontrol. Data: '.json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                $this->analysisSchema(),
            );

            AiAnalysis::query()->create([
                'user_id' => $user->id,
                'type' => 'cultivation_analysis',
                'period_from' => $from,
                'period_to' => $to,
                'model' => config('vertex-ai.model'),
                'status' => 'completed',
                'input_fingerprint' => $fingerprint,
                'response' => $result,
            ]);

            return $result;
        } catch (\Throwable $exception) {
            AiAnalysis::query()->create([
                'user_id' => $user->id,
                'type' => 'cultivation_analysis',
                'period_from' => $from,
                'period_to' => $to,
                'model' => config('vertex-ai.model'),
                'status' => 'failed',
                'input_fingerprint' => $fingerprint,
                'error_message' => $exception->getMessage(),
            ]);
            throw $exception;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function chat(User $user, string $question): array
    {
        $to = now();
        $from = $to->copy()->subHours(config('vertex-ai.analysis_window_hours', 24));

        return $this->generate(
            'Anda adalah SupaThings AI. Jawab hanya berdasarkan konteks SupaThings akun ini. Jangan mengarang data dan jangan memberi perintah langsung untuk aktuator. Jawab ringkas dalam Bahasa Indonesia.',
            'Pertanyaan operator: '.$question.PHP_EOL.'Konteks: '.json_encode($this->context($user, $from, $to), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $this->chatSchema(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function context(User $user, CarbonInterface $from, CarbonInterface $to): array
    {
        $devices = IotDevice::query()->where('user_id', $user->id)->with('controlRules')->get();
        $deviceIds = $devices->modelKeys();
        $readings = SensorReading::query()
            ->whereIn('iot_device_id', $deviceIds)
            ->whereBetween('measured_at', [$from, $to])
            ->orderBy('measured_at')
            ->limit(5000)
            ->get(['iot_device_id', 'temperature', 'humidity', 'light_percent', 'measured_at']);
        $batches = CultivationBatch::query()
            ->where('user_id', $user->id)
            ->withSum('harvests as total_harvest_kg', 'weight_kg')
            ->withCount('harvests')
            ->latest('inoculated_at')
            ->limit(100)
            ->get();
        $batchIds = $batches->modelKeys();
        $harvests = HarvestRecord::query()
            ->where('user_id', $user->id)
            ->whereBetween('harvested_at', [$from->toDateString(), $to->toDateString()])
            ->whereIn('cultivation_batch_id', $batchIds)
            ->get();
        $expenses = CultivationExpense::query()
            ->where('user_id', $user->id)
            ->whereBetween('incurred_at', [$from->toDateString(), $to->toDateString()])
            ->get();
        $commands = ActuatorCommand::query()
            ->whereIn('iot_device_id', $deviceIds)
            ->whereBetween('created_at', [$from, $to])
            ->get(['iot_device_id', 'actuator', 'state', 'mode', 'status', 'created_at', 'acknowledged_at']);

        return [
            'period' => ['from' => $from->toISOString(), 'to' => $to->toISOString()],
            'devices' => $devices->map(fn (IotDevice $device): array => [
                'id' => $device->id,
                'name' => $device->name,
                'status' => $device->status,
                'last_seen_at' => $device->last_seen_at === null
                    ? null
                    : Carbon::parse($device->last_seen_at)->toISOString(),
                'control_mode' => $device->control_mode,
                'rules' => $device->controlRules->map(fn (ControlRule $rule): array => [
                    'parameter' => $rule->parameter,
                    'minimum' => (float) $rule->minimum,
                    'maximum' => (float) $rule->maximum,
                    'enabled' => (bool) $rule->enabled,
                ])->values()->all(),
            ])->values()->all(),
            'environment' => $this->environment($readings, $devices),
            'actuators' => $commands->groupBy('actuator')->map(fn ($items): array => [
                'commands' => $items->count(),
                'on' => $items->where('state', 'on')->count(),
                'off' => $items->where('state', 'off')->count(),
                'automatic' => $items->where('mode', 'automatic')->count(),
            ])->all(),
            'cultivation' => [
                'active_batches' => $batches->where('phase', '!=', 'completed')->count(),
                'batches' => $batches->map(fn (CultivationBatch $batch): array => [
                    'name' => $batch->name,
                    'strain' => $batch->strain,
                    'phase' => $batch->phase,
                    'baglog_count' => (int) $batch->baglog_count,
                    'harvest_kg' => round((float) ($batch->total_harvest_kg ?? 0), 3),
                    'harvest_count' => (int) $batch->harvest_count,
                ])->values()->all(),
                'harvest_kg' => round((float) $harvests->sum('weight_kg'), 3),
                'harvest_count' => $harvests->count(),
            ],
            'financial' => [
                'revenue_recorded' => round((float) $harvests->filter(fn ($h) => $h->sale_price_per_kg !== null)->sum(fn ($h) => (float) $h->weight_kg * (float) $h->sale_price_per_kg), 2),
                'expenses_recorded' => round((float) $expenses->sum('amount'), 2),
                'expense_by_category' => $expenses->groupBy('category')->map(fn ($items): float => round((float) $items->sum('amount'), 2))->all(),
            ],
        ];
    }

    /**
     * @param  EloquentCollection<int, SensorReading> $readings
     * @param  EloquentCollection<int, IotDevice> $devices
     * @return array<string, mixed>
     */
    private function environment(EloquentCollection $readings, EloquentCollection $devices): array
    {
        $metrics = [];
        foreach (['temperature' => '°C', 'humidity' => '%', 'light_percent' => '%'] as $field => $unit) {
            $values = $readings->pluck($field)->filter(fn ($v) => $v !== null)->map(fn ($v) => (float) $v);
            $metrics[$field] = [
                'unit' => $unit,
                'samples' => $values->count(),
                'average' => $values->isNotEmpty() ? round($values->avg(), 2) : null,
                'minimum' => $values->isNotEmpty() ? round($values->min(), 2) : null,
                'maximum' => $values->isNotEmpty() ? round($values->max(), 2) : null,
                'trend_per_hour' => $this->trend($readings, $field),
            ];
        }

        $anomalies = [];
        foreach ($devices as $device) {
            foreach ($device->controlRules->where('enabled', true) as $rule) {
                $field = match ($rule->parameter) {
                    'temperature' => 'temperature',
                    'humidity' => 'humidity',
                    'light' => 'light_percent',
                    default => null,
                };
                if ($field === null) {
                    continue;
                }

                $values = $readings->where('iot_device_id', $device->id)->pluck($field)->filter(fn ($v) => $v !== null)->map(fn ($v) => (float) $v);
                if ($values->isEmpty()) {
                    continue;
                }

                $outside = $values->filter(fn (float $v) => $v < $rule->minimum || $v > $rule->maximum);
                if ($outside->isNotEmpty()) {
                    $anomalies[] = [
                        'device_id' => $device->id,
                        'parameter' => $rule->parameter,
                        'outside_count' => $outside->count(),
                        'sample_count' => $values->count(),
                        'outside_ratio' => round($outside->count() / $values->count(), 3),
                        'minimum' => (float) $rule->minimum,
                        'maximum' => (float) $rule->maximum,
                    ];
                }
            }
        }

        return [
            'metrics' => $metrics,
            'anomalies' => $anomalies,
            'reading_count' => $readings->count(),
            'offline_devices' => $devices->filter(fn (IotDevice $d) => $d->last_seen_at === null || Carbon::parse($d->last_seen_at)->lt(now()->subMinutes(5)))->pluck('name')->values()->all(),
        ];
    }

    /**
     * @param  EloquentCollection<int, SensorReading> $readings
     */
    private function trend(EloquentCollection $readings, string $field): ?float
    {
        $points = $readings->filter(fn ($r) => $r->{$field} !== null)->values();
        if ($points->count() < 3) {
            return null;
        }

        $first = $points->first();
        $last = $points->last();
        $hours = max(1 / 60, $first->measured_at->diffInSeconds($last->measured_at) / 3600);

        return round(((float) $last->{$field} - (float) $first->{$field}) / $hours, 3);
    }

    /**
     * @param  array<string, mixed> $schema
     * @return array<string, mixed>
     */
    private function generate(string $system, string $prompt, array $schema): array
    {
        if (config('vertex-ai.enabled') === false) {
            throw new RuntimeException('Vertex AI belum diaktifkan. Atur VERTEX_AI_ENABLED=true dan kredensial Vertex AI.');
        }

        $project = config('vertex-ai.project_id');
        $location = config('vertex-ai.location', 'global');
        $model = config('vertex-ai.model', 'gemini-3.8-flash');
        if ($project === null || $project === '') {
            throw new RuntimeException('VERTEX_AI_PROJECT_ID belum dikonfigurasi.');
        }

        $token = $this->accessToken();
        $host = $location === 'global' ? 'aiplatform.googleapis.com' : $location.'-aiplatform.googleapis.com';
        $url = sprintf('https://%s/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent', $host, rawurlencode($project), rawurlencode($location), rawurlencode($model));

        try {
            $response = Http::timeout(config('vertex-ai.timeout', 45))
                ->acceptJson()
                ->withToken($token)
                ->post($url, [
                    'systemInstruction' => ['parts' => [['text' => $system]]],
                    'contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'responseSchema' => $schema,
                    ],
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Tidak dapat terhubung ke Vertex AI: '.$exception->getMessage(), 0, $exception);
        }

        if ($response->failed()) {
            throw new RuntimeException('Vertex AI menolak permintaan (HTTP '.$response->status().'): '.$response->json('error.message', 'Unknown error'));
        }

        /** @var array<int, array{text?: string}> $parts */
        $parts = $response->json('candidates.0.content.parts', []);
        $text = '';
        foreach ($parts as $part) {
            if (isset($part['text']) && is_string($part['text'])) {
                $text .= $part['text'];
            }
        }
        $decoded = json_decode($text, true);
        if (is_array($decoded) === false) {
            throw new RuntimeException('Respons Vertex AI bukan JSON yang valid.');
        }

        return $decoded;
    }

    private function accessToken(): string
    {
        if ($token = config('vertex-ai.access_token')) {
            return $token;
        }

        $encoded = config('vertex-ai.service_account_json_base64');
        if ($encoded === null || $encoded === '') {
            throw new RuntimeException('Kredensial Vertex AI belum dikonfigurasi.');
        }

        $credentials = json_decode(base64_decode($encoded, true) ?: '', true);
        if (is_array($credentials) === false || empty($credentials['client_email']) || empty($credentials['private_key'])) {
            throw new RuntimeException('VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64 tidak valid.');
        }

        return Cache::remember(
            'vertex-ai.access-token.'.hash('sha256', (string) $credentials['client_email']),
            now()->addMinutes(50),
            fn (): string => $this->exchangeToken($credentials),
        );
    }

    /**
     * @param  array<string, mixed> $credentials
     */
    private function exchangeToken(array $credentials): string
    {
        $now = time();
        $header = $this->b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $claim = $this->b64(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => self::GOOGLE_SCOPE,
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ], JSON_THROW_ON_ERROR));
        $unsigned = $header.'.'.$claim;
        if (openssl_sign($unsigned, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256) === false) {
            throw new RuntimeException('Gagal menandatangani service account.');
        }

        $response = Http::asForm()->timeout(config('vertex-ai.timeout', 45))->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $unsigned.'.'.$this->b64($signature),
        ]);
        if ($response->failed() || empty($response->json('access_token'))) {
            throw new RuntimeException('Gagal memperoleh access token Google Cloud.');
        }

        return (string) $response->json('access_token');
    }

    private function b64(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    /**
     * @return array<string, mixed>
     */
    private function analysisSchema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'status' => ['type' => 'STRING', 'enum' => ['normal', 'warning', 'critical', 'insufficient_data']],
                'summary' => ['type' => 'STRING'],
                'findings' => ['type' => 'ARRAY', 'items' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'title' => ['type' => 'STRING'],
                        'severity' => ['type' => 'STRING', 'enum' => ['info', 'warning', 'critical']],
                        'description' => ['type' => 'STRING'],
                        'evidence' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                    ],
                    'required' => ['title', 'severity', 'description', 'evidence'],
                ]],
                'recommendations' => ['type' => 'ARRAY', 'items' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'priority' => ['type' => 'STRING', 'enum' => ['low', 'medium', 'high']],
                        'title' => ['type' => 'STRING'],
                        'action' => ['type' => 'STRING'],
                        'reason' => ['type' => 'STRING'],
                    ],
                    'required' => ['priority', 'title', 'action', 'reason'],
                ]],
                'predictions' => ['type' => 'ARRAY', 'items' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'metric' => ['type' => 'STRING'],
                        'horizon' => ['type' => 'STRING'],
                        'trend' => ['type' => 'STRING', 'enum' => ['rising', 'falling', 'stable', 'unknown']],
                        'expected_value' => ['type' => 'NUMBER', 'nullable' => true],
                        'confidence' => ['type' => 'NUMBER'],
                    ],
                    'required' => ['metric', 'horizon', 'trend', 'expected_value', 'confidence'],
                ]],
                'financial' => ['type' => 'OBJECT', 'properties' => [
                    'summary' => ['type' => 'STRING'],
                    'risk' => ['type' => 'STRING'],
                ], 'required' => ['summary', 'risk']],
            ],
            'required' => ['status', 'summary', 'findings', 'recommendations', 'predictions', 'financial'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function chatSchema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'answer' => ['type' => 'STRING'],
                'evidence' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'limitations' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
            ],
            'required' => ['answer', 'evidence', 'limitations'],
        ];
    }
}
