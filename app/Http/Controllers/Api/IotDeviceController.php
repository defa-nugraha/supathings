<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\EvaluateControlRules;
use App\Jobs\StoreSensorReading;
use App\Models\ActuatorCommand;
use App\Models\ControlRule;
use App\Models\IotDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class IotDeviceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->iotDevices()->with('controlRules')->latest()->get()]);
    }

    public function readings(Request $request, string $device): JsonResponse
    {
        $iotDevice = IotDevice::query()->where('user_id', $request->user()->id)->where(function ($query) use ($device): void {
            $query->where('id', $device)->orWhere('mac_address', Str::upper($device));
        })->firstOrFail();

        return response()->json([
            'data' => $iotDevice->readings()->latest('measured_at')->limit(500)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required', 'string', 'max:17', 'regex:/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/'],
            'name' => ['required', 'string', 'max:100'],
            'sensors' => ['sometimes', 'array'],
        ]);

        $mac = Str::upper($data['device_id']);
        $device = IotDevice::query()->where('mac_address', $mac)->first();
        if ($device && $device->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Device sudah terdaftar pada akun lain.'], 409);
        }

        $token = Str::random(64);
        $device = IotDevice::query()->updateOrCreate(
            ['mac_address' => $mac, 'user_id' => $request->user()->id],
            ['name' => $data['name'], 'status' => 'online', 'last_seen_at' => now(), 'device_token_hash' => hash('sha256', $token), 'metadata' => ['sensors' => $data['sensors'] ?? ['DHT22', 'LDR']]],
        );

        return response()->json(['data' => $device, 'device_token' => $token], 201);
    }

    public function telemetry(Request $request): JsonResponse
    {
        $device = $this->deviceFromToken($request);
        if (!$device) {
            return response()->json(['message' => 'Device token tidak valid.'], 401);
        }

        $reading = $request->validate([
            'temperature' => ['nullable', 'numeric', 'between:-20,100'],
            'humidity' => ['nullable', 'numeric', 'between:0,100'],
            'light_raw' => ['nullable', 'integer', 'between:0,65535'],
            'light_percent' => ['nullable', 'numeric', 'between:0,100'],
            'timestamp' => ['nullable', 'date'],
        ]);

        $device->forceFill(['status' => 'online', 'last_seen_at' => now()])->save();

        // Persist and evaluate after the HTTP response so telemetry ingestion stays responsive.
        StoreSensorReading::dispatch($device->id, $reading)->afterResponse();
        EvaluateControlRules::dispatch($device->id, $reading)->afterResponse();

        return response()->json(['accepted' => true], 202);
    }

    public function rules(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required'],
            'rules' => ['required', 'array'],
        ]);
        $device = IotDevice::query()->where('user_id', $request->user()->id)->where(function ($query) use ($data): void {
            $query->where('id', $data['device_id']);
            if (is_string($data['device_id'])) {
                $query->orWhere('mac_address', Str::upper($data['device_id']));
            }
        })->firstOrFail();
        $map = [
            'temperature' => ['temperatureMin', 'temperatureMax'],
            'humidity' => ['humidityMin', 'humidityMax'],
            'light' => ['lightMin', 'lightMax'],
        ];

        foreach ($map as $parameter => [$minKey, $maxKey]) {
            if (!isset($data['rules'][$minKey], $data['rules'][$maxKey])) {
                continue;
            }
            $minimum = filter_var($data['rules'][$minKey], FILTER_VALIDATE_FLOAT);
            $maximum = filter_var($data['rules'][$maxKey], FILTER_VALIDATE_FLOAT);
            if ($minimum === false || $maximum === false || $minimum >= $maximum) {
                return response()->json(['message' => "Ambang batas {$parameter} tidak valid."], 422);
            }
            ControlRule::query()->updateOrCreate(
                ['iot_device_id' => $device->id, 'parameter' => $parameter],
                ['minimum' => $minimum, 'maximum' => $maximum, 'enabled' => true],
            );
        }

        return response()->json(['data' => $device->controlRules()->get()]);
    }

    public function mode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required'],
            'mode' => ['required', Rule::in(['manual', 'automatic'])],
        ]);
        $device = IotDevice::query()->where('user_id', $request->user()->id)->where(function ($query) use ($data): void {
            $query->where('id', $data['device_id']);
            if (is_string($data['device_id'])) {
                $query->orWhere('mac_address', Str::upper($data['device_id']));
            }
        })->firstOrFail();
        $device->forceFill(['control_mode' => $data['mode']])->save();

        return response()->json(['data' => $device->only(['id', 'mac_address', 'control_mode'])]);
    }

    public function command(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id' => ['required'],
            'actuator' => ['required', Rule::in(['mist', 'water', 'blower'])],
            'state' => ['required', Rule::in(['on', 'off'])],
            'mode' => ['sometimes', Rule::in(['manual', 'automatic'])],
        ]);
        $device = IotDevice::query()->where('user_id', $request->user()->id)->where(function ($query) use ($data): void { $query->where('id', $data['device_id']); if (is_string($data['device_id'])) { $query->orWhere('mac_address', Str::upper($data['device_id'])); } })->firstOrFail();
        $command = ActuatorCommand::query()->create([
            'iot_device_id' => $device->id,
            'actuator' => $data['actuator'],
            'state' => $data['state'],
            'mode' => $data['mode'] ?? 'manual',
            'status' => 'pending',
            'issued_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $command], 201);
    }

    private function deviceFromToken(Request $request): ?IotDevice
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        $hash = hash('sha256', $token);

        return IotDevice::query()->where('device_token_hash', $hash)->first();
    }
}
