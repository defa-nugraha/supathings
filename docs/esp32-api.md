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

Polling `GET /api/device/commands` setiap beberapa detik. Endpoint mengembalikan perintah pending dan konfigurasi mode/ambang aktif. Perintah berstatus `sent` akan dicoba ulang jika belum diperbarui selama 30 detik; firmware harus menangani command ID secara idempoten.

```http
GET /api/device/commands
Authorization: Bearer <DEVICE_TOKEN>
```

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
