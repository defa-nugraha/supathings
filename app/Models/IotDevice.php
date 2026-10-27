<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'mac_address', 'name', 'status', 'control_mode', 'last_seen_at', 'device_token_hash', 'metadata'])]
class IotDevice extends Model
{
    protected function casts(): array
    {
        return ['last_seen_at' => 'datetime', 'metadata' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function readings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    public function controlRules(): HasMany
    {
        return $this->hasMany(ControlRule::class);
    }

    public function actuatorCommands(): HasMany
    {
        return $this->hasMany(ActuatorCommand::class);
    }
}
