-- Create Organizations Table
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Enable RLS for Organizations
alter table organizations enable row level security;
create policy "Allow admin all organizations" on organizations for all using (auth.role() = 'authenticated');

-- Reset Data (As requested)
-- We need to clear existing data because the schema requirements are changing drastically (mandatory organization)
truncate table enumerators cascade;
truncate table forms cascade;
truncate table submissions cascade;

-- Modify Enumerators Table
alter table enumerators add column organization_id uuid references organizations(id) on delete cascade;

-- Modify Forms Table
alter table forms add column organization_id uuid references organizations(id) on delete cascade;

-- Drop Assignments Table (Since relation is now Org <-> Form)
drop table if exists enumerator_assignments;
