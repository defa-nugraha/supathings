<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SensorReading extends Model
{
    public $timestamps = false;
    protected $fillable = ['iot_device_id', 'temperature', 'humidity', 'light_raw', 'recorded_at'];
    protected function casts(): array { return ['temperature' => 'float', 'humidity' => 'float', 'recorded_at' => 'datetime']; }
    public function device(): BelongsTo { return $this->belongsTo(IotDevice::class, 'iot_device_id'); }
}
