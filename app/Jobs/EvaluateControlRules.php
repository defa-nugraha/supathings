<?php

namespace App\Jobs;

use App\Models\ActuatorCommand;
use App\Models\IotDevice;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class EvaluateControlRules implements ShouldQueue
{
    use Dispatchable, Queueable;

    /**
     * @param  array<string, mixed>  $reading
     */
    public function __construct(public int $deviceId, public array $reading) {}

    public function handle(): void
    {
        $device = IotDevice::query()->with('controlRules')->find($this->deviceId);

        if (! $device || $device->control_mode !== 'automatic') {
            return;
        }

        $temperature = isset($this->reading['temperature']) ? (float) $this->reading['temperature'] : null;
        $humidity = isset($this->reading['humidity']) ? (float) $this->reading['humidity'] : null;
        $rules = $device->controlRules->keyBy('parameter');

        $desired = [];
        $temperatureRule = $rules->get('temperature');
        if ($temperature !== null && $temperatureRule?->enabled) {
            if ($temperature > $temperatureRule->maximum) {
                $desired['blower'] = 'on';
            } elseif ($temperature <= $temperatureRule->maximum - 1.0) {
                $desired['blower'] = 'off';
            }
        }

        $humidityRule = $rules->get('humidity');
        if ($humidity !== null && $humidityRule?->enabled) {
            if ($humidity < $humidityRule->minimum) {
                $desired['mist'] = 'on';
            } elseif ($humidity >= $humidityRule->minimum + 2.0) {
                $desired['mist'] = 'off';
            }
        }

        // Watering is deliberately manual until a watering schedule is explicitly configured.
        foreach ($desired as $actuator => $state) {
            $latest = ActuatorCommand::query()
                ->where('iot_device_id', $device->id)
                ->where('actuator', $actuator)
                ->latest('id')
                ->first();

            if ($latest && $latest->state === $state && in_array($latest->status, ['pending', 'sent', 'acknowledged'], true)) {
                continue;
            }

            ActuatorCommand::query()->create([
                'iot_device_id' => $device->id,
                'actuator' => $actuator,
                'state' => $state,
                'mode' => 'automatic',
                'status' => 'pending',
                'metadata' => ['trigger' => 'threshold', 'reading' => $this->reading],
            ]);
        }
    }
}
