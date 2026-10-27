<?php

namespace App\Jobs;

use App\Models\IotDevice;
use App\Models\SensorReading;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class StoreSensorReading implements ShouldQueue
{
    use Queueable;

    /**
     * @param array<string, mixed> $reading
     */
    public function __construct(public int $deviceId, public array $reading)
    {
    }

    public function handle(): void
    {
        $device = IotDevice::query()->find($this->deviceId);

        if (! $device) {
            return;
        }

        SensorReading::query()->create([
            'iot_device_id' => $device->id,
            'temperature' => $this->reading['temperature'] ?? null,
            'humidity' => $this->reading['humidity'] ?? null,
            'light_raw' => $this->reading['light_raw'] ?? null,
            'light_percent' => $this->reading['light_percent'] ?? null,
            'payload' => $this->reading,
            'measured_at' => $this->reading['timestamp'] ?? now(),
        ]);

        $device->forceFill(['status' => 'online', 'last_seen_at' => now()])->save();
    }
}
