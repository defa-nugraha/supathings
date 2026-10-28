<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\EvaluateControlRules;
use App\Jobs\StoreSensorReading;
use App\Models\ActuatorCommand;
use App\Models\ControlRule;
use App\Models\IotDevice;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class IotDeviceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $devices = $this->deviceQuery($request)->with('controlRules')->latest()->get();
        foreach ($devices as $device) {
            if (! $device->last_seen_at || Carbon::parse($device->last_seen_at)->lt(now()->subMinutes(5))) {
                if ($device->status !== 'offline') {
                    $device->forceFill(['status' => 'offline'])->save();
                }
            }
        }

        return response()->json(['data' => $devices]);
    }

    public function readings(Request $request, string $device): JsonResponse
    {
        $iotDevice = $this->deviceQuery($request)->where(function ($query) use ($device): void {
            $query->where('id', $device)->orWhere('mac_address', Str::upper($device));
        })->firstOrFail();

        return response()->json([
            'data' => $iotDevice->readings()->latest('measured_at')->limit(500)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required', 'string', 'max:17', 'regex:/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/'],
            'name' => ['required', 'string', 'max:100'],
            'sensors' => ['sometimes', 'array'],
        ]);

        $mac = Str::upper($data['device_id']);
        $device = IotDevice::query()->where('mac_address', $mac)->first();
        if ($device && $device->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Device sudah terdaftar pada akun lain.'], 409);
        }

        $token = Str::random(64);
        $device = IotDevice::query()->updateOrCreate(
            ['mac_address' => $mac, 'user_id' => $request->user()->id],
            ['name' => $data['name'], 'status' => 'offline', 'last_seen_at' => null, 'device_token_hash' => hash('sha256', $token), 'metadata' => ['sensors' => $data['sensors'] ?? ['DHT22', 'LDR']]],
        );

        return response()->json(['data' => $device, 'device_token' => $token], 201);
    }

    public function update(Request $request, string $device): JsonResponse
    {
        $record = $this->deviceQuery($request)
            ->where(function ($query) use ($device): void {
                $query->where('id', $device)->orWhere('mac_address', Str::upper($device));
            })
            ->firstOrFail();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);
        $record->update(['name' => $data['name']]);

        return response()->json(['data' => $record->fresh()]);
    }

    public function destroy(Request $request, string $device): JsonResponse
    {
        $record = IotDevice::query()
            ->where(function ($query) use ($device): void {
                $query->where('id', $device)->orWhere('mac_address', Str::upper($device));
            })
            ->firstOrFail();

        $record->delete();

        return response()->json(['message' => 'Perangkat berhasil dihapus dari akun.']);
    }

    public function telemetry(Request $request): JsonResponse
    {
        $device = $this->deviceFromToken($request);
        if (! $device) {
            return response()->json(['message' => 'Device token tidak valid.'], 401);
        }

        $reading = $request->validate([
            'temperature' => ['nullable', 'numeric', 'between:-20,100'],
            'humidity' => ['nullable', 'numeric', 'between:0,100'],
            'light_raw' => ['nullable', 'integer', 'between:0,65535'],
            'light_percent' => ['nullable', 'numeric', 'between:0,100'],
            'timestamp' => ['nullable', 'date'],
        ]);

        $device->forceFill(['status' => 'online', 'last_seen_at' => now()])->save();

        // Persist and evaluate after the HTTP response so telemetry ingestion stays responsive.
        StoreSensorReading::dispatchSync($device->id, $reading);
        EvaluateControlRules::dispatchSync($device->id, $reading);

        return response()->json(['accepted' => true], 202);
    }

    public function rules(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required'],
            'rules' => ['required', 'array'],
        ]);
        $device = $this->deviceQuery($request)->where(function ($query) use ($data): void {
            $query->where('id', $data['device_id']);
            if (is_string($data['device_id'])) {
                $query->orWhere('mac_address', Str::upper($data['device_id']));
            }
        })->firstOrFail();
        $map = [
            'temperature' => ['temperatureMin', 'temperatureMax'],
            'humidity' => ['humidityMin', 'humidityMax'],
            'light' => ['lightMin', 'lightMax'],
        ];

        foreach ($map as $parameter => [$minKey, $maxKey]) {
            if (! isset($data['rules'][$minKey], $data['rules'][$maxKey])) {
                continue;
            }
            $minimum = filter_var($data['rules'][$minKey], FILTER_VALIDATE_FLOAT);
            $maximum = filter_var($data['rules'][$maxKey], FILTER_VALIDATE_FLOAT);
            if ($minimum === false || $maximum === false || $minimum >= $maximum) {
                return response()->json(['message' => "Ambang batas {$parameter} tidak valid."], 422);
            }
            ControlRule::query()->updateOrCreate(
                ['iot_device_id' => $device->id, 'parameter' => $parameter],
                ['minimum' => $minimum, 'maximum' => $maximum, 'enabled' => true],
            );
        }

        return response()->json(['data' => $device->controlRules()->get()]);
    }

    public function mode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required'],
            'mode' => ['required', Rule::in(['manual', 'automatic'])],
        ]);
        $device = $this->deviceQuery($request)->where(function ($query) use ($data): void {
            $query->where('id', $data['device_id']);
            if (is_string($data['device_id'])) {
                $query->orWhere('mac_address', Str::upper($data['device_id']));
            }
        })->firstOrFail();
        $device->forceFill(['control_mode' => $data['mode']])->save();

        return response()->json(['data' => $device->only(['id', 'mac_address', 'control_mode'])]);
    }

    public function actuatorStatus(Request $request): JsonResponse
    {
        $data = $request->validate(['device_id' => ['required']]);
        $device = IotDevice::query()
            ->where(function ($query) use ($data): void {
                $query->where('id', $data['device_id']);
                if (is_string($data['device_id'])) {
                    $query->orWhere('mac_address', Str::upper($data['device_id']));
                }
            })
            ->firstOrFail();

        $commands = $device->actuatorCommands()->latest('id')->limit(100)->get();
        $status = [];
        foreach (['mist', 'water', 'blower'] as $actuator) {
            $latest = $commands->first(fn ($command) => $command->actuator === $actuator);
            $acknowledged = $commands->first(
                fn ($command) => $command->actuator === $actuator && $command->status === 'acknowledged',
            );
            $metadata = $acknowledged
                ? json_decode((string) $acknowledged->getRawOriginal('metadata'), true)
                : null;
            $actualState = is_array($metadata) ? ($metadata['actual_state'] ?? null) : null;

            $status[$actuator] = [
                'actual_state' => in_array($actualState, ['on', 'off'], true) ? $actualState : null,
                'command_status' => $latest->status ?? 'unknown',
                'requested_state' => $latest?->state,
                'updated_at' => $latest?->updated_at,
            ];
        }

        return response()->json(['data' => $status]);
    }

    public function command(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required'],
            'actuator' => ['required', Rule::in(['mist', 'water', 'blower'])],
            'state' => ['required', Rule::in(['on', 'off'])],
            'mode' => ['sometimes', Rule::in(['manual', 'automatic'])],
        ]);
        $device = $this->deviceQuery($request)->where(function ($query) use ($data): void {
            $query->where('id', $data['device_id']);
            if (is_string($data['device_id'])) {
                $query->orWhere('mac_address', Str::upper($data['device_id']));
            }
        })->firstOrFail();
        $command = ActuatorCommand::query()->create([
            'iot_device_id' => $device->id,
            'actuator' => $data['actuator'],
            'state' => $data['state'],
            'mode' => $data['mode'] ?? 'manual',
            'status' => 'pending',
            'issued_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $command], 201);
    }

    /**
     * ESP32 polls for commands using Authorization: Bearer <device_token>.
     */
    public function pollCommands(Request $request): JsonResponse
    {
        $device = $this->deviceFromToken($request);
        if (! $device) {
            return response()->json(['message' => 'Device token tidak valid.'], 401);
        }

        $commands = ActuatorCommand::query()
            ->where('iot_device_id', $device->id)
            ->where(function ($query): void {
                $query->where('status', 'pending')
                    ->orWhere(fn ($retry) => $retry->where('status', 'sent')->where('updated_at', '<', now()->subSeconds(30)));
            })
            ->orderBy('id')
            ->limit(10)
            ->get();

        foreach ($commands as $command) {
            $command->forceFill(['status' => 'sent'])->save();
        }

        return response()->json([
            'data' => $commands,
            'device' => [
                'id' => $device->id,
                'control_mode' => $device->control_mode,
                'rules' => $device->controlRules()->where('enabled', true)->get(['parameter', 'minimum', 'maximum']),
            ],
        ]);
    }

    /** Record device acknowledgement; this is not independent proof of electrical state. */
    public function acknowledgeCommand(Request $request, string $command): JsonResponse
    {
        $device = $this->deviceFromToken($request);
        if (! $device) {
            return response()->json(['message' => 'Device token tidak valid.'], 401);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['acknowledged', 'failed'])],
            'actual_state' => ['nullable', Rule::in(['on', 'off'])],
            'message' => ['nullable', 'string', 'max:500'],
        ]);

        $record = ActuatorCommand::query()
            ->where('iot_device_id', $device->id)
            ->findOrFail($command);

        if (! in_array($record->status, ['pending', 'sent'], true)) {
            return response()->json(['message' => 'Perintah sudah diproses.', 'data' => $record], 409);
        }

        $metadata = json_decode((string) $record->getRawOriginal('metadata'), true);
        $metadata = is_array($metadata) ? $metadata : [];

        $record->forceFill([
            'status' => $data['status'],
            'acknowledged_at' => now(),
            'metadata' => array_merge($metadata, [
                'actual_state' => $data['actual_state'] ?? null,
                'device_message' => $data['message'] ?? null,
            ]),
        ])->save();

        return response()->json(['data' => $record->fresh()]);
    }

    private function deviceQuery(Request $request): Builder<IotDevice>
    {
        $query = IotDevice::query();

        if (! $request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }

        return $query;
    }

    private function deviceFromToken(Request $request): ?IotDevice
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $hash = hash('sha256', $token);

        return IotDevice::query()->where('device_token_hash', $hash)->first();
    }
}
