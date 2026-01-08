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
  '{"fields": [
      {"id": "q1", "type": "text", "label": "Nama KK", "required": true},
      {"id": "q2", "type": "select", "label": "Tingkat Kerusakan", "required": true, "options": ["Ringan", "Sedang", "Berat"]},
      {"id": "q3", "type": "number", "label": "Estimasi Kerugian (Rp)", "required": false}
   ]}', 
   NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Submissions
INSERT INTO submissions (id, form_id, form_version, enumerator_id, data, location, created_at)
VALUES
  (gen_random_uuid(), 'form-bencana-demo', 1, 'e1111111-1111-1111-1111-111111111111', 
   '{"q1": "Keluarga A", "q2": "Berat", "q3": 50000000}', 
   ST_Point(95.3238, 5.5483)::geography, -- Banda Aceh
   NOW() - INTERVAL '2 days'),
   
  (gen_random_uuid(), 'form-bencana-demo', 1, 'e1111111-1111-1111-1111-111111111111', 
   '{"q1": "Keluarga B", "q2": "Ringan", "q3": 1000000}', 
   ST_Point(96.1281, 4.1437)::geography, -- Meulaboh
   NOW() - INTERVAL '1 day'),
   
  (gen_random_uuid(), 'form-bencana-demo', 1, 'e1111111-1111-1111-1111-111111111111', 
   '{"q1": "Keluarga C", "q2": "Sedang", "q3": 15000000}', 
   ST_Point(97.1426, 5.1818)::geography, -- Lhokseumawe
   NOW()),

   (gen_random_uuid(), 'form-bencana-demo', 1, 'e1111111-1111-1111-1111-111111111111', 
   '{"q1": "Keluarga D", "q2": "Ringan", "q3": 2500000}', 
   ST_Point(96.7494, 4.6951)::geography, -- Takengon (Central Aceh)
   NOW() - INTERVAL '3 hours');
