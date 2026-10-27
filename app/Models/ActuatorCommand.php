<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActuatorCommand extends Model
{
    protected $fillable = ['iot_device_id', 'actuator', 'enabled', 'source', 'status', 'acknowledged_at'];
    protected function casts(): array { return ['enabled' => 'boolean', 'acknowledged_at' => 'datetime']; }
    public function device(): BelongsTo { return $this->belongsTo(IotDevice::class, 'iot_device_id'); }
}
