# Panduan Fitur Form Sections (Pengelompokan Formulir)

Dokumen ini menjelaskan perubahan struktur data, cara penggunaan, dan migrasi untuk fitur **Form Sections** yang baru diimplementasikan.

## 1. Ikhtisar

Fitur ini memungkinkan pengguna untuk mengelompokkan pertanyaan formulir ke dalam bagian-bagian (sections) yang logis. Ini sangat berguna untuk formulir yang panjang dan kompleks, meningkatkan keterbacaan dan pengalaman pengguna.

### Fitur Utama:
- **Toggle Sections**: Beralih antara tampilan daftar pertanyaan biasa (flat) dan tampilan berbasis section.
- **Manajemen Section**: Tambah, ubah nama, hapus, dan urutkan section.
- **Kompatibilitas Penuh**: Formulir lama (tanpa section) tetap berjalan normal dan otomatis dikonversi saat diedit.

## 2. Struktur Data Baru

Kami telah memperbarui `FormSchema` untuk mendukung struktur bersarang.

### Tipe Data (`src/types/index.ts`)

**Sebelumnya (Legacy):**
```typescript
interface FormSchema {
  fields: FormField[];
}
```

**Sekarang (New):**
```typescript
interface FormSchema {
  fields?: FormField[];    // Masih ada untuk backward compatibility
  sections?: FormSection[]; // Standar baru
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}
```

### Logika Penyimpanan
- Jika pengguna mengaktifkan "Sections", data disimpan dalam array `sections`.
- Jika pengguna tidak menggunakan sections, data secara internal tetap disimpan sebagai satu section default, namun aplikasi mungkin masih menyimpan format legacy `fields` jika diperlukan, atau hanya menggunakan satu section.
- **Strategi Saat Ini**: Aplikasi `useFormBuilder` sekarang selalu bekerja dengan array `sections`. Jika data lama dimuat (hanya punya `fields`), ia akan otomatis dibungkus ke dalam satu "Default Section".

## 3. Cara Penggunaan

### Untuk Pengguna (User Guide)

1.  **Buka Form Builder**: Masuk ke halaman edit formulir.
2.  **Aktifkan Sections**:
    - Cari tombol toggle/switch bertuliskan **"Enable Sections"** di bagian atas form builder.
    - **OFF**: Tampilan standar. Semua pertanyaan muncul berurutan.
    - **ON**: Tampilan berubah menjadi kartu-kartu Section.
3.  **Kelola Section**:
    - Klik **"Add New Section"** di paling bawah untuk menambah grup baru.
    - Isi **Judul Section** (misal: "Data Diri", "Kondisi Rumah").
    - Klik icon sampah untuk menghapus section.
    - Gunakan panah naik/turun untuk mengubah urutan section.
4.  **Kelola Pertanyaan**:
    - Di dalam setiap section, Anda bisa menambah pertanyaan seperti biasa.
    - Pertanyaan bisa dipindah antar urutan dalam section yang sama (fitur pindah antar section belum tersedia di UI drag-drop, tapi bisa dilakukan dengan menghapus dan membuat baru di tempat lain).

### Untuk Pengembang (Developer Guide)

- **Hook `useFormBuilder`**:
  Hook ini telah di-rewrite sepenuhnya. Jangan lagi mengakses `fields` secara langsung dari root state. Gunakan `sections` dan method helper:
  ```typescript
  const { 
    sections, 
    addSection, 
    addField, // sekarang menerima (sectionIndex)
    updateField // sekarang menerima (sectionIndex, fieldIndex, updates)
  } = useFormBuilder(initialSchema);
  ```

- **Menampilkan Data (Submissions)**:
  Saat merender tabel atau detail submission, pastikan untuk menggabungkan semua field dari semua section:
  ```typescript
  const allFields = form.schema.sections 
    ? form.schema.sections.flatMap(s => s.fields) 
    : form.schema.fields || [];
  ```

## 4. Migrasi Database

Untuk data formulir yang sudah ada di database, tidak wajib melakukan migrasi manual karena aplikasi menangani kompatibilitas secara otomatis saat *read* (baca). Namun, untuk menstandarisasi database, Anda dapat menjalankan script SQL berikut:

**File**: `supabase/migrations/005_migrate_forms_to_sections.sql`

```sql
UPDATE forms
SET schema = jsonb_build_object(
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'title', 'Default Section',
      'description', 'Imported from legacy format',
      'fields', schema->'fields'
    )
  )
)
WHERE schema->>'sections' IS NULL 
  AND schema->>'fields' IS NOT NULL;
```

## 5. Troubleshooting

- **Pertanyaan Hilang?**: Cek apakah Anda tidak sengaja mematikan toggle sections saat sudah membuat banyak section. (Saat ini UI hanya menyembunyikan kompleksitas, data tidak hilang di state, tapi hati-hati saat save).
- **Error saat Submit**: Pastikan endpoint submission tidak memvalidasi struktur schema secara ketat jika Anda belum update validasi backend (jika ada). Di Supabase (JSONB), ini aman.
