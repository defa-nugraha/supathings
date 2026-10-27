<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'cultivation_batch_id', 'harvested_at', 'flush_number', 'weight_kg', 'quality', 'sale_price_per_kg', 'notes'])]
class HarvestRecord extends Model
{
    protected function casts(): array
    {
        return [
            'harvested_at' => 'date',
            'flush_number' => 'integer',
            'weight_kg' => 'float',
            'sale_price_per_kg' => 'float',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<CultivationBatch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(CultivationBatch::class, 'cultivation_batch_id');
    }
}
