# Supathings IoT connection contract

The browser and ESP32 use the WebSocket endpoint configured with \`VITE_WS_URL\`. The WebSocket server is a separate runtime and must be deployed/configured before discovery and realtime presence can work.

## Pairing and identity

1. ESP32 joins the configured Wi-Fi network and reads its hardware MAC address.
2. ESP32 sends \`device_discovered\` to the WebSocket server with its MAC address and supported sensors.
3. The browser receives the discovery event. The MAC is displayed as the device identity; users do not type or edit it.
4. In **Tambah device**, the user selects one discovered ESP32 and only enters its display name.
5. Device registration stores the selected MAC and owner relationship. It does not create or require an API token.
6. Every user account receives one persistent random API token automatically when the account is created. Existing accounts are backfilled during the token migration.
7. In **Kelola device**, the user API token is shown in a masked **Token API** card with a copy action. The token is independent from the **Hubungkan device** flow and can be reused for multiple devices owned by the same account.
8. The user copies the token into the ESP32 firmware configuration. The token remains valid until the owner explicitly regenerates it.

Discovery is not registration and is not authorization. A MAC address is an identifier, not a secret or proof of ownership. An unregistered ESP32, or one without a valid device bearer token, cannot submit telemetry, poll actuator commands, or acknowledge commands.

Device registration and authentication are separate concerns. Registration stores the ESP32 MAC address and owner relationship; the bearer credential belongs to the user account and is created independently of device registration.

## WebSocket messages

- ESP32 → server: \`{ "type": "device_discovered", "device_id": "AA:BB:CC:DD:EE:FF", "sensors": ["DHT22", "LDR"] }\`
- Browser → server: \`{ "type": "discover_devices" }\`
- Server → browser: \`{ "type": "device_presence", "device_id": "AA:BB:CC:DD:EE:FF", "online": true }\`

The WebSocket broker is not bundled in this Laravel repository. Configure and secure the production WebSocket service and set \`VITE_WS_URL\`.

## Authenticated HTTP API

The ESP32 uses the user's API token with \`Authorization: Bearer <api_token>\`:

- \`POST /api/telemetry\` — submit sensor readings. Include \`device_id\` using the registered MAC address or device ID.
- \`GET /api/device/commands?device_id=<MAC>\` — retrieve pending actuator commands for that device.
- \`POST /api/device/commands/{command}/ack\` — acknowledge command execution.

The application stores a SHA-256 hash for token validation and an encrypted copy so the authenticated owner can retrieve the token from the **Token API** card. The user token is hidden from ordinary user serialization. Token retrieval and rotation are restricted to the authenticated account. Regeneration immediately invalidates the previous token. Never print tokens to Serial Monitor in production, application logs, or WebSocket messages.

Firmware must fail safe when commands expire, the network is lost, or sensor readings are invalid. Use actuator maximum-on timers and hysteresis in firmware/control rules as appropriate.
