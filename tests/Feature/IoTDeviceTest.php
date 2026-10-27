<?php

use App\Jobs\EvaluateControlRules;
use App\Jobs\StoreSensorReading;
use App\Models\ActuatorCommand;
use App\Models\ControlRule;
use App\Models\IotDevice;
use App\Models\SensorReading;
use App\Models\User;
use Illuminate\Support\Str;

function createIotDevice(User $user, array $attributes = []): IotDevice
{
    return IotDevice::query()->create(array_merge([
        'user_id' => $user->id,
        'mac_address' => 'AA:BB:CC:DD:EE:'.strtoupper(Str::random(2)),
        'name' => 'Kumbung Test',
        'status' => 'offline',
        'control_mode' => 'manual',
        'device_token_hash' => hash('sha256', 'test-device-token'),
        'metadata' => ['sensors' => ['DHT22', 'LDR']],
    ], $attributes));
}

test('authenticated users can list only their own devices', function () {
    $user = User::factory()->create();
    $owned = createIotDevice($user);
    createIotDevice(User::factory()->create(), ['mac_address' => '11:22:33:44:55:66']);

    $response = $this->actingAs($user)->getJson('/api/devices');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $owned->id);
});

test('guests cannot access device management endpoints', function () {
    $this->getJson('/api/devices')->assertUnauthorized();
});

test('users can register an ESP32 by MAC address and receive a one-time token', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/devices', [
        'device_id' => 'a1:b2:c3:d4:e5:f6',
        'name' => 'Kumbung Utama',
        'sensors' => ['DHT22', 'LDR'],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.mac_address', 'A1:B2:C3:D4:E5:F6')
        ->assertJsonPath('data.name', 'Kumbung Utama')
        ->assertJsonStructure(['data' => ['id', 'mac_address'], 'device_token']);

    $this->assertDatabaseHas('iot_devices', [
        'mac_address' => 'A1:B2:C3:D4:E5:F6',
        'user_id' => $user->id,
        'device_token_hash' => hash('sha256', $response->json('device_token')),
    ]);
    expect($response->json('device_token'))->not->toBe('test-device-token');
});

test('device registration rejects malformed MAC addresses', function () {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/devices', ['device_id' => 'ESP32-123', 'name' => 'Kumbung'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('device_id');
});

test('a device already owned by another account cannot be claimed', function () {
    createIotDevice(User::factory()->create(), ['mac_address' => 'AA:BB:CC:DD:EE:FF']);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/devices', ['device_id' => 'aa:bb:cc:dd:ee:ff', 'name' => 'Kumbung'])
        ->assertStatus(409);
});

test('users can read sensor history for their own device by MAC address', function () {
    $user = User::factory()->create();
    $device = createIotDevice($user);
    SensorReading::query()->create([
        'iot_device_id' => $device->id,
        'temperature' => 28.5,
        'humidity' => 88,
        'light_raw' => 1500,
        'light_percent' => 45,
        'payload' => ['temperature' => 28.5],
        'measured_at' => now(),
    ]);

    $this->actingAs($user)->getJson('/api/devices/'.urlencode($device->mac_address).'/readings')
        ->assertOk()
        ->assertJsonPath('data.0.temperature', 28.5)
        ->assertJsonPath('data.0.humidity', 88);
});

test('users cannot read sensor history belonging to another account', function () {
    $device = createIotDevice(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->getJson('/api/devices/'.$device->id.'/readings')
        ->assertNotFound();
});

test('users can save threshold rules for temperature humidity and light', function () {
    $user = User::factory()->create();
    $device = createIotDevice($user);

    $this->actingAs($user)->postJson('/api/control-rules', [
        'device_id' => $device->id,
        'rules' => [
            'temperatureMin' => 20,
            'temperatureMax' => 30,
            'humidityMin' => 80,
            'humidityMax' => 95,
            'lightMin' => 25,
            'lightMax' => 75,
        ],
    ])->assertOk()->assertJsonCount(3, 'data');

    $this->assertDatabaseHas('control_rules', [
        'iot_device_id' => $device->id,
        'parameter' => 'temperature',
        'minimum' => 20,
        'maximum' => 30,
        'enabled' => true,
    ]);
});

test('threshold rules reject minimum values greater than or equal to maximum', function () {
    $user = User::factory()->create();
    $device = createIotDevice($user);

    $this->actingAs($user)->postJson('/api/control-rules', [
        'device_id' => $device->id,
        'rules' => ['temperatureMin' => 30, 'temperatureMax' => 30],
    ])->assertUnprocessable();

    $this->assertDatabaseMissing('control_rules', [
        'iot_device_id' => $device->id,
        'parameter' => 'temperature',
    ]);
});

test('users can switch a device between manual and automatic control', function () {
    $user = User::factory()->create();
    $device = createIotDevice($user);

    $this->actingAs($user)->postJson('/api/control-mode', [
        'device_id' => $device->id,
        'mode' => 'automatic',
    ])->assertOk()->assertJsonPath('data.control_mode', 'automatic');

    $this->assertDatabaseHas('iot_devices', ['id' => $device->id, 'control_mode' => 'automatic']);
});

test('users can queue valid manual commands for each actuator', function (string $actuator) {
    $user = User::factory()->create();
    $device = createIotDevice($user);

    $this->actingAs($user)->postJson('/api/actuator-commands', [
        'device_id' => $device->id,
        'actuator' => $actuator,
        'state' => 'on',
        'mode' => 'manual',
    ])->assertCreated()->assertJsonPath('data.actuator', $actuator)
        ->assertJsonPath('data.state', 'on')
        ->assertJsonPath('data.status', 'pending');

    $this->assertDatabaseHas('actuator_commands', [
        'iot_device_id' => $device->id,
        'actuator' => $actuator,
        'state' => 'on',
        'mode' => 'manual',
        'status' => 'pending',
    ]);
})->with(['mist', 'water', 'blower']);

test('manual actuator commands reject unknown actuator names and states', function () {
    $user = User::factory()->create();
    $device = createIotDevice($user);

    $this->actingAs($user)->postJson('/api/actuator-commands', [
        'device_id' => $device->id,
        'actuator' => 'unknown',
        'state' => 'maybe',
    ])->assertUnprocessable()->assertJsonValidationErrors(['actuator', 'state']);
});

test('telemetry rejects missing and invalid device tokens', function (?string $token) {
    $request = $this->postJson('/api/telemetry', [
        'temperature' => 28,
        'humidity' => 88,
    ], $token ? ['Authorization' => 'Bearer '.$token] : []);

    $request->assertUnauthorized();
})->with([null, 'invalid-token']);

test('valid telemetry is accepted and updates the device heartbeat', function () {
    $device = createIotDevice(User::factory()->create(), [
        'device_token_hash' => hash('sha256', 'valid-token'),
    ]);

    $this->withToken('valid-token')->postJson('/api/telemetry', [
        'temperature' => 28.5,
        'humidity' => 88,
        'light_raw' => 1500,
        'light_percent' => 45,
    ])->assertStatus(202)->assertJsonPath('accepted', true);

    $this->assertDatabaseHas('iot_devices', ['id' => $device->id, 'status' => 'online']);
});

test('telemetry validates sensor value ranges', function () {
    createIotDevice(User::factory()->create(), [
        'device_token_hash' => hash('sha256', 'valid-token'),
    ]);

    $this->withToken('valid-token')->postJson('/api/telemetry', [
        'temperature' => 250,
        'humidity' => 88,
    ])->assertUnprocessable()->assertJsonValidationErrors('temperature');
});

test('sensor readings are persisted by the asynchronous storage job', function () {
    $device = createIotDevice(User::factory()->create());

    (new StoreSensorReading($device->id, [
        'temperature' => 27.25,
        'humidity' => 89,
        'light_raw' => 1400,
        'light_percent' => 42,
        'timestamp' => now()->toISOString(),
    ]))->handle();

    $this->assertDatabaseHas('sensor_readings', [
        'iot_device_id' => $device->id,
        'temperature' => 27.25,
        'humidity' => 89,
        'light_raw' => 1400,
    ]);
});

test('automatic control creates blower and mist commands when thresholds are crossed', function () {
    $device = createIotDevice(User::factory()->create(), ['control_mode' => 'automatic']);
    ControlRule::query()->create([
        'iot_device_id' => $device->id,
        'parameter' => 'temperature',
        'minimum' => 20,
        'maximum' => 30,
        'enabled' => true,
    ]);
    ControlRule::query()->create([
        'iot_device_id' => $device->id,
        'parameter' => 'humidity',
        'minimum' => 80,
        'maximum' => 95,
        'enabled' => true,
    ]);

    (new EvaluateControlRules($device->id, ['temperature' => 33, 'humidity' => 70]))->handle();

    $this->assertDatabaseHas('actuator_commands', [
        'iot_device_id' => $device->id,
        'actuator' => 'blower',
        'state' => 'on',
        'mode' => 'automatic',
    ]);
    $this->assertDatabaseHas('actuator_commands', [
        'iot_device_id' => $device->id,
        'actuator' => 'mist',
        'state' => 'on',
        'mode' => 'automatic',
    ]);
});

test('automatic control does not change actuators while device is in manual mode', function () {
    $device = createIotDevice(User::factory()->create());
    ControlRule::query()->create([
        'iot_device_id' => $device->id,
        'parameter' => 'temperature',
        'minimum' => 20,
        'maximum' => 30,
        'enabled' => true,
    ]);

    (new EvaluateControlRules($device->id, ['temperature' => 40]))->handle();

    $this->assertDatabaseCount('actuator_commands', 0);
});

test('automatic control avoids duplicate pending commands for the same state', function () {
    $device = createIotDevice(User::factory()->create(), ['control_mode' => 'automatic']);
    ControlRule::query()->create([
        'iot_device_id' => $device->id,
        'parameter' => 'temperature',
        'minimum' => 20,
        'maximum' => 30,
        'enabled' => true,
    ]);
    ActuatorCommand::query()->create([
        'iot_device_id' => $device->id,
        'actuator' => 'blower',
        'state' => 'on',
        'mode' => 'automatic',
        'status' => 'pending',
    ]);

    (new EvaluateControlRules($device->id, ['temperature' => 40]))->handle();

    $this->assertDatabaseCount('actuator_commands', 1);
});

test('users can visit the monitoring and device management pages', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/monitoring')->assertOk();
    $this->actingAs($user)->get('/devices')->assertOk();
});
