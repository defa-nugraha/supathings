# SupaThings AI — Vertex AI

SupaThings AI adalah lapisan analisis di atas telemetry, kontrol, budidaya, panen, dan biaya.

## Fitur

- Analisis lingkungan 24 jam.
- Deteksi anomali terhadap control rules.
- Rekomendasi tindakan operator.
- Prediksi tren sensor berdasarkan riwayat.
- Intelijen biaya dan risiko profitabilitas.
- Tanya SupaThings AI dengan konteks akun sendiri.

AI tidak mengendalikan aktuator. Aturan deterministik tetap menjadi sumber keputusan otomasi.

## Vertex AI

Default model: gemini-3.8-flash.

Backend memakai Vertex AI GenerateContent REST API dan structured output melalui responseMimeType=application/json serta responseSchema. Google saat ini mengarahkan fitur Gemini baru ke Google Gen AI SDK; untuk Laravel/PHP integrasi ini menggunakan REST resmi karena SDK Gen AI terpadu yang didokumentasikan Google saat ini tersedia untuk Python, JavaScript/TypeScript, Go, dan Java.

## Konfigurasi

VERTEX_AI_ENABLED=true
VERTEX_AI_PROJECT_ID=project-id
VERTEX_AI_LOCATION=global
VERTEX_AI_MODEL=gemini-3.8-flash
VERTEX_AI_SERVICE_ACCOUNT_JSON_BASE64=...

Jangan commit credential. Pada Google Cloud, gunakan attached service account/ADC dengan hak minimum. Untuk hosting non-Google Cloud, base64 service-account JSON dapat dipasang sebagai secret environment.

## Endpoint

GET /api/ai/analysis/latest
POST /api/ai/analysis
POST /api/ai/chat

Semua endpoint membutuhkan session authentication dan membatasi data berdasarkan user_id.

Analisis tidak otomatis dijalankan saat refresh halaman untuk mengendalikan biaya. Hasil analisis disimpan agar dapat diaudit.
