# Supathings IoT transport contract

The browser and ESP32 use a WebSocket endpoint configured with `VITE_WS_URL`. The WebSocket server is a separate runtime and must be deployed/configured before realtime status is considered live. This application intentionally does not fake a connected status when that endpoint is missing.

## Messages

- ESP32 → server: `{ "type": "device_discovered", "device_id": "AA:BB:CC:DD:EE:FF", "sensors": ["DHT22", "LDR"] }`
- Browser → server: `{ "type": "discover_devices" }`
- ESP32 → server: `{ "type": "telemetry", "device_id": "...", "temperature": 27.4, "humidity": 86, "light_raw": 420, "light_percent": 42, "timestamp": "2026-10-27T10:00:00Z" }`
- Browser → server: `{ "type": "actuator_command", "device_id": "...", "actuator": "mist|water|blower", "state": "on|off", "mode": "manual" }`
- Browser → server: `{ "type": "thresholds_update", "device_id": "...", "thresholds": { "temperatureMin": "24", "temperatureMax": "30" } }`
- Server → browser: `{ "type": "actuator_state", "device_id": "...", "state": { "mist": true, "water": false, "blower": false } }`

## Persistence and safety

Telemetry is accepted at `POST /api/telemetry` with the per-device bearer token returned during registration. The HTTP handler acknowledges quickly and queues the reading with `afterResponse()`; run a real queue worker in production and configure a non-sync queue driver for durable background processing. Reading history is indexed by device and measurement time.

The WebSocket broker is not bundled in this initial application commit. Configure a production WebSocket server and set `VITE_WS_URL` before connecting ESP32 devices. Never expose a device token in logs. Firmware must fail safe when commands expire, the network is lost, or sensor readings are invalid. Use actuator maximum-on timers and hysteresis in the server control service/firmware as appropriate.
