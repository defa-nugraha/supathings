<?php

use App\Models\AdminAuditLog;
use App\Models\CultivationBatch;
use App\Models\IotDevice;
use App\Models\User;

test('regular users cannot access administrator pages or global branding settings', function () {
    $user = User::factory()->create(['role' => 'user']);

    $this->actingAs($user)->get('/admin/dashboard')->assertForbidden();
    $this->actingAs($user)->get('/admin/users')->assertForbidden();
    $this->actingAs($user)->get(route('branding.edit'))->assertForbidden();
    $this->actingAs($user)->post(route('branding.update'), ['app_name' => 'Hacked'])->assertForbidden();
});

test('administrators are redirected from the user dashboard to the admin dashboard', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->get(route('dashboard'))->assertRedirect(route('admin.dashboard'));
    $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();
});

test('admin can update another user role and status and the action is audited', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

    $this->actingAs($admin)
        ->patch(route('admin.users.update', $user), [
            'role' => 'admin',
            'is_active' => true,
        ])
        ->assertRedirect();

    expect($user->fresh()->role)->toBe('admin');
    $this->assertDatabaseHas('admin_audit_logs', [
        'actor_id' => $admin->id,
        'target_user_id' => $user->id,
        'action' => 'user.access_updated',
    ]);
    expect(AdminAuditLog::query()->count())->toBe(1);
});

test('admin cannot deactivate their own account or remove their own role', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->patch(route('admin.users.update', $admin), [
            'role' => 'user',
            'is_active' => true,
        ])
        ->assertSessionHasErrors('user');

    expect($admin->fresh()->role)->toBe('admin');
});

test('admin can demote another administrator while retaining an active administrator', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $otherAdmin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->patch(route('admin.users.update', $otherAdmin), [
            'role' => 'user',
            'is_active' => false,
        ])
        ->assertRedirect();

    expect($otherAdmin->fresh()->role)->toBe('user')
        ->and($otherAdmin->fresh()->is_active)->toBeFalse()
        ->and($admin->fresh()->isAdmin())->toBeTrue()
        ->and($admin->fresh()->isActive())->toBeTrue();
});

test('inactive users are logged out and cannot access protected pages', function () {
    $user = User::factory()->create(['role' => 'user', 'is_active' => false]);

    $this->actingAs($user)->get(route('dashboard'))->assertRedirect(route('login'));
    $this->assertGuest();
});

test('administrators can inspect and update devices owned by other users', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $owner = User::factory()->create(['role' => 'user']);
    $device = IotDevice::query()->create([
        'user_id' => $owner->id,
        'mac_address' => 'AA:BB:CC:DD:EE:91',
        'name' => 'Kumbung Pemilik',
        'status' => 'offline',
        'control_mode' => 'manual',
        'device_token_hash' => hash('sha256', 'device-token'),
    ]);

    $this->actingAs($admin)
        ->getJson('/api/devices')
        ->assertOk()
        ->assertJsonFragment(['mac_address' => 'AA:BB:CC:DD:EE:91']);

    $this->actingAs($admin)
        ->patchJson('/api/devices/'.$device->id, ['name' => 'Kumbung Diperbarui'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Kumbung Diperbarui');

    expect($device->fresh()->user_id)->toBe($owner->id);
});

test('administrators can view cultivation records across user accounts while regular users remain isolated', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $owner = User::factory()->create(['role' => 'user']);
    $batch = CultivationBatch::query()->create([
        'user_id' => $owner->id,
        'name' => 'Batch milik user',
        'inoculated_at' => now()->subDays(10)->toDateString(),
        'baglog_count' => 100,
        'phase' => 'incubation',
    ]);

    $this->actingAs($admin)
        ->getJson('/api/cultivation/batches')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Batch milik user']);

    $this->actingAs($admin)
        ->patchJson('/api/cultivation/batches/'.$batch->id, ['name' => 'Batch diperbarui'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Batch diperbarui');

    $this->actingAs($owner)
        ->getJson('/api/cultivation/batches')
        ->assertOk()
        ->assertJsonMissing(['name' => 'Batch milik user']);

    expect($batch->fresh()->user_id)->toBe($owner->id);
});
