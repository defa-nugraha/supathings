<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CultivationBatch;
use App\Models\CultivationExpense;
use App\Models\HarvestRecord;
use App\Models\IotDevice;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CultivationController extends Controller
{
    public function batches(Request $request): JsonResponse
    {
        $batches = $this->batchQuery($request)
            ->with(['harvests' => fn ($query) => $query->latest('harvested_at')])
            ->withSum('harvests as total_harvest_kg', 'weight_kg')
            ->latest('inoculated_at')
            ->get();

        return response()->json(['data' => $batches]);
    }

    public function storeBatch(Request $request): JsonResponse
    {
        $ownerId = $request->user()->isAdmin() && $request->filled('user_id')
            ? (int) $request->input('user_id')
            : $request->user()->id;
        $userIdRule = $request->user()->isAdmin()
            ? ['nullable', 'integer', Rule::exists('users', 'id')->where('is_active', true)]
            : ['prohibited'];

        $data = $request->validate([
            'user_id' => $userIdRule,
            'name' => ['required', 'string', 'max:100'],
            'strain' => ['nullable', 'string', 'max:100'],
            'inoculated_at' => ['required', 'date', 'before_or_equal:today'],
            'baglog_count' => ['required', 'integer', 'min:1', 'max:1000000'],
            'phase' => ['sometimes', Rule::in(['incubation', 'fruiting', 'harvesting', 'resting', 'completed'])],
            'iot_device_id' => ['nullable', 'integer', Rule::exists('iot_devices', 'id')->where('user_id', $ownerId)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $batch = CultivationBatch::query()->create([
            ...$data,
            'user_id' => $ownerId,
            'phase' => $data['phase'] ?? 'incubation',
        ]);

        return response()->json(['data' => $batch], 201);
    }

    public function updateBatch(Request $request, string $batch): JsonResponse
    {
        $cultivationBatch = $this->batchQuery($request)
            ->findOrFail($batch);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'strain' => ['nullable', 'string', 'max:100'],
            'inoculated_at' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'baglog_count' => ['sometimes', 'required', 'integer', 'min:1', 'max:1000000'],
            'phase' => ['sometimes', Rule::in(['incubation', 'fruiting', 'harvesting', 'resting', 'completed'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
        $cultivationBatch->update($data);

        return response()->json(['data' => $cultivationBatch->fresh()]);
    }

    public function destroyBatch(Request $request, string $batch): JsonResponse
    {
        $record = $this->batchQuery($request)
            ->findOrFail($batch);

        if ($record->harvests()->exists() || $record->expenses()->exists()) {
            return response()->json([
                'message' => 'Batch tidak dapat dihapus karena sudah memiliki catatan panen atau biaya. Hapus atau pindahkan catatan terkait terlebih dahulu.',
            ], 422);
        }

        $record->delete();

        return response()->json(['message' => 'Batch berhasil dihapus.']);
    }

    public function harvests(Request $request): JsonResponse
    {
        $records = $this->harvestQuery($request)
            ->with('batch:id,name')
            ->latest('harvested_at')
            ->limit(200)
            ->get();

        return response()->json(['data' => $records]);
    }

    public function storeHarvest(Request $request, string $batch): JsonResponse
    {
        $cultivationBatch = $this->batchQuery($request)
            ->findOrFail($batch);

        $data = $request->validate([
            'harvested_at' => ['required', 'date', 'before_or_equal:today'],
            'flush_number' => ['required', 'integer', 'min:1', 'max:20'],
            'weight_kg' => ['required', 'numeric', 'gt:0', 'max:100000'],
            'quality' => ['nullable', Rule::in(['premium', 'good', 'standard', 'reject'])],
            'sale_price_per_kg' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $record = HarvestRecord::query()->create([
            ...$data,
            'user_id' => $cultivationBatch->user_id,
            'cultivation_batch_id' => $cultivationBatch->id,
        ]);

        return response()->json(['data' => $record->load('batch:id,name')], 201);
    }

    public function updateHarvest(Request $request, string $harvest): JsonResponse
    {
        $record = $this->harvestQuery($request)
            ->findOrFail($harvest);

        $batchRule = Rule::exists('cultivation_batches', 'id');
        if (! $request->user()->isAdmin()) {
            $batchRule->where('user_id', $request->user()->id);
        }

        $data = $request->validate([
            'cultivation_batch_id' => ['sometimes', 'required', 'integer', $batchRule],
            'harvested_at' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'flush_number' => ['sometimes', 'required', 'integer', 'min:1', 'max:20'],
            'weight_kg' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:100000'],
            'quality' => ['nullable', Rule::in(['premium', 'good', 'standard', 'reject'])],
            'sale_price_per_kg' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        if (isset($data['cultivation_batch_id'])) {
            $data['user_id'] = $this->batchQuery($request)->findOrFail($data['cultivation_batch_id'])->user_id;
        }

        $record->update($data);

        return response()->json(['data' => $record->fresh()->load('batch:id,name')]);
    }

    public function destroyHarvest(Request $request, string $harvest): JsonResponse
    {
        $record = $this->harvestQuery($request)
            ->findOrFail($harvest);
        $record->delete();

        return response()->json(['message' => 'Catatan panen berhasil dihapus.']);
    }

    public function expenses(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $records = $this->expenseQuery($request)
            ->with('batch:id,name')
            ->whereBetween('incurred_at', [
                $data['from'] ?? now()->subDays(29)->toDateString(),
                $data['to'] ?? now()->toDateString(),
            ])
            ->latest('incurred_at')
            ->limit(500)
            ->get();

        return response()->json(['data' => $records]);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $batchRule = Rule::exists('cultivation_batches', 'id');
        if (! $request->user()->isAdmin()) {
            $batchRule->where('user_id', $request->user()->id);
        }
        $userIdRule = $request->user()->isAdmin()
            ? ['nullable', 'integer', Rule::exists('users', 'id')->where('is_active', true)]
            : ['prohibited'];

        $data = $request->validate([
            'user_id' => $userIdRule,
            'cultivation_batch_id' => ['nullable', 'integer', $batchRule],
            'incurred_at' => ['required', 'date', 'before_or_equal:today'],
            'category' => ['required', Rule::in(['baglog', 'bibit', 'listrik', 'air', 'tenaga_kerja', 'perawatan', 'lainnya'])],
            'description' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:100000000000'],
        ]);

        $ownerId = isset($data['cultivation_batch_id'])
            ? $this->batchQuery($request)->findOrFail($data['cultivation_batch_id'])->user_id
            : (int) ($data['user_id'] ?? $request->user()->id);

        $expense = CultivationExpense::query()->create([
            ...$data,
            'user_id' => $ownerId,
        ]);

        return response()->json(['data' => $expense->load('batch:id,name')], 201);
    }

    public function updateExpense(Request $request, string $expense): JsonResponse
    {
        $record = $this->expenseQuery($request)
            ->findOrFail($expense);

        $batchRule = Rule::exists('cultivation_batches', 'id');
        if (! $request->user()->isAdmin()) {
            $batchRule->where('user_id', $request->user()->id);
        }

        $data = $request->validate([
            'cultivation_batch_id' => ['nullable', 'integer', $batchRule],
            'incurred_at' => ['required', 'date', 'before_or_equal:today'],
            'category' => ['required', Rule::in(['baglog', 'bibit', 'listrik', 'air', 'tenaga_kerja', 'perawatan', 'lainnya'])],
            'description' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:100000000000'],
        ]);

        if (isset($data['cultivation_batch_id'])) {
            $data['user_id'] = $this->batchQuery($request)->findOrFail($data['cultivation_batch_id'])->user_id;
        }

        $record->update($data);

        return response()->json(['data' => $record->fresh()->load('batch:id,name')]);
    }

    public function destroyExpense(Request $request, string $expense): JsonResponse
    {
        $record = $this->expenseQuery($request)
            ->findOrFail($expense);
        $record->delete();

        return response()->json(['message' => 'Biaya operasional berhasil dihapus.']);
    }

    private function batchQuery(Request $request): Builder<CultivationBatch>
    {
        $query = CultivationBatch::query();

        if (! $request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }

        return $query;
    }

    private function harvestQuery(Request $request): Builder<HarvestRecord>
    {
        $query = HarvestRecord::query();

        if (! $request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }

        return $query;
    }

    private function expenseQuery(Request $request): Builder<CultivationExpense>
    {
        $query = CultivationExpense::query();

        if (! $request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }

        return $query;
    }

    public function alerts(Request $request): JsonResponse
    {
        $devices = IotDevice::query()
            ->when(! $request->user()->isAdmin(), fn ($query) => $query->where('user_id', $request->user()->id))
            ->with(['controlRules', 'readings' => fn ($query) => $query->latest('measured_at')->limit(1)])
            ->get();

        $alerts = [];
        foreach ($devices as $device) {
            if (! $device->last_seen_at || strtotime($device->last_seen_at) < now()->subMinutes(5)->timestamp) {
                $alerts[] = [
                    'key' => 'offline-'.$device->id,
                    'severity' => 'warning',
                    'title' => 'Perangkat tidak aktif',
                    'message' => $device->name.' tidak mengirim data dalam 5 menit terakhir.',
                    'device_id' => $device->id,
                ];
            }

            $reading = $device->readings->first();
            if (! $reading) {
                continue;
            }
            foreach ($device->controlRules->where('enabled', true) as $rule) {
                $value = match ($rule->parameter) {
                    'temperature' => $reading->temperature,
                    'humidity' => $reading->humidity,
                    'light' => $reading->light_percent,
                    default => null,
                };
                if ($value === null) {
                    continue;
                }
                if (($rule->minimum !== null && $value < $rule->minimum) || ($rule->maximum !== null && $value > $rule->maximum)) {
                    $alerts[] = [
                        'key' => 'threshold-'.$device->id.'-'.$rule->parameter,
                        'severity' => 'critical',
                        'title' => 'Kondisi sensor di luar ambang',
                        'message' => $device->name.' — '.$rule->parameter.' bernilai '.$value.'; rentang yang disetel '.$rule->minimum.'–'.$rule->maximum.'.',
                        'device_id' => $device->id,
                    ];
                }
            }
        }

        return response()->json(['data' => $alerts]);
    }
}
