<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $harvest_count
 * @property-read float|null $total_harvest_kg
 */
#[Fillable(['user_id', 'iot_device_id', 'name', 'strain', 'inoculated_at', 'baglog_count', 'phase', 'notes'])]
class CultivationBatch extends Model
{
    protected function casts(): array
    {
        return ['inoculated_at' => 'date', 'baglog_count' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<IotDevice, $this> */
    public function device(): BelongsTo
    {
        return $this->belongsTo(IotDevice::class, 'iot_device_id');
    }

    /** @return HasMany<HarvestRecord, $this> */
    public function harvests(): HasMany
    {
        return $this->hasMany(HarvestRecord::class);
    }

    /** @return HasMany<CultivationExpense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(CultivationExpense::class);
    }
}
