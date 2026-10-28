<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CultivationBatch;
use App\Models\CultivationExpense;
use App\Models\HarvestRecord;
use App\Models\IotDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CultivationController extends Controller
{
    public function batches(Request $request): JsonResponse
    {
        $batches = CultivationBatch::query()
            ->where('user_id', $request->user()->id)
            ->with(['harvests' => fn ($query) => $query->latest('harvested_at')])
            ->withSum('harvests as total_harvest_kg', 'weight_kg')
            ->latest('inoculated_at')
            ->get();

        return response()->json(['data' => $batches]);
    }

    public function storeBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'strain' => ['nullable', 'string', 'max:100'],
            'inoculated_at' => ['required', 'date', 'before_or_equal:today'],
            'baglog_count' => ['required', 'integer', 'min:1', 'max:1000000'],
            'phase' => ['sometimes', Rule::in(['incubation', 'fruiting', 'harvesting', 'resting', 'completed'])],
            'iot_device_id' => ['nullable', 'integer', Rule::exists('iot_devices', 'id')->where('user_id', $request->user()->id)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $batch = CultivationBatch::query()->create([
            ...$data,
            'user_id' => $request->user()->id,
            'phase' => $data['phase'] ?? 'incubation',
        ]);

        return response()->json(['data' => $batch], 201);
    }

    public function updateBatch(Request $request, string $batch): JsonResponse
    {
        $cultivationBatch = CultivationBatch::query()
            ->where('user_id', $request->user()->id)
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
        $record = CultivationBatch::query()
            ->where('user_id', $request->user()->id)
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
        $records = HarvestRecord::query()
            ->where('user_id', $request->user()->id)
            ->with('batch:id,name')
            ->latest('harvested_at')
            ->limit(200)
            ->get();

        return response()->json(['data' => $records]);
    }

    public function storeHarvest(Request $request, string $batch): JsonResponse
    {
        $cultivationBatch = CultivationBatch::query()
            ->where('user_id', $request->user()->id)
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
            'user_id' => $request->user()->id,
            'cultivation_batch_id' => $cultivationBatch->id,
        ]);

        return response()->json(['data' => $record->load('batch:id,name')], 201);
    }

    public function updateHarvest(Request $request, string $harvest): JsonResponse
    {
        $record = HarvestRecord::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($harvest);

        $data = $request->validate([
            'cultivation_batch_id' => ['sometimes', 'required', 'integer', Rule::exists('cultivation_batches', 'id')->where('user_id', $request->user()->id)],
            'harvested_at' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'flush_number' => ['sometimes', 'required', 'integer', 'min:1', 'max:20'],
            'weight_kg' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:100000'],
            'quality' => ['nullable', Rule::in(['premium', 'good', 'standard', 'reject'])],
            'sale_price_per_kg' => ['nullable', 'numeric', 'min:0', 'max:1000000000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $record->update($data);

        return response()->json(['data' => $record->fresh()->load('batch:id,name')]);
    }

    public function destroyHarvest(Request $request, string $harvest): JsonResponse
    {
        $record = HarvestRecord::query()
            ->where('user_id', $request->user()->id)
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
        $records = CultivationExpense::query()
            ->where('user_id', $request->user()->id)
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
        $data = $request->validate([
            'cultivation_batch_id' => ['nullable', 'integer', Rule::exists('cultivation_batches', 'id')->where('user_id', $request->user()->id)],
            'incurred_at' => ['required', 'date', 'before_or_equal:today'],
            'category' => ['required', Rule::in(['baglog', 'bibit', 'listrik', 'air', 'tenaga_kerja', 'perawatan', 'lainnya'])],
            'description' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:100000000000'],
        ]);

        $expense = CultivationExpense::query()->create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $expense->load('batch:id,name')], 201);
    }

    public function updateExpense(Request $request, string $expense): JsonResponse
    {
        $record = CultivationExpense::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($expense);

        $data = $request->validate([
            'cultivation_batch_id' => ['nullable', 'integer', Rule::exists('cultivation_batches', 'id')->where('user_id', $request->user()->id)],
            'incurred_at' => ['required', 'date', 'before_or_equal:today'],
            'category' => ['required', Rule::in(['baglog', 'bibit', 'listrik', 'air', 'tenaga_kerja', 'perawatan', 'lainnya'])],
            'description' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:100000000000'],
        ]);

        $record->update($data);

        return response()->json(['data' => $record->fresh()->load('batch:id,name')]);
    }

    public function destroyExpense(Request $request, string $expense): JsonResponse
    {
        $record = CultivationExpense::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($expense);
        $record->delete();

        return response()->json(['message' => 'Biaya operasional berhasil dihapus.']);
    }

    public function alerts(Request $request): JsonResponse
    {
        $devices = IotDevice::query()
            ->where('user_id', $request->user()->id)
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
