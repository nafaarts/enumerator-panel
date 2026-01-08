# Enumerator Panel - Mitigasi Bencana Aceh

Aplikasi web panel admin untuk manajemen enumerator, pembuatan formulir survei dinamis, dan visualisasi data lapangan. Dibangun sebagai bagian dari sistem mitigasi bencana untuk memfasilitasi pengumpulan data yang efisien dan terstruktur.

## 🚀 Fitur Utama

### 1. Dashboard
- Ringkasan statistik real-time (Total Enumerator, Total Formulir, Total Submisi).
- Status sistem.

### 2. Manajemen Enumerator
- **CRUD Enumerator**: Tambah, edit, dan hapus data enumerator.
- **Sistem Token**: Generate token akses unik untuk login aplikasi mobile enumerator.
- **Keamanan Perangkat**: Mekanisme penguncian Device ID (lock/reset) untuk mencegah penggunaan akun di perangkat yang tidak sah.
- **Penugasan Formulir**: Mengatur formulir mana saja yang dapat diakses oleh enumerator tertentu.

### 3. Form Builder Dinamis
- Membuat template formulir survei tanpa coding.
- **Auto-Versioning**: Setiap perubahan skema formulir akan otomatis membuat versi baru.
- **Tipe Input yang Didukung**:
  - Text, Number, Textarea
  - Select, Checkbox, Radio Button
  - Date
  - Location (GPS Coordinates)
  - Image (Upload)

### 4. Visualisasi & Manajemen Data (Submissions)
- **Table View**: Melihat data submisi dalam bentuk tabel (data JSONB di-flatten otomatis menjadi kolom).
- **Map View**: Visualisasi sebaran data di peta interaktif menggunakan Leaflet & PostGIS.
- **Export Data**: Unduh data submisi ke format Excel (.xlsx) untuk analisis lebih lanjut.

## 🛠 Teknologi yang Digunakan

- **Frontend**: Next.js 16 (App Router), TypeScript, React 19
- **Styling**: Tailwind CSS 4, Shadcn UI (Radix UI)
- **Database & Auth**: Supabase (PostgreSQL, PostGIS, Auth)
- **State Management**: TanStack Query (React Query)
- **Maps**: Leaflet, React-Leaflet
- **Export**: ExcelJS

## 📋 Struktur Input Form Builder

Berikut adalah detail properti yang digunakan saat membuat skema formulir:

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `id` | string | ID unik untuk field (digunakan sebagai key di database). |
| `label` | string | Label pertanyaan yang muncul di aplikasi. |
| `type` | string | Tipe input (`text`, `number`, `textarea`, `select`, `checkbox`, `radio`, `date`, `location`, `image`). |
| `required` | boolean | Menandakan apakah field wajib diisi. |
| `options` | array | Daftar pilihan (wajib untuk tipe `select`, `checkbox`, `radio`). |
| `description` | string | Teks bantuan tambahan untuk enumerator. |

## 📄 Contoh Output JSON

### 1. Struktur Template Form (Schema)
Contoh skema formulir untuk survei dampak bencana:

```json
{
  "id": "form-dampak-banjir",
  "title": "Survei Dampak Banjir 2024",
  "version": 1,
  "created_at": "2024-01-01T10:00:00Z",
  "schema": {
    "fields": [
      {
        "id": "nama_kk",
        "type": "text",
        "label": "Nama Kepala Keluarga",
        "required": true,
        "placeholder": "Masukkan nama lengkap"
      },
      {
        "id": "tingkat_kerusakan",
        "type": "select",
        "label": "Tingkat Kerusakan Rumah",
        "required": true,
        "options": ["Ringan", "Sedang", "Berat", "Hancur Total"]
      },
      {
        "id": "estimasi_kerugian",
        "type": "number",
        "label": "Estimasi Kerugian (Rp)",
        "required": false
      },
      {
        "id": "lokasi_rumah",
        "type": "location",
        "label": "Koordinat Rumah",
        "required": true
      },
      {
        "id": "foto_bukti",
        "type": "image",
        "label": "Foto Kondisi Rumah",
        "required": true
      }
    ]
  }
}
```

### 2. Struktur Data Submisi
Contoh data yang dikirimkan oleh enumerator:

```json
{
  "id": "sub-123456789",
  "form_id": "form-dampak-banjir",
  "form_version": 1,
  "enumerator_id": "enum-001",
  "created_at": "2024-01-02T14:30:00Z",
  "location": {
    "type": "Point",
    "coordinates": [95.323753, 5.548290]
  },
  "data": {
    "nama_kk": "Budi Santoso",
    "tingkat_kerusakan": "Berat",
    "estimasi_kerugian": 50000000,
    "lokasi_rumah": {
      "lat": 5.548290,
      "lng": 95.323753
    },
    "foto_bukti": "https://storage.supabase.co/.../foto-rumah-budi.jpg"
  }
}
```
