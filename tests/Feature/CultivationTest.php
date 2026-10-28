<?php

use App\Models\CultivationBatch;
use App\Models\HarvestRecord;
use App\Models\User;

test('authenticated farmers can create and list cultivation batches', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/cultivation/batches', [
        'name' => 'Batch Oktober A',
        'strain' => 'Oyster grey',
        'inoculated_at' => now()->subDays(14)->toDateString(),
        'baglog_count' => 250,
        'notes' => 'Media terlihat putih merata.',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Batch Oktober A')
        ->assertJsonPath('data.phase', 'incubation');

    $this->actingAs($user)->getJson('/api/cultivation/batches')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.baglog_count', 250);
});

test('cultivation batch validation rejects future inoculation dates and zero baglogs', function () {
    $this->actingAs(User::factory()->create())->postJson('/api/cultivation/batches', [
        'name' => 'Invalid batch',
        'inoculated_at' => now()->addDay()->toDateString(),
        'baglog_count' => 0,
    ])->assertUnprocessable()->assertJsonValidationErrors(['inoculated_at', 'baglog_count']);
});

test('farmers can record harvests for their own cultivation batches', function () {
    $user = User::factory()->create();
    $batch = CultivationBatch::query()->create([
        'user_id' => $user->id,
        'name' => 'Batch A',
        'inoculated_at' => now()->subDays(30)->toDateString(),
        'baglog_count' => 100,
        'phase' => 'harvesting',
    ]);

    $this->actingAs($user)->postJson('/api/cultivation/batches/'.$batch->id.'/harvests', [
        'harvested_at' => now()->toDateString(),
        'flush_number' => 1,
        'weight_kg' => 3.25,
        'quality' => 'good',
        'sale_price_per_kg' => 20000,
        'notes' => 'Panen pertama.',
    ])->assertCreated()->assertJsonPath('data.weight_kg', 3.25);

    expect(HarvestRecord::query()->where('cultivation_batch_id', $batch->id)->count())->toBe(1);
});

test('farmers cannot read or record harvests for another users batch', function () {
    $batchOwner = User::factory()->create();
    $batch = CultivationBatch::query()->create([
        'user_id' => $batchOwner->id,
        'name' => 'Private batch',
        'inoculated_at' => now()->subDays(10)->toDateString(),
        'baglog_count' => 50,
        'phase' => 'incubation',
    ]);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/cultivation/batches/'.$batch->id.'/harvests', [
            'harvested_at' => now()->toDateString(),
            'flush_number' => 1,
            'weight_kg' => 1.0,
        ])->assertNotFound();
});

test('farmers can record cultivation expenses and cannot attach costs to another users batch', function () {
    $user = User::factory()->create();
    $batch = CultivationBatch::query()->create([
        'user_id' => $user->id, 'name' => 'Batch Biaya', 'inoculated_at' => now()->subDays(10)->toDateString(),
        'baglog_count' => 100, 'phase' => 'fruiting',
    ]);
    $this->actingAs($user)->postJson('/api/cultivation/expenses', [
        'cultivation_batch_id' => $batch->id, 'incurred_at' => now()->toDateString(),
        'category' => 'listrik', 'description' => 'Listrik kumbung', 'amount' => 75000,
    ])->assertCreated()->assertJsonPath('data.amount', 75000);

    $otherBatch = CultivationBatch::query()->create([
        'user_id' => User::factory()->create()->id, 'name' => 'Batch Orang Lain',
        'inoculated_at' => now()->subDays(10)->toDateString(), 'baglog_count' => 50, 'phase' => 'fruiting',
    ]);
    $this->actingAs($user)->postJson('/api/cultivation/expenses', [
        'cultivation_batch_id' => $otherBatch->id, 'incurred_at' => now()->toDateString(),
        'category' => 'lainnya', 'description' => 'Tidak boleh', 'amount' => 1000,
    ])->assertUnprocessable();
});
