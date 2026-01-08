-- Insert Test Enumerators
INSERT INTO enumerators (id, name, phone, created_at)
VALUES 
  ('e2222222-2222-2222-2222-222222222222', 'Budi Santoso', '081234567891', NOW()),
  ('e3333333-3333-3333-3333-333333333333', 'Siti Aminah', '081234567892', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Test Form with various fields
INSERT INTO forms (id, title, version, schema, created_at)
VALUES 
  ('form-test-lengkap', 'Formulir Testing Lengkap', 1, 
  '{
    "sections": [
      {
        "id": "section-1",
        "title": "Identitas Responden",
        "fields": [
          {"id": "nama", "type": "text", "label": "Nama Lengkap", "required": true},
          {"id": "nik", "type": "number", "label": "NIK", "required": true},
          {"id": "jenis_kelamin", "type": "select", "label": "Jenis Kelamin", "required": true, "options": ["Laki-laki", "Perempuan"]}
        ]
      },
      {
        "id": "section-2",
        "title": "Data Lokasi & Kondisi",
        "fields": [
          {"id": "lokasi_rumah", "type": "location", "label": "Lokasi Rumah", "required": true},
          {"id": "foto_rumah", "type": "image", "label": "Foto Rumah", "required": false},
          {"id": "deskripsi", "type": "textarea", "label": "Deskripsi Kondisi", "required": false}
        ]
      }
    ]
  }', 
  NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign Enumerators to Form
INSERT INTO enumerator_assignments (enumerator_id, form_id)
VALUES 
  ('e2222222-2222-2222-2222-222222222222', 'form-test-lengkap'),
  ('e3333333-3333-3333-3333-333333333333', 'form-test-lengkap')
ON CONFLICT (enumerator_id, form_id) DO NOTHING;

-- Insert Test Submissions
-- Submission 1: Verified
INSERT INTO submissions (id, form_id, form_version, enumerator_name, enumerator_phone, data, created_at, status, admin_notes, verified_at)
VALUES 
  (gen_random_uuid(), 'form-test-lengkap', 1, 'Budi Santoso', '081234567891', 
  '{
    "nama": "Ahmad Dahlan", 
    "nik": 1234567890123456, 
    "jenis_kelamin": "Laki-laki", 
    "lokasi_rumah": "-6.200000, 106.816666", 
    "foto_rumah": "https://picsum.photos/200/300", 
    "deskripsi": "Rumah permanen, kondisi baik"
  }', 
  NOW() - INTERVAL '2 days', 'verified', 'Data valid dan lengkap', NOW() - INTERVAL '1 day');

-- Submission 2: Pending
INSERT INTO submissions (id, form_id, form_version, enumerator_name, enumerator_phone, data, created_at, status)
VALUES 
  (gen_random_uuid(), 'form-test-lengkap', 1, 'Siti Aminah', '081234567892', 
  '{
    "nama": "Rina Wati", 
    "nik": 9876543210987654, 
    "jenis_kelamin": "Perempuan", 
    "lokasi_rumah": "-6.210000, 106.826666", 
    "foto_rumah": "https://picsum.photos/200/301", 
    "deskripsi": "Atap bocor sedikit"
  }', 
  NOW() - INTERVAL '1 day', 'pending');

-- Submission 3: Rejected
INSERT INTO submissions (id, form_id, form_version, enumerator_name, enumerator_phone, data, created_at, status, admin_notes, verified_at)
VALUES 
  (gen_random_uuid(), 'form-test-lengkap', 1, 'Budi Santoso', '081234567891', 
  '{
    "nama": "Test User", 
    "nik": 111, 
    "jenis_kelamin": "Laki-laki", 
    "lokasi_rumah": "0, 0", 
    "foto_rumah": null, 
    "deskripsi": "Data dummy"
  }', 
  NOW(), 'rejected', 'Data tidak lengkap dan lokasi invalid', NOW());
