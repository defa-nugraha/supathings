<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAnalysis;
use App\Services\Ai\AiCultivationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class AiIntelligenceController extends Controller
{
    public function latest(Request $request): JsonResponse
    {
        $analysis = AiAnalysis::query()
            ->where('user_id', $request->user()->id)
            ->where('type', 'cultivation_analysis')
            ->latest()
            ->first();

        return response()->json([
            'data' => $analysis ? [
                'id' => $analysis->id,
                'status' => $analysis->status,
                'model' => $analysis->model,
                'period_from' => $analysis->period_from === null ? null : Carbon::parse($analysis->period_from)->toISOString(),
                'period_to' => $analysis->period_to === null ? null : Carbon::parse($analysis->period_to)->toISOString(),
                'created_at' => $analysis->created_at?->toISOString(),
                'analysis' => $analysis->response,
                'error_message' => $analysis->status === 'failed' ? $analysis->error_message : null,
            ] : null,
        ]);
    }

    public function analyze(Request $request, AiCultivationService $service): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $to = Carbon::parse($data['to'] ?? now())->endOfDay();
        $from = isset($data['from'])
            ? Carbon::parse($data['from'])->startOfDay()
            : $to->copy()->subHours(config('vertex-ai.analysis_window_hours', 24));

        if ($from->diffInDays($to) > 7) {
            throw ValidationException::withMessages([
                'from' => 'Analisis AI dibatasi maksimal 7 hari agar konteks tetap relevan dan biaya terkontrol.',
            ]);
        }

        return response()->json([
            'data' => [
                'status' => 'completed',
                'model' => config('vertex-ai.model'),
                'period_from' => $from->toISOString(),
                'period_to' => $to->toISOString(),
                'analysis' => $service->analyze($request->user(), $from, $to),
            ],
        ]);
    }

    public function chat(Request $request, AiCultivationService $service): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        return response()->json(['data' => $service->chat($request->user(), $data['question'])]);
    }
}
