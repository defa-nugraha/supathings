<?php

use App\Models\AiAnalysis;
use App\Models\ControlRule;
use App\Models\IotDevice;
use App\Models\SensorReading;
use App\Models\User;
use Illuminate\Support\Facades\Http;

function createAiDevice(User $user): IotDevice
{
    return IotDevice::query()->create([
        'user_id' => $user->id,
        'mac_address' => 'AA:BB:CC:DD:EE:11',
        'name' => 'Kumbung AI',
        'status' => 'online',
        'control_mode' => 'automatic',
        'metadata' => ['sensors' => ['DHT22', 'LDR']],
    ]);
}

function fakeVertex(): void
{
    Http::fake([
        '*aiplatform.googleapis.com/*' => Http::response([
            'candidates' => [[
                'content' => ['parts' => [[
                    'text' => json_encode([
                        'status' => 'warning',
                        'summary' => 'Kelembapan perlu dipantau.',
                        'findings' => [['title' => 'Kelembapan rendah', 'severity' => 'warning', 'description' => 'Pembacaan melewati batas.', 'evidence' => ['Ada pembacaan di bawah minimum.']]],
                        'recommendations' => [['priority' => 'high', 'title' => 'Periksa misting', 'action' => 'Periksa nozzle dan aliran air.', 'reason' => 'Kelembapan berada di bawah batas.']],
                        'predictions' => [['metric' => 'Kelembapan', 'horizon' => '1 jam', 'trend' => 'falling', 'expected_value' => 78.5, 'confidence' => 0.8]],
                        'financial' => ['summary' => 'Biaya masih terpantau.', 'risk' => 'Data belum menunjukkan risiko biaya kuat.'],
                    ], JSON_THROW_ON_ERROR),
                ]]],
            ]],
        ], 200),
    ]);
}

beforeEach(function () {
    config([
        'vertex-ai.enabled' => true,
        'vertex-ai.project_id' => 'test-project',
        'vertex-ai.location' => 'global',
        'vertex-ai.model' => 'gemini-3.8-flash',
        'vertex-ai.access_token' => 'test-access-token',
    ]);
});

test('latest AI analysis is scoped to the authenticated user', function () {
    $user = User::factory()->create();
    AiAnalysis::query()->create([
        'user_id' => $user->id,
        'type' => 'cultivation_analysis',
        'period_from' => now()->subDay(),
        'period_to' => now(),
        'model' => 'gemini-3.8-flash',
        'status' => 'completed',
        'response' => ['summary' => 'Owned'],
    ]);

    $this->actingAs($user)->getJson('/api/ai/analysis/latest')
        ->assertOk()->assertJsonPath('data.analysis.summary', 'Owned');
});

test('AI analysis is sent only for the authenticated account', function () {
    $user = User::factory()->create();
    $device = createAiDevice($user);
    ControlRule::query()->create([
        'iot_device_id' => $device->id,
        'parameter' => 'humidity',
        'minimum' => 80,
        'maximum' => 95,
        'enabled' => true,
    ]);
    SensorReading::query()->create([
        'iot_device_id' => $device->id,
        'temperature' => 28,
        'humidity' => 76,
        'light_percent' => 40,
        'measured_at' => now()->subMinutes(10),
    ]);
    fakeVertex();

    $this->actingAs($user)->postJson('/api/ai/analysis')
        ->assertOk()->assertJsonPath('data.analysis.status', 'warning');

    Http::assertSent(fn ($request) => str_contains($request->url(), 'aiplatform.googleapis.com') && str_contains(json_encode($request->data()), (string) $device->id));
    expect(AiAnalysis::query()->where('user_id', $user->id)->where('status', 'completed')->count())->toBe(1);
});

test('AI analysis rejects periods longer than seven days', function () {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/ai/analysis', ['from' => now()->subDays(8)->toDateString(), 'to' => now()->toDateString()])
        ->assertUnprocessable()->assertJsonValidationErrors('from');
});

test('AI chat returns structured data', function () {
    $user = User::factory()->create();
    createAiDevice($user);
    fakeVertex();

    $this->actingAs($user)->postJson('/api/ai/chat', ['question' => 'Bagaimana kondisi kelembapan?'])
        ->assertOk()->assertJsonStructure(['data' => ['answer', 'evidence', 'limitations']]);
});

test('guests cannot use AI endpoints', function () {
    $this->getJson('/api/ai/analysis/latest')->assertUnauthorized();
    $this->postJson('/api/ai/analysis')->assertUnauthorized();
    $this->postJson('/api/ai/chat', ['question' => 'Halo'])->assertUnauthorized();
});
