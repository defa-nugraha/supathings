# Supathings ESP32 API

Endpoint perangkat menggunakan token khusus perangkat yang diterima saat registrasi. Kirim token sebagai `Authorization: Bearer <DEVICE_TOKEN>`; jangan menaruhnya di JavaScript browser atau menyimpannya di repository.

## Mengirim telemetri

```http
POST /api/telemetry
Authorization: Bearer <DEVICE_TOKEN>
Content-Type: application/json

{
  "temperature": 28.4,
  "humidity": 88.0,
  "light_raw": 1400,
  "light_percent": 42.0,
  "timestamp": "2026-10-28T02:00:00+07:00"
}
```

## Mengambil perintah aktuator

Polling `GET /api/device/commands` setiap beberapa detik. Endpoint mengembalikan perintah pending dan konfigurasi mode/ambang aktif. Perintah berstatus `sent` akan dicoba ulang jika belum diperbarui selama 30 detik; firmware harus menangani command ID secara idempoten. Aktuator yang didukung saat ini: `mist`, `water`, `blower`, dan `lamp`.

```http
GET /api/device/commands
Authorization: Bearer <DEVICE_TOKEN>
```

## Konfigurasi ambang batas dan target aktuator

Pengaturan otomatis disimpan pada `control_rules.settings.actuators`. Web hanya memilih target; server tetap menjadi pengambil keputusan. Contoh aturan suhu 24–28°C dengan blower dan lampu sebagai target:

```json
{
    "temperatureMin": 24,
    "temperatureMax": 28,
    "actuators": {
        "temperature": ["blower", "lamp"],
        "humidity": ["mist"],
        "light": ["lamp"]
    }
}
```

Semantik kontrol yang ada dipertahankan: suhu tinggi memicu target suhu, kelembapan rendah memicu target kelembapan, dan cahaya rendah memicu target cahaya. Saat kondisi kembali aman, target dimatikan mengikuti logika/histeresis yang sudah digunakan server.

## Mengonfirmasi eksekusi

Setelah mencoba mengubah relay, kirim pengakuan untuk ID perintah:

```http
POST /api/device/commands/123/ack
Authorization: Bearer <DEVICE_TOKEN>
Content-Type: application/json

{
  "status": "acknowledged",
  "actual_state": "on",
  "message": "Relay output set HIGH"
}
```

Jika eksekusi gagal, gunakan `status: failed` dan isi `message`. `actual_state` adalah laporan firmware; itu bukan bukti kelistrikan independen kecuali perangkat dilengkapi sensor umpan balik yang sesuai.

## Keselamatan

- Terapkan keadaan relay yang aman saat boot, sensor gagal, dan koneksi terputus.
- Beri batas durasi maksimum dan waktu jeda untuk pompa/mist; jangan membiarkan pompa menyala tanpa batas.
- Gunakan relay dan catu daya berisolasi serta perangkat yang sesuai rating listrik dan lingkungan basah.
- Atur ambang sesuai strain dan kondisi kumbung. Nilai bawaan bukan rekomendasi agronomi universal.
