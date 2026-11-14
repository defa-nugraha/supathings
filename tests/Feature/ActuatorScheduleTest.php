<?php

use App\Models\ActuatorCommand;
use App\Models\ActuatorSchedule;
use App\Models\IotDevice;
use App\Models\User;
use Illuminate\Support\Carbon;

function createScheduleDevice(User $user): IotDevice
{
    return IotDevice::query()->create([
        'user_id' => $user->id,
        'mac_address' => 'AA:BB:CC:DD:EE:22',
        'name' => 'Kumbung Jadwal',
        'status' => 'online',
        'control_mode' => 'manual',
    ]);
}

test('users can create and list multiple actuator schedules for their device', function () {
    $user = User::factory()->create();
    $device = createScheduleDevice($user);

    $payload = [
        'device_id' => $device->id,
        'actuator' => 'mist',
        'state' => 'on',
        'time' => '07:00',
        'days' => [1, 3, 5],
        'enabled' => true,
    ];

    $this->actingAs($user)
        ->postJson('/api/actuator-schedules', $payload)
        ->assertCreated()
        ->assertJsonPath('data.time', '07:00:00');

    $this->actingAs($user)
        ->postJson('/api/actuator-schedules', [
            ...$payload,
            'actuator' => 'lamp',
            'state' => 'off',
            'time' => '19:00',
            'days' => [0, 2, 4, 6],
        ])
        ->assertCreated();

    $this->actingAs($user)
        ->getJson('/api/actuator-schedules?device_id='.$device->id)
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('scheduled actuator command is created once when schedule becomes due', function () {
    Carbon::setTestNow(Carbon::parse('2026-11-16 07:03:00'));

    $user = User::factory()->create();
    $device = createScheduleDevice($user);

    $schedule = ActuatorSchedule::query()->create([
        'iot_device_id' => $device->id,
        'created_by' => $user->id,
        'actuator' => 'mist',
        'state' => 'on',
        'time' => '07:00',
        'days' => [1],
        'enabled' => true,
    ]);

    $this->artisan('actuators:run-schedules')->assertSuccessful();

    expect(ActuatorCommand::query()
        ->where('iot_device_id', $device->id)
        ->where('mode', 'scheduled')
        ->count())->toBe(1);

    expect($schedule->fresh()->last_run_at)->not->toBeNull();

    $this->artisan('actuators:run-schedules')->assertSuccessful();

    expect(ActuatorCommand::query()
        ->where('iot_device_id', $device->id)
        ->where('mode', 'scheduled')
        ->count())->toBe(1);
});

test('scheduled actuator command is not created on an unselected day', function () {
    Carbon::setTestNow(Carbon::parse('2026-11-17 07:30:00'));

    $user = User::factory()->create();
    $device = createScheduleDevice($user);

    ActuatorSchedule::query()->create([
        'iot_device_id' => $device->id,
        'created_by' => $user->id,
        'actuator' => 'water',
        'state' => 'on',
        'time' => '07:00',
        'days' => [1],
        'enabled' => true,
    ]);

    $this->artisan('actuators:run-schedules')->assertSuccessful();

    expect(ActuatorCommand::query()->where('iot_device_id', $device->id)->count())->toBe(0);
});

test('users cannot access schedules belonging to another account', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $device = createScheduleDevice($owner);

    ActuatorSchedule::query()->create([
        'iot_device_id' => $device->id,
        'created_by' => $owner->id,
        'actuator' => 'blower',
        'state' => 'off',
        'time' => '22:00',
        'days' => [0, 1, 2, 3, 4, 5, 6],
        'enabled' => true,
    ]);

    $this->actingAs($otherUser)
        ->getJson('/api/actuator-schedules?device_id='.$device->id)
        ->assertNotFound();
});
