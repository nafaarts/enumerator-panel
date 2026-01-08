-- Create form_assignments table for Many-to-Many relationship
CREATE TABLE IF NOT EXISTS form_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, organization_id)
);

-- Remove organization_id from forms (it's now M:N)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'organization_id') THEN
    ALTER TABLE forms DROP COLUMN organization_id;
  END IF;
END $$;

-- Enable RLS on form_assignments
ALTER TABLE form_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for form_assignments
CREATE POLICY "Enable read access for all users" ON form_assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON form_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON form_assignments FOR DELETE USING (true);
