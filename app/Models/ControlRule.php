<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['iot_device_id', 'parameter', 'minimum', 'maximum', 'enabled', 'settings'])]
class ControlRule extends Model
{
    protected function casts(): array
    {
        return ['minimum' => 'float', 'maximum' => 'float', 'enabled' => 'boolean', 'settings' => 'array'];
    }

    /** @return BelongsTo<IotDevice, $this> */
    public function device(): BelongsTo
    {
        return $this->belongsTo(IotDevice::class, 'iot_device_id');
    }
}
