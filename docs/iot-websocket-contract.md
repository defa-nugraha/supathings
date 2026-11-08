# Supathings IoT connection contract

The browser and ESP32 use the WebSocket endpoint configured with \`VITE_WS_URL\`. The WebSocket server is a separate runtime and must be deployed/configured before discovery and realtime presence can work.

## Pairing and identity

1. ESP32 joins the configured Wi-Fi network and reads its hardware MAC address.
2. ESP32 sends \`device_discovered\` to the WebSocket server with its MAC address and supported sensors.
3. The browser receives the discovery event. The MAC is displayed as the device identity; users do not type or edit it.
4. In **Tambah device**, the user selects one discovered ESP32 and only enters its display name.
5. The authenticated application registers the selected MAC and creates one persistent random device API token.
6. In **Kelola device**, the token is shown in a masked **Token API** card with a copy action. The token is independent from the **Hubungkan device** flow.
7. The user copies the token into the ESP32 firmware configuration. The same token can be reused for telemetry and command APIs until the owner explicitly regenerates it.

Discovery is not registration and is not authorization. A MAC address is an identifier, not a secret or proof of ownership. An unregistered ESP32, or one without a valid device bearer token, cannot submit telemetry, poll actuator commands, or acknowledge commands.

Device registration and authentication are separate concerns. Registration stores the ESP32 MAC address and owner relationship; it does not create a bearer credential.

## WebSocket messages

- ESP32 → server: \`{ "type": "device_discovered", "device_id": "AA:BB:CC:DD:EE:FF", "sensors": ["DHT22", "LDR"] }\`
- Browser → server: \`{ "type": "discover_devices" }\`
- Server → browser: \`{ "type": "device_presence", "device_id": "AA:BB:CC:DD:EE:FF", "online": true }\`

The WebSocket broker is not bundled in this Laravel repository. Configure and secure the production WebSocket service and set \`VITE_WS_URL\`.

## Authenticated HTTP API

The following requests use \`Authorization: Bearer <device_token>\`:

- \`POST /api/telemetry\` — submit sensor readings.
- \`GET /api/device/commands\` — retrieve pending actuator commands.
- \`POST /api/device/commands/{command}/ack\` — acknowledge command execution.

The application stores a SHA-256 hash for token validation and an encrypted copy so the authenticated owner can retrieve the token from the **Token API** card. Both token fields are hidden from ordinary device API serialization. Token retrieval and rotation are restricted to the owning account. Regeneration immediately invalidates the previous token. Never print tokens to Serial Monitor in production, application logs, or WebSocket messages.

Firmware must fail safe when commands expire, the network is lost, or sensor readings are invalid. Use actuator maximum-on timers and hysteresis in firmware/control rules as appropriate.
