# Supathings IoT platform — implementation notes

## UI direction
- Brand palette: blue for primary actions, green/teal for healthy states, white cards on a cool light-gray canvas.
- App pages: Dashboard, Monitoring & control, Device management, Account profile.
- The current gauge/chart readings in the monitoring UI are placeholders only; do not treat them as sensor telemetry.

## Persistence
Migration `2026_10_27_000001_create_iot_devices_table.php` introduces:
- `iot_devices`: user-owned ESP32 identities (MAC address), name, online state and last-seen timestamp.
- `sensor_readings`: append-only sensor history indexed by device/time.
- `iot_thresholds`: per-device bounds stored in MySQL, not firmware constants.
- `actuator_commands`: queued actuator commands with acknowledgment fields.
- `dashboard_widgets`: persisted card type, order and gauge range.

Run `php artisan migrate` after configuring MySQL. Keep history writes out of the WebSocket request path: accept/validate the telemetry, publish the latest reading to the realtime channel, then enqueue/batch the database insert. Add retention/partitioning when volume grows.

## WebSocket integration — next required deployment step
This branch establishes the UI and database/API foundation, but does **not** yet include a configured WebSocket broker, broadcasting event delivery, device discovery, or firmware authentication. Before using real hardware:
1. Install and configure Laravel Reverb (or an explicitly selected compatible WebSocket server) and run it as a supervised service behind TLS.
2. Configure broadcasting credentials and private channel authorization; clients must only subscribe to devices owned by the authenticated user.
3. Add a device provisioning handshake: ESP32 sends MAC + one-time pairing code, app shows pending device, user confirms and names it, server issues a revocable device credential. Never trust MAC address alone as authentication.
4. Telemetry message shape: `{ type: "telemetry", mac, temperature, humidity, light_raw, sent_at, sequence }`. Validate payload and sequence, reject unknown/revoked devices, publish latest reading immediately and enqueue DB persistence asynchronously.
5. Server sends `{ type: "actuator.command", command_id, actuator, enabled, expires_at }`; ESP32 acknowledges command execution. UI should only show applied state after ACK.
6. Implement threshold evaluation in a queued/service layer with hysteresis and a command cooldown to prevent relay chatter. The ESP32 still needs local fail-safe rules for network loss, invalid sensors, and maximum pump runtime.
7. Add feature tests for ownership, validation, duplicate MACs, thresholds, telemetry persistence, command acknowledgment, and broadcast authorization.

## Current limitations
- The Device Management form and monitoring widget arrangement are currently client-side UI state, not yet persisted to MySQL.
- The thresholds modal is a UI prototype and is not yet wired to the threshold API.
- The actuator endpoint queues a command only when a device is already marked online; broadcasting/ACK handling must be completed before it can physically control relays.
- The supplied logo should be placed at `public/images/supathings-logo.jpg` to use it in the navigation. No alternate logo is generated.
