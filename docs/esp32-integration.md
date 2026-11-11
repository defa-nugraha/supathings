# Integrasi ESP32 dengan Platform SupaThings

Dokumen ini menjelaskan cara menghubungkan ESP32 ke SupaThings untuk mengirim data sensor dan menerima perintah aktuator. Contoh perangkat memakai ESP32, DHT22, LDR, serta relay untuk pompa mist, pompa air, dan blower.

> **Kondisi protokol saat ini:** endpoint perangkat yang tersedia di backend `main` menggunakan HTTP/HTTPS dengan polling berkala, bukan koneksi WebSocket. Dokumentasi ini mengikuti API yang benar-benar tersedia di kode saat ini. WebSocket memerlukan implementasi server/broker dan protokol tambahan sebelum bisa digunakan.

## 1. Arsitektur

1. Pengguna masuk ke SupaThings dan mendaftarkan perangkat berdasarkan alamat MAC Wi-Fi ESP32.
2. Backend mengeluarkan `device_token`. Simpan token ini di konfigurasi firmware secara aman; token hanya diberikan saat pendaftaran berhasil.
3. ESP32 membaca sensor dan mengirim telemetri ke `POST /api/telemetry`.
4. ESP32 meminta perintah baru secara berkala dari `GET /api/device/commands`.
5. ESP32 menjalankan perintah relay, lalu mengirim konfirmasi ke `POST /api/device/commands/{id}/ack`.
6. Backend menyimpan pembacaan, mengevaluasi aturan kontrol, dan menyimpan status perintah.

Semua URL endpoint di bawah bersifat relatif terhadap URL dasar aplikasi, misalnya `https://HOST-SUPATHINGS`. Ganti nilai contoh dengan domain produksi Anda.

## 2. Perangkat keras

| Komponen | Fungsi | Catatan |
| --- | --- | --- |
| ESP32 DevKit | Pengendali dan koneksi Wi-Fi | Gunakan board ESP32 yang sesuai dengan firmware |
| DHT22 | Suhu dan kelembapan | Ikuti kebutuhan pull-up dan tegangan modul |
| LDR + rangkaian pembagi tegangan | Intensitas cahaya relatif | Output analog ke pin ADC |
| Modul relay yang sesuai | Mengendalikan mist, pompa air, dan blower | Pastikan rating tegangan/arus dan isolasi sesuai beban |

Contoh pemetaan pin (ubah sesuai rangkaian Anda):

| Sinyal | GPIO contoh |
| --- | ---: |
| DHT22 DATA | 4 |
| LDR analog | 34 |
| Relay mist | 25 |
| Relay water | 26 |
| Relay blower | 27 |

GPIO di atas hanya contoh, bukan konfigurasi yang otomatis terdeteksi platform. Pastikan pin relay tidak mengganggu proses boot ESP32. Jangan menghubungkan pompa atau blower bertegangan tinggi langsung ke GPIO; gunakan driver/relay yang sesuai, catu daya terpisah, proteksi beban induktif, dan pemasangan aman.

## 3. Daftarkan perangkat dan ambil token

1. Masuk ke akun SupaThings yang akan memiliki perangkat.
2. Buka halaman **Devices / Manajemen Perangkat**.
3. Catat alamat MAC Wi-Fi ESP32. Pada Arduino framework, `WiFi.macAddress()` mengembalikan MAC antarmuka Wi-Fi yang sedang digunakan.
4. Daftarkan perangkat dengan MAC tersebut dan nama yang mudah dikenali.
5. Simpan `device_token` yang diberikan backend saat registrasi berhasil.

Registrasi API saat ini adalah `POST /api/devices` dan menggunakan sesi login web, sehingga bukan endpoint pendaftaran anonim yang cocok dipanggil langsung dari firmware. Gunakan antarmuka web terautentikasi untuk mendaftarkan perangkat. Endpoint ini memvalidasi MAC format `AA:BB:CC:DD:EE:FF`, nama perangkat, dan memastikan MAC tidak dimiliki akun lain.

**Penting:** token perangkat adalah kredensial rahasia. Jangan masukkan token ke repository publik, jangan tampilkan di log serial produksi, dan jangan bagikan antarperangkat. Jika token hilang atau perlu diganti, lakukan proses rotasi/registrasi ulang melalui mekanisme admin yang tersedia; jangan menganggap token lama bisa ditampilkan kembali.

## 4. API perangkat

Autentikasi perangkat memakai header:

```http
Authorization: Bearer DEVICE_TOKEN
Accept: application/json
Content-Type: application/json
```

### 4.1 Kirim data sensor

`POST /api/telemetry`

Contoh payload:

```json
{
  "temperature": 28.4,
  "humidity": 82.5,
  "light_raw": 1800,
  "light_percent": 43.2,
  "timestamp": "2026-11-03T05:00:00Z"
}
```

Field:
- `temperature`: suhu °C, opsional, rentang API -20 sampai 100.
- `humidity`: kelembapan relatif %, opsional, 0 sampai 100.
- `light_raw`: nilai ADC mentah, integer 0 sampai 65535.
- `light_percent`: nilai cahaya yang dinormalisasi oleh firmware, 0 sampai 100. Ini adalah persentase relatif hasil kalibrasi, bukan lux.
- `timestamp`: waktu pengukuran dalam format tanggal/waktu yang valid, opsional.

Respons sukses: HTTP `202`, contoh `{"accepted":true}`. HTTP `401` berarti token tidak valid; HTTP `422` berarti payload tidak lolos validasi. Kirim hanya nilai numerik yang valid; jika sensor gagal dibaca, gunakan `null` atau hilangkan field tersebut.

### 4.2 Ambil perintah aktuator

`GET /api/device/commands`

Gunakan header Bearer yang sama. Backend mengembalikan daftar perintah yang menunggu, serta mode kontrol dan aturan yang aktif:

```json
{
  "data": [
    {
      "id": 17,
      "actuator": "mist",
      "state": "on",
      "status": "sent"
    }
  ],
  "device": {
    "id": 3,
    "control_mode": "automatic",
    "rules": []
  }
}
```

Field tambahan dapat dikembalikan oleh model backend. Firmware sebaiknya membaca `id`, `actuator`, dan `state` saja untuk mengeksekusi perintah. Nilai aktuator yang didukung: `mist`, `water`, `blower`; nilai state: `on` dan `off`.

Backend saat ini mengizinkan pengambilan perintah berstatus `pending`, serta perintah `sent` yang belum diperbarui selama lebih dari 30 detik. Polling setiap 3–5 detik biasanya memadai; endpoint dibatasi 120 permintaan per menit. Hindari polling rapat tanpa jeda.

### 4.3 Konfirmasi pelaksanaan perintah

`POST /api/device/commands/{id}/ack`

Contoh payload setelah firmware mencoba menjalankan perintah:

```json
{
  "status": "acknowledged",
  "actual_state": "on",
  "message": "Relay mist diaktifkan"
}
```

- `status`: wajib, `acknowledged` atau `failed`.
- `actual_state`: opsional, `on` atau `off`.
- `message`: opsional, maksimum 500 karakter.

Konfirmasi hanya menyatakan firmware melaporkan hasil. Tanpa sensor umpan balik fisik, platform tidak dapat memastikan pompa/blower benar-benar menyala. Jika perintah gagal, kirim `status: "failed"` dan pesan yang membantu diagnosis. Jika menerima HTTP `409`, perintah sudah diproses; jangan menjalankannya berulang kali tanpa pemeriksaan.

## 5. Contoh firmware Arduino (kerangka integrasi)

Contoh berikut menunjukkan pola komunikasi HTTP. Ini bukan firmware siap produksi: tambahkan pembacaan DHT22/LDR, pemetaan GPIO, dan pengendalian relay sesuai perangkat yang benar-benar dipasang. Pasang library **ArduinoJson** dan library **DHT sensor** melalui Library Manager Arduino IDE.

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Isi melalui konfigurasi lokal; jangan commit kredensial ke Git.
const char* WIFI_SSID = "GANTI_WIFI";
const char* WIFI_PASSWORD = "GANTI_PASSWORD";
const char* BASE_URL = "https://HOST-SUPATHINGS";
const char* DEVICE_TOKEN = "GANTI_DEVICE_TOKEN";

constexpr int DHT_PIN = 4;
constexpr int LDR_PIN = 34;
constexpr int MIST_RELAY_PIN = 25;
constexpr int WATER_RELAY_PIN = 26;
constexpr int BLOWER_RELAY_PIN = 27;
constexpr int RELAY_ON = LOW;   // Sesuaikan dengan modul relay Anda.
constexpr int RELAY_OFF = HIGH;

DHT dht(DHT_PIN, DHT22);
unsigned long lastTelemetry = 0;
unsigned long lastPoll = 0;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 10000;
constexpr unsigned long COMMAND_POLL_INTERVAL_MS = 4000;

WiFiClientSecure tlsClient;

void setActuator(const char* actuator, const char* state) {
  int pin = -1;
  if (strcmp(actuator, "mist") == 0) pin = MIST_RELAY_PIN;
  else if (strcmp(actuator, "water") == 0) pin = WATER_RELAY_PIN;
  else if (strcmp(actuator, "blower") == 0) pin = BLOWER_RELAY_PIN;
  if (pin < 0) return;

  digitalWrite(pin, strcmp(state, "on") == 0 ? RELAY_ON : RELAY_OFF);
}

int postJson(const String& path, const String& body, String* responseBody = nullptr) {
  HTTPClient http;
  String url = String(BASE_URL) + path;
  if (!http.begin(tlsClient, url)) return -1;

  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  int code = http.POST(body);
  if (responseBody) *responseBody = http.getString();
  http.end();
  return code;
}

void sendTelemetry() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int lightRaw = analogRead(LDR_PIN);

  JsonDocument doc;
  if (!isnan(temperature)) doc["temperature"] = temperature;
  if (!isnan(humidity)) doc["humidity"] = humidity;
  doc["light_raw"] = lightRaw;
  // Kalibrasikan rentang ADC sesuai rangkaian LDR Anda.
  doc["light_percent"] = constrain(map(lightRaw, 0, 4095, 0, 100), 0, 100);

  String body;
  serializeJson(doc, body);
  int code = postJson("/api/telemetry", body);
  Serial.printf("Telemetry HTTP: %d\n", code);
}

void acknowledge(long id, const char* status, const char* actualState, const char* message) {
  JsonDocument doc;
  doc["status"] = status;
  if (actualState != nullptr) doc["actual_state"] = actualState;
  doc["message"] = message;
  String body;
  serializeJson(doc, body);
  String path = String("/api/device/commands/") + id + "/ack";
  int code = postJson(path, body);
  Serial.printf("Ack command %ld HTTP: %d\n", id, code);
}

void pollCommands() {
  HTTPClient http;
  String url = String(BASE_URL) + "/api/device/commands";
  if (!http.begin(tlsClient, url)) return;
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.addHeader("Accept", "application/json");
  int code = http.GET();
  String body = http.getString();
  http.end();

  if (code != 200) {
    Serial.printf("Poll HTTP: %d\n", code);
    return;
  }

  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    Serial.println("JSON command tidak valid");
    return;
  }

  JsonArray commands = doc["data"].as<JsonArray>();
  for (JsonObject command : commands) {
    long id = command["id"] | 0;
    const char* actuator = command["actuator"] | "";
    const char* state = command["state"] | "";

    if (id <= 0 ||
        (strcmp(state, "on") != 0 && strcmp(state, "off") != 0) ||
        (strcmp(actuator, "mist") != 0 &&
         strcmp(actuator, "water") != 0 &&
         strcmp(actuator, "blower") != 0)) {
      continue;
    }

    setActuator(actuator, state);
    // Untuk instalasi kritis, baca kembali umpan balik hardware sebelum ack.
    acknowledge(id, "acknowledged", state, "Perintah diproses firmware");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(MIST_RELAY_PIN, OUTPUT);
  pinMode(WATER_RELAY_PIN, OUTPUT);
  pinMode(BLOWER_RELAY_PIN, OUTPUT);
  digitalWrite(MIST_RELAY_PIN, RELAY_OFF);
  digitalWrite(WATER_RELAY_PIN, RELAY_OFF);
  digitalWrite(BLOWER_RELAY_PIN, RELAY_OFF);
  dht.begin();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi terhubung");

  // PRODUKSI: pasang CA certificate server dengan tlsClient.setCACert(...).
  // Jangan gunakan setInsecure() untuk melewati validasi sertifikat TLS.
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
    return;
  }

  unsigned long now = millis();
  if (now - lastTelemetry >= TELEMETRY_INTERVAL_MS) {
    lastTelemetry = now;
    sendTelemetry();
  }
  if (now - lastPoll >= COMMAND_POLL_INTERVAL_MS) {
    lastPoll = now;
    pollCommands();
  }
  delay(20);
}
```

### Catatan penting untuk contoh firmware

- Konfigurasikan sertifikat CA yang benar untuk HTTPS sebelum dipakai di produksi. Contoh sengaja tidak menonaktifkan verifikasi TLS.
- Contoh di atas belum menyimpan ID perintah yang telah dieksekusi secara persisten. Karena backend dapat mengirim ulang perintah yang berstatus `sent` setelah 30 detik, firmware produksi harus membuat eksekusi idempoten (misalnya menyimpan ID perintah terakhir/riwayat yang sudah diproses) agar pompa tidak dipicu berulang kali.
- Validasi respons HTTP sebelum menganggap pengiriman berhasil. Untuk telemetri, respons normal adalah `202`; untuk ack, umumnya `200`.
- Tambahkan timeout jaringan, backoff ketika server tidak dapat dijangkau, sinkronisasi waktu bila dibutuhkan, dan penanganan sensor `NaN`.
- `light_percent` harus dikalibrasi berdasarkan orientasi LDR dan pembagi tegangan; contoh pemetaan linear hanyalah titik awal.
- Pastikan relay berada pada kondisi aman ketika boot, Wi-Fi putus, atau perangkat restart. Pertimbangkan batas waktu maksimum pompa menyala, proteksi level air, dan tombol pemutus manual.

## 6. Pengujian dari komputer sebelum ESP32

Gunakan token perangkat yang sah dan jangan menuliskannya ke tiket publik atau repository. Contoh berikut menggunakan variabel lingkungan shell:

```bash
export SUPATHINGS_URL="https://HOST-SUPATHINGS"
read -s DEVICE_TOKEN
export DEVICE_TOKEN

curl -i -X POST "$SUPATHINGS_URL/api/telemetry" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"temperature":28.4,"humidity":82.5,"light_raw":1800,"light_percent":43.2}'
```

Lalu periksa pengambilan perintah:

```bash
curl -i "$SUPATHINGS_URL/api/device/commands" \
  -H "Authorization: Bearer $DEVICE_TOKEN" \
  -H "Accept: application/json"
```

Jangan menggunakan token palsu untuk menguji alur sukses. Token tidak valid seharusnya menghasilkan `401`.

## 7. Diagnosis masalah

| Gejala | Kemungkinan penyebab / pemeriksaan |
| --- | --- |
| HTTP `401` | Token kosong/salah atau token bukan milik perangkat terdaftar |
| HTTP `422` saat telemetry | Nilai di luar rentang atau format JSON tidak valid |
| HTTP `429` | Polling terlalu cepat; kurangi frekuensi dan tambahkan backoff |
| Perangkat selalu offline | Periksa Wi-Fi, DNS, TLS, URL, token, dan apakah telemetri berhasil diterima |
| Perintah tetap pending/sent | Periksa koneksi polling, log serial, ID perintah, dan respons endpoint ack |
| Relay menyala terbalik | Ubah `RELAY_ON` dan `RELAY_OFF` sesuai tipe modul relay |
| Nilai cahaya tidak masuk akal | Kalibrasi LDR; `light_percent` bukan satuan lux |
| Browser menunjukkan error 500 | Periksa log Laravel di `storage/logs/laravel.log`; masalah tersebut berbeda dari koneksi ESP32 |

## 8. Batasan dan keamanan

- API telemetri, polling, dan ack saat ini memakai token perangkat pada header Bearer.
- Token disimpan backend dalam bentuk hash SHA-256, sementara firmware perlu menyimpan token aslinya untuk autentikasi.
- Endpoint konfigurasi perangkat seperti `POST /api/devices`, pengaturan mode, aturan, dan perintah manual memakai sesi autentikasi web; jangan panggil endpoint tersebut dari firmware dengan kredensial pengguna.
- API saat ini menggunakan polling HTTP. Komunikasi WebSocket penuh belum dapat diasumsikan aktif hanya karena dashboard mendukung pembaruan data.
- Uji terlebih dahulu dengan LED atau beban tegangan rendah sebelum menghubungkan pompa/blower sebenarnya.
- Jangan menyatakan integrasi hardware berhasil sebelum pengujian fisik, pengiriman telemetri, penerimaan perintah, dan acknowledgement berhasil diverifikasi.

## 9. Checklist commissioning

- [ ] ESP32 mendapat alamat IP dan dapat menjangkau domain SupaThings.
- [ ] MAC ESP32 didaftarkan pada akun pemilik yang benar.
- [ ] Token disimpan aman dan permintaan HTTPS lolos validasi sertifikat.
- [ ] Telemetri mendapat HTTP 202 dan pembacaan muncul di dashboard/riwayat.
- [ ] Nilai DHT22 dan LDR dibandingkan dengan pengukuran aktual.
- [ ] Mode kontrol dan aturan ambang batas diperiksa sebelum mengaktifkan otomatisasi.
- [ ] Perintah `mist`, `water`, dan `blower` diuji satu per satu dengan beban aman.
- [ ] Ack perintah tercatat dan status di dashboard sesuai.
- [ ] Perilaku saat Wi-Fi/server mati dan saat ESP32 reboot sudah diuji.
- [ ] Batas waktu pompa, kondisi darurat, dan interlock keselamatan diterapkan.
