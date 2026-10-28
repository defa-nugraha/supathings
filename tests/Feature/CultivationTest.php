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

test('farmers can update and delete their own expenses', function () {
    $user = User::factory()->create();
    $response = $this->actingAs($user)->postJson('/api/cultivation/expenses', [
        'incurred_at' => now()->toDateString(),
        'category' => 'listrik',
        'description' => 'Listrik kumbung',
        'amount' => 75000,
    ])->assertCreated();
    $id = $response->json('data.id');

    $this->actingAs($user)->patchJson('/api/cultivation/expenses/'.$id, [
        'incurred_at' => now()->toDateString(),
        'category' => 'air',
        'description' => 'Tagihan air kumbung',
        'amount' => 25000,
        'cultivation_batch_id' => null,
    ])->assertOk()->assertJsonPath('data.amount', 25000)
        ->assertJsonPath('data.description', 'Tagihan air kumbung');

    $this->actingAs($user)->deleteJson('/api/cultivation/expenses/'.$id)->assertOk();
    $this->assertDatabaseMissing('cultivation_expenses', ['id' => $id]);
});

test('farmers can update and delete harvest records and cannot modify other users records', function () {
    $user = User::factory()->create();
    $batch = CultivationBatch::query()->create([
        'user_id' => $user->id, 'name' => 'Batch Panen', 'inoculated_at' => now()->subDays(30)->toDateString(),
        'baglog_count' => 100, 'phase' => 'harvesting',
    ]);
    $record = HarvestRecord::query()->create([
        'user_id' => $user->id, 'cultivation_batch_id' => $batch->id,
        'harvested_at' => now()->toDateString(), 'flush_number' => 1,
        'weight_kg' => 3.25, 'quality' => 'good', 'sale_price_per_kg' => 20000,
    ]);

    $this->actingAs($user)->patchJson('/api/cultivation/harvests/'.$record->id, [
        'weight_kg' => 4.5, 'harvested_at' => now()->toDateString(),
        'flush_number' => 2, 'quality' => 'premium', 'sale_price_per_kg' => 25000,
        'cultivation_batch_id' => $batch->id,
    ])->assertOk()->assertJsonPath('data.weight_kg', 4.5);

    $this->actingAs(User::factory()->create())
        ->deleteJson('/api/cultivation/harvests/'.$record->id)->assertNotFound();

    $this->actingAs($user)->deleteJson('/api/cultivation/harvests/'.$record->id)->assertOk();
    $this->assertDatabaseMissing('harvest_records', ['id' => $record->id]);
});

test('batch deletion is blocked while harvest or expense records are attached', function () {
    $user = User::factory()->create();
    $batch = CultivationBatch::query()->create([
        'user_id' => $user->id, 'name' => 'Batch terlacak', 'inoculated_at' => now()->subDays(20)->toDateString(),
        'baglog_count' => 100, 'phase' => 'fruiting',
    ]);
    $this->actingAs($user)->postJson('/api/cultivation/expenses', [
        'cultivation_batch_id' => $batch->id, 'incurred_at' => now()->toDateString(),
        'category' => 'baglog', 'description' => 'Baglog tambahan', 'amount' => 50000,
    ])->assertCreated();

    $this->actingAs($user)->deleteJson('/api/cultivation/batches/'.$batch->id)
        ->assertUnprocessable();
});
