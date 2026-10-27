<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['iot_device_id', 'temperature', 'humidity', 'light_raw', 'light_percent', 'payload', 'measured_at'])]
class SensorReading extends Model
{
    protected function casts(): array
    {
        return ['temperature' => 'float', 'humidity' => 'float', 'light_percent' => 'float', 'payload' => 'array', 'measured_at' => 'datetime'];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(IotDevice::class, 'iot_device_id');
    }
}
