# Developer Handbook: Enumerator Panel & Mobile App

Dokumen ini adalah referensi teknis lengkap untuk proyek **Enumerator Panel**. Panduan ini ditujukan untuk pengembang (manusia dan AI) yang akan melanjutkan pengembangan dashboard web atau membangun aplikasi mobile pendamping (React Native).

---

## 1. Project Overview

**Enumerator Panel** adalah platform manajemen survei/pendataan lapangan. Sistem ini memungkinkan administrator untuk:
1.  Mengelola Organisasi dan Enumerator (petugas lapangan).
2.  Membuat formulir survei dinamis (Form Builder).
3.  Melihat dan mengekspor hasil survei (Submissions).

**Komponen Sistem:**
-   **Web Dashboard (Next.js)**: Untuk Admin/Organisasi.
-   **Mobile App (React Native - Planned)**: Untuk Enumerator mengumpulkan data di lapangan (offline-first).
-   **Backend (Supabase)**: Database (PostgreSQL), Auth, dan Storage.

---

## 2. Tech Stack

-   **Framework**: Next.js 14+ (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **UI Components**: Shadcn UI (Radix Primitives)
-   **State/Data Fetching**: TanStack Query (React Query)
-   **Backend/DB**: Supabase (PostgreSQL + PostGIS)
-   **Icons**: Lucide React
-   **Maps**: Leaflet (via React Leaflet)

---

## 3. Database Schema

Schema database menggunakan PostgreSQL di Supabase.

### Tables

#### `organizations`
Entitas utama. Setiap form dan enumerator milik satu organisasi.
- `id` (uuid): PK
- `name` (text)
- `description` (text)

#### `enumerators`
Petugas lapangan yang melakukan survei.
- `id` (uuid): PK
- `name` (text)
- `phone` (text): Digunakan untuk login (unik)
- `access_token` (text): Token sederhana untuk sesi mobile
- `device_id` (text): Mengunci akun ke satu perangkat
- `expired_at` (timestamptz): Validitas sesi
- `created_at` (timestamptz)
- `organization_id` (uuid): FK ke organizations

#### `forms`
Template formulir. Bersifat independen, bisa digunakan oleh banyak organisasi.
- `id` (text): PK (Custom ID/slug)
- `title` (text)
- `version` (int): Increment saat ada perubahan schema.
- `schema` (jsonb): Struktur pertanyaan.
- `created_at` (timestamptz)

#### `submissions`
Data hasil survei yang dikirim enumerator.
- `id` (uuid): PK
- `form_id` (text): FK ke forms
- `enumerator_id` (uuid): FK ke enumerators
- `data` (jsonb): Jawaban survei (Key-Value pair).
- `created_at` (timestamptz)

### Relationships
`Organization` --(1:N)--> `Enumerator`
`Organization` --(1:N)--> `Form`
`Form` --(1:N)--> `Submission`
`Enumerator` --(1:N)--> `Submission`

---

## 4. Core Logic: Form Builder

Struktur data formulir disimpan dalam kolom `schema` (JSONB) di tabel `forms`.

### Tipe Data (`src/types/index.ts`)

```typescript
interface FormSchema {
  fields?: FormField[];    // Legacy (Flat list)
  sections?: FormSection[]; // Modern (Grouped)
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

interface FormField {
  id: string;          // Key untuk menyimpan jawaban (misal: "nama_kk")
  label: string;       // Teks pertanyaan
  type: FieldType;     // Lihat daftar tipe di bawah
  required: boolean;
  options?: { label: string; value: string }[]; // Untuk select/radio/checkbox
}
```

### Supported Field Types
- `text`: Input teks pendek
- `textarea`: Input teks panjang
- `number`: Input angka
- `select`: Dropdown
- `checkbox`: Pilihan ganda (bisa pilih banyak)
- `radio`: Pilihan ganda (pilih satu)
- `date`: Picker tanggal
- `location`: Koordinat GPS (Latitude/Longitude)
- `image`: Upload foto (URL atau Base64 tergantung implementasi mobile)
- `data-warga`: Tipe khusus (Composite field)

---

## 5. Mobile App Development Guide (React Native)

Bagian ini khusus untuk AI atau Developer yang akan membangun aplikasi mobile.

### A. Authentication Flow
Enumerator **tidak** menggunakan Supabase Auth (Email/Password). Mereka login menggunakan **Nomor HP**.

1.  **Login Screen**: Input Nomor HP.
2.  **API Check**: Mobile app memanggil RPC/Function atau query ke tabel `enumerators` (via backend API wrapper untuk keamanan).
3.  **Validation**: Cek apakah no HP terdaftar.
4.  **Session**: Simpan `enumerator_id` dan `organization_id` di local storage (AsyncStorage).

### B. Fetching Forms
Enumerator hanya boleh melihat form yang ditugaskan kepada mereka (via `enumerator_assignments`) ATAU form yang dimiliki organisasinya (via `form_assignments`).

**Query Logic (Contoh via `enumerator_assignments`):**
```sql
SELECT f.* 
FROM forms f
JOIN enumerator_assignments ea ON f.id = ea.form_id
WHERE ea.enumerator_id = 'CURRENT_ENUM_ID';
```

**Query Logic (Contoh via Organization):**
```sql
SELECT f.* 
FROM forms f
JOIN form_assignments fa ON f.id = fa.form_id
WHERE fa.organization_id = 'CURRENT_ORG_ID';
```

**Rendering Form:**
1.  Cek `schema.sections`.
2.  Jika ada, render UI dengan Tabs/Stepper antar section.
3.  Jika tidak ada (hanya `schema.fields`), render flat list (atau bungkus dalam satu section default).
4.  Loop setiap `field` dan render komponen input yang sesuai berdasarkan `field.type`.

### C. Submitting Data
Aplikasi harus bersifat **Offline-First**.

1.  Simpan jawaban di local storage (SQLite/WatermelonDB/Realm).
2.  Struktur JSON jawaban (`data`):
    ```json
    {
      "q1_nama": "Budi",
      "q2_umur": 30,
      "q3_foto": "https://supabase.../image.jpg"
    }
    ```
3.  **Sync**: Saat online, kirim data ke tabel `submissions`.
    -   Payload: `form_id`, `enumerator_id`, `data` (JSON).

### D. Image Upload
-   Gunakan Supabase Storage.
-   Flow:
    1.  Ambil foto (Camera).
    2.  Upload ke Bucket `submissions`.
    3.  Dapatkan Public URL.
    4.  Simpan URL tersebut ke dalam JSON `data` jawaban.

### E. Location (GPS)
-   Jika field type = `location`, App wajib mengambil koordinat GPS saat pengisian.
-   Simpan koordinat ke dalam JSON `data` jawaban (bukan dikirim terpisah).

---

## 6. Pengembangan Web Dashboard (Existing)

### Folder Structure
-   `src/app`: App Router pages.
    -   `dashboard/`: Halaman admin (protected).
    -   `dashboard/forms/[id]`: Form Builder.
-   `src/components`: UI Components (mostly Shadcn).
-   `src/hooks`: Custom hooks (e.g., `useFormBuilder`).
-   `src/lib`: Utilities (Supabase client, utils).

### Key Libraries
-   **React Query**: Digunakan masif untuk fetch data. Cek `useQuery` di halaman-halaman dashboard.
-   **Leaflet**: Untuk peta sebaran submission.

---

## 7. Referensi Migrasi
Jika Anda memperbarui struktur database, pastikan untuk:
1.  Membuat file migrasi di `supabase/migrations`.
2.  Memperbarui `src/types/index.ts`.
3.  Memperbarui dokumen ini jika ada perubahan logika bisnis yang fundamental.
