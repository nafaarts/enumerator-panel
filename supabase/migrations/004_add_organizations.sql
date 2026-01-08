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

-- Modify Enumerators Table
-- Assuming enumerators table exists from 001_init.sql
alter table enumerators add column organization_id uuid references organizations(id) on delete cascade;

-- Create Form Assignments Table (Connecting Forms <-> Organizations)
create table form_assignments (
  id uuid primary key default gen_random_uuid(),
  form_id text references forms(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  assigned_at timestamptz default now()
);

alter table form_assignments enable row level security;
create policy "Allow admin all form_assignments" on form_assignments for all using (auth.role() = 'authenticated');

-- Create Settings Table
create table settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table settings enable row level security;
create policy "Allow admin all settings" on settings for all using (auth.role() = 'authenticated');

-- NOTE: 
-- 1. We do NOT add organization_id to forms table directly (Forms are independent).
-- 2. We do NOT drop enumerator_assignments (It links specific enumerators to forms).
