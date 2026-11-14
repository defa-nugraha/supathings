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
        $targets = static function ($rule, array $fallback): array {
            if (! $rule?->enabled) {
                return [];
            }

            $settings = $rule->settings;
            $configured = is_array($settings) && isset($settings['actuators']) && is_array($settings['actuators'])
                ? $settings['actuators']
                : $fallback;

            return array_values(array_intersect($configured, ['mist', 'water', 'blower', 'lamp']));
        };

        $setTargets = static function (array &$desired, array $actuators, string $state): void {
            foreach ($actuators as $actuator) {
                $desired[$actuator] = $state;
            }
        };

        $temperatureRule = $rules->get('temperature');
        if ($temperature !== null && $temperatureRule?->enabled) {
            $temperatureTargets = $targets($temperatureRule, ['blower']);
            if ($temperature > (float) $temperatureRule->maximum) {
                $setTargets($desired, $temperatureTargets, 'on');
            } elseif ($temperature < (float) $temperatureRule->minimum || $temperature <= (float) $temperatureRule->maximum - 1.0) {
                $setTargets($desired, $temperatureTargets, 'off');
            }
        }

        $humidityRule = $rules->get('humidity');
        if ($humidity !== null && $humidityRule?->enabled) {
            $humidityTargets = $targets($humidityRule, ['mist']);
            if ($humidity < (float) $humidityRule->minimum) {
                $setTargets($desired, $humidityTargets, 'on');
            } elseif ($humidity > (float) $humidityRule->maximum || $humidity >= (float) $humidityRule->minimum + 2.0) {
                $setTargets($desired, $humidityTargets, 'off');
            }
        }

        $light = isset($this->reading['light_percent']) ? (float) $this->reading['light_percent'] : null;
        $lightRule = $rules->get('light');
        if ($light !== null && $lightRule?->enabled) {
            $lightTargets = $targets($lightRule, []);
            if ($light < (float) $lightRule->minimum) {
                $setTargets($desired, $lightTargets, 'on');
            } elseif ($light > (float) $lightRule->maximum) {
                $setTargets($desired, $lightTargets, 'off');
            }
        }

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
