<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'cultivation_batch_id', 'incurred_at', 'category', 'description', 'amount'])]
class CultivationExpense extends Model
{
    protected function casts(): array
    {
        return ['incurred_at' => 'date', 'amount' => 'float'];
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
