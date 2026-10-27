<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['iot_device_id', 'actuator', 'state', 'mode', 'status', 'issued_by', 'acknowledged_at', 'metadata'])]
class ActuatorCommand extends Model
{
    protected function casts(): array
    {
        return ['acknowledged_at' => 'datetime', 'metadata' => 'array'];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(IotDevice::class, 'iot_device_id');
    }
}
