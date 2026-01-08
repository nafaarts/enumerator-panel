-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset data in dependent tables
TRUNCATE TABLE enumerators, forms CASCADE;

-- Add organization_id to enumerators if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enumerators' AND column_name = 'organization_id') THEN
    ALTER TABLE enumerators ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add organization_id to forms if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'organization_id') THEN
    ALTER TABLE forms ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Remove enumerator_id from forms if exists (cleanup old relationship)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forms' AND column_name = 'enumerator_id') THEN
    ALTER TABLE forms DROP COLUMN enumerator_id;
  END IF;
END $$;

-- Enable Row Level Security (RLS) if appropriate
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policies for organizations (Public access for simplicity in this context, adjust as needed)
CREATE POLICY "Enable read access for all users" ON organizations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON organizations FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON organizations FOR DELETE USING (true);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
CREATE POLICY "Enable read access for all users" ON settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON settings FOR UPDATE USING (true);

