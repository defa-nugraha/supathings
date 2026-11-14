<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActuatorSchedule;
use App\Models\IotDevice;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActuatorScheduleController extends Controller
{
    private const ACTUATORS = ['mist', 'water', 'blower', 'lamp'];

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['device_id' => ['required']]);
        $device = $this->deviceQuery($request)
            ->where(function ($query) use ($data): void {
                $query->where('id', $data['device_id']);
                if (is_string($data['device_id'])) {
                    $query->orWhere('mac_address', strtoupper($data['device_id']));
                }
            })
            ->firstOrFail();

        return response()->json([
            'data' => $device->actuatorSchedules()->with('creator:id,name')->orderBy('time')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $device = $this->findDevice($request, $data['device_id']);

        $schedule = ActuatorSchedule::query()->create([
            'iot_device_id' => $device->id,
            'created_by' => $request->user()->id,
            'actuator' => $data['actuator'],
            'state' => $data['state'],
            'time' => $data['time'],
            'days' => $this->normalizeDays($data['days']),
            'enabled' => $data['enabled'] ?? true,
        ]);

        return response()->json(['data' => $schedule->fresh('creator:id,name')], 201);
    }

    public function update(Request $request, string $schedule): JsonResponse
    {
        $record = $this->scheduleQuery($request)->findOrFail($schedule);
        $data = $this->validated($request);

        $record->update([
            'actuator' => $data['actuator'],
            'state' => $data['state'],
            'time' => $data['time'],
            'days' => $this->normalizeDays($data['days']),
            'enabled' => $data['enabled'] ?? true,
            'last_run_at' => null,
        ]);

        return response()->json(['data' => $record->fresh('creator:id,name')]);
    }

    public function destroy(Request $request, string $schedule): JsonResponse
    {
        $record = $this->scheduleQuery($request)->findOrFail($schedule);
        $record->delete();

        return response()->json(['message' => 'Jadwal aktuator berhasil dihapus.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $rules = [
            'device_id' => ['required'],
            'actuator' => ['required', Rule::in(self::ACTUATORS)],
            'state' => ['required', Rule::in(['on', 'off'])],
            'time' => ['required', 'date_format:H:i'],
            'days' => ['required', 'array', 'min:1'],
            'days.*' => ['integer', 'between:0,6'],
            'enabled' => ['sometimes', 'boolean'],
        ];

        return $request->validate($rules);
    }

    /** @param array<int, int> $days
     *  @return array<int, int>
     */
    private function normalizeDays(array $days): array
    {
        $days = array_values(array_unique(array_map('intval', $days)));
        sort($days);

        return $days;
    }

    private function findDevice(Request $request, string|int $deviceId): IotDevice
    {
        return $this->deviceQuery($request)
            ->where(function ($query) use ($deviceId): void {
                $query->where('id', $deviceId);
                if (is_string($deviceId)) {
                    $query->orWhere('mac_address', strtoupper($deviceId));
                }
            })
            ->firstOrFail();
    }

    /** @return Builder<IotDevice> */
    private function deviceQuery(Request $request): Builder
    {
        $query = IotDevice::query();

        if ($request->user()->isAdmin() === false) {
            $query->where('user_id', $request->user()->id);
        }

        return $query;
    }

    /** @return Builder<ActuatorSchedule> */
    private function scheduleQuery(Request $request): Builder
    {
        return ActuatorSchedule::query()->whereHas('device', function ($query) use ($request): void {
            if (! $request->user()->isAdmin()) {
                $query->where('user_id', $request->user()->id);
            }
        });
    }
}
