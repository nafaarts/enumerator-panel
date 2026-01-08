-- Enable PostGIS if not already enabled
create extension if not exists postgis;

-- Insert Demo Enumerator
INSERT INTO enumerators (id, name, phone, created_at)
VALUES 
  ('e1111111-1111-1111-1111-111111111111', 'Demo Enumerator', '081234567890', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Demo Form
INSERT INTO forms (id, title, version, schema, created_at)
VALUES 
  ('form-bencana-demo', 'Formulir Dampak Bencana Demo', 1, 
  '{"sections": [
      {
          "id": "section-1",
          "title": "Data Utama",
          "fields": [
              {"id": "q1", "type": "text", "label": "Nama KK", "required": true},
              {"id": "q2", "type": "select", "label": "Tingkat Kerusakan", "required": true, "options": ["Ringan", "Sedang", "Berat"]},
              {"id": "q3", "type": "number", "label": "Estimasi Kerugian (Rp)", "required": false}
          ]
      }
   ]}', 
   NOW())
ON CONFLICT (id) DO NOTHING;
