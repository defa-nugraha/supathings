<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CultivationBatch;
use App\Models\HarvestRecord;
use App\Models\SensorReading;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'batch_id' => ['nullable', 'integer'],
        ]);
        $from = Carbon::parse($filters['from'] ?? now()->subDays(29)->toDateString())->startOfDay();
        $to = Carbon::parse($filters['to'] ?? now()->toDateString())->endOfDay();

        $batchesQuery = CultivationBatch::query()->where('user_id', $request->user()->id)
            ->withSum(['harvests as total_harvest_kg' => fn ($q) => $q->whereBetween('harvested_at', [$from, $to])], 'weight_kg')
            ->withCount(['harvests as harvest_count' => fn ($q) => $q->whereBetween('harvested_at', [$from, $to])]);
        if (! empty($filters['batch_id'])) {
            $batchesQuery->whereKey($filters['batch_id']);
        }
        $batches = $batchesQuery->orderBy('name')->get();
        if (! empty($filters['batch_id']) && $batches->isEmpty()) {
            throw ValidationException::withMessages(['batch_id' => 'Batch tidak ditemukan.']);
        }
        $harvests = HarvestRecord::query()->where('user_id', $request->user()->id)
            ->whereBetween('harvested_at', [$from, $to])->whereIn('cultivation_batch_id', $batches->modelKeys())
            ->with('batch:id,name')->orderBy('harvested_at')->get();
        $daily = $harvests->groupBy(fn ($item) => Carbon::parse($item->harvested_at)->toDateString())
            ->map(fn ($items, $date) => ['date' => $date, 'weight_kg' => round((float) $items->sum('weight_kg'), 3), 'records' => $items->count()])->values();

        $readingsQuery = SensorReading::query()->whereHas('device', fn ($q) => $q->where('user_id', $request->user()->id))
            ->whereBetween('measured_at', [$from, $to]);
        if (! empty($filters['batch_id'])) {
            $deviceId = $batches->first()?->iot_device_id;
            $deviceId ? $readingsQuery->where('iot_device_id', $deviceId) : $readingsQuery->whereRaw('1 = 0');
        }
        $readings = $readingsQuery->get(['temperature', 'humidity', 'light_percent', 'measured_at']);
        $metrics = [];
        foreach (['temperature' => ['Suhu', '°C'], 'humidity' => ['Kelembapan', '%'], 'light_percent' => ['Cahaya', '%']] as $field => [$label, $unit]) {
            $values = $readings->pluck($field)->filter(fn ($v) => $v !== null)->map(fn ($v) => (float) $v);
            $metrics[$field] = ['label' => $label, 'unit' => $unit, 'average' => $values->isNotEmpty() ? round($values->avg(), 2) : null,
                'minimum' => $values->isNotEmpty() ? round($values->min(), 2) : null, 'maximum' => $values->isNotEmpty() ? round($values->max(), 2) : null, 'sample_count' => $values->count()];
        }
        $priced = $harvests->filter(fn ($h) => $h->sale_price_per_kg !== null);
        return response()->json(['data' => [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => ['harvest_kg' => round((float) $harvests->sum('weight_kg'), 3), 'harvest_count' => $harvests->count(),
                'batch_count' => $batches->count(), 'revenue_recorded' => round((float) $priced->sum(fn ($h) => (float) $h->weight_kg * (float) $h->sale_price_per_kg), 2),
                'priced_harvest_count' => $priced->count(), 'unpriced_harvest_count' => $harvests->count() - $priced->count()],
            'daily' => $daily,
            'batches' => $batches->map(fn ($b) => ['id' => $b->id, 'name' => $b->name, 'strain' => $b->strain, 'phase' => $b->phase,
                'inoculated_at' => $b->inoculated_at?->toDateString(), 'baglog_count' => $b->baglog_count,
                'harvest_kg' => round((float) ($b->total_harvest_kg ?? 0), 3), 'harvest_count' => $b->harvest_count,
                'has_device' => $b->iot_device_id !== null])->values(),
            'harvests' => $harvests->map(fn ($h) => ['id' => $h->id, 'date' => $h->harvested_at->toDateString(), 'batch' => $h->batch?->name ?? 'Batch',
                'flush_number' => $h->flush_number, 'weight_kg' => (float) $h->weight_kg, 'quality' => $h->quality,
                'sale_price_per_kg' => $h->sale_price_per_kg === null ? null : (float) $h->sale_price_per_kg])->values(),
            'sensors' => ['reading_count' => $readings->count(), 'metrics' => $metrics],
        ]]);
    }
}
