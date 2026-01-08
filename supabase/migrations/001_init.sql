-- Enable PostGIS if needed (for later)
create extension if not exists postgis;

-- 1. Enumerators Table
create table enumerators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  access_token text,
  device_id text,
  expired_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table enumerators enable row level security;

-- Policies (Allow everything for authenticated users - admins)
create policy "Allow admin select" on enumerators for select using (auth.role() = 'authenticated');
create policy "Allow admin insert" on enumerators for insert with check (auth.role() = 'authenticated');
create policy "Allow admin update" on enumerators for update using (auth.role() = 'authenticated');
create policy "Allow admin delete" on enumerators for delete using (auth.role() = 'authenticated');

-- 2. Forms Table
create table forms (
  id text primary key, -- e.g., 'form-1'
  title text not null,
  version int not null default 1,
  schema jsonb not null,
  created_at timestamptz default now()
);

alter table forms enable row level security;
create policy "Allow admin all forms" on forms for all using (auth.role() = 'authenticated');

-- 3. Assignments Table
create table enumerator_assignments (
  enumerator_id uuid references enumerators(id) on delete cascade,
  form_id text references forms(id) on delete cascade,
  primary key (enumerator_id, form_id)
);

alter table enumerator_assignments enable row level security;
create policy "Allow admin all assignments" on enumerator_assignments for all using (auth.role() = 'authenticated');

-- 4. Submissions Table
create table submissions (
  id uuid primary key default gen_random_uuid(),
  form_version int not null,
  enumerator_id uuid references enumerators(id),
  data jsonb not null,
  location geometry(Point, 4326),
  created_at timestamptz default now()
);

alter table submissions enable row level security;
create policy "Allow admin select submissions" on submissions for select using (auth.role() = 'authenticated');
