# 📑 FINAL BLUEPRINT: Enumerator Admin Panel (Web)

**Project Context:**
Aplikasi ini adalah pusat kendali untuk manajemen petugas lapangan (Enumerator). Sistem menggunakan pendekatan **Semi-Authentication** (Phone + Token), **Offline-First**, dan **Dynamic Forms**. Admin bertanggung jawab mengelola kuesioner, menetapkan tugas kepada enumerator, dan memvalidasi data koordinat GPS yang masuk.

---

## 1. Arsitektur Database (Supabase - PostgreSQL)

Semua tabel wajib menggunakan **UUID** sebagai Primary Key.

* **`forms`**: Menyimpan template kuesioner (JSON Schema) dan `version` (int).
* **`enumerators`**: Menyimpan data enumerator, `access_token`, `device_id` (untuk lock perangkat), dan `expired_at`.
* **`enumerator_assignments`**: Tabel junction (Many-to-Many) yang menentukan **form mana saja yang boleh diisi oleh enumerator tertentu**.
* **`submissions`**: Menyimpan hasil input dari lapangan, mencatat `form_version`, `enumerator_name`, `enumerator_phone`, dan `data` (JSONB).

---

## 2. Modul & Spesifikasi Fitur

### A. Dashboard & Real-time Monitoring

* **KPI Cards:** Menampilkan total data masuk, jumlah enumerator aktif, dan status antrean sinkronisasi.
* **Live Map View:** Integrasi `react-leaflet` untuk menampilkan sebaran data secara geografis berdasarkan koordinat GPS yang dikirim dari aplikasi mobile.

### B. Manajemen Enumerator (Security Gate)

* **Device ID Lock:** UI harus menunjukkan apakah akun terkunci ke perangkat tertentu. Sediakan tombol **"Reset Device ID"** (set ke `null`) untuk mengizinkan login di HP baru.
* **Token System:** Generate 6-8 digit token unik dengan masa berlaku (`expired_at`).
* **Form Assignment:** UI Multi-select untuk menetapkan satu atau banyak form spesifik kepada enumerator. **Enumerator hanya bisa melihat form yang ditugaskan kepada mereka.**

### C. Dynamic Form Builder & Versioning Logic

* **Schema Editor:** Editor untuk menyusun field kuesioner (text, number, photo, select, location).
* **Smart Versioning:** Setiap perubahan skema otomatis menaikkan `version`. Data lama di tabel `submissions` harus tetap merujuk pada `form_version` saat data tersebut diambil untuk menjaga integritas data.

### D. Data Submission & Flattening

* **Dynamic Table:** Mengubah JSONB dari lapangan menjadi kolom tabel yang dapat dibaca manusia (flattening).
* **Export Engine:** Export data ke Excel/CSV. Metadata (Nama Enumerator, Koordinat, Waktu) harus digabung dengan data hasil kuesioner dalam satu baris rata.

---

## 3. Aturan Teknis & Best Practices (Untuk AI Agent)

1. **TypeScript Strict Mode:** Gunakan interfaces yang ketat untuk `Enumerator`, `FormTemplate`, `Assignment`, dan `Submission`.
2. **State Management:** Gunakan `TanStack Query` (React Query) untuk manajemen cache server dan status loading/error yang konsisten.
3. **Security (RLS):** Pastikan semua query menggunakan autentikasi Admin. Hanya Admin yang boleh mengakses tabel `enumerators` dan `forms`.
4. **UI/UX:** Gunakan `shadcn/ui` untuk komponen interface agar bersih dan profesional.
5. **Offline Awareness:** Meskipun ini panel web, sistem harus mampu menangani tampilan data yang memiliki metadata timestamp dari HP enumerator (bukan hanya waktu server).

---

## 4. Contoh Skema JSON & Penugasan (Reference)

**Logic Penugasan:**

```typescript
// Saat mengambil form untuk mobile app:
const { data } = await supabase
  .from('enumerator_assignments')
  .select('forms (*)')
  .eq('enumerator_id', current_user_id);

```

**Form & Logic Versioning:**

```json
{
    "id": 'form-1',
    "title": 'Survei Kerusakan Bangunan',
    "version": 1,  // Mobile app akan cek: jika local_version < 5, download skema baru.
    "fields": [
      {
        "id": 'nama_pemilik',
        "type": 'text',
        "label": 'Nama Pemilik Bangunan',
        "required": true,
      },
      {
        "id": 'jenis_bangunan',
        "type": 'select',
        "label": 'Jenis Bangunan',
        "required": true,
        "options": ['Rumah Tinggal', 'Toko/Ruko', 'Fasilitas Umum', 'Lainnya'],
      },
      {
        "id": 'jumlah_lantai',
        "type": 'number',
        "label": 'Jumlah Lantai',
        "required": true,
      },
      {
        "id": 'tingkat_kerusakan',
        "type": 'select',
        "label": 'Tingkat Kerusakan',
        "required": true,
        "options": ['Ringan', 'Sedang', 'Berat', 'Hancur Total'],
      },
      {
        "id": 'foto_bangunan',
        "type": 'photo',
        "label": 'Foto Bangunan (Depan)',
        "required": true,
      },
      {
        "id": 'lokasi_gps',
        "type": 'location',
        "label": 'Koordinat Lokasi',
        "required": true,
      },
      {
        "id": 'keterangan',
        "type": 'textarea',
        "label": 'Catatan Tambahan',
        "required": false,
      },
    ],
  }

```