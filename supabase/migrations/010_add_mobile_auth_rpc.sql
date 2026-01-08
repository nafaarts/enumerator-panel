-- Function to check enumerator existence by phone
-- Accessible by anonymous users (for login screen)
-- Returns basic info if found, empty if not.
create or replace function check_enumerator_phone(phone_number text)
returns table (
  id uuid,
  name text,
  organization_id uuid
) 
security definer -- Runs with admin privileges to bypass RLS
language plpgsql
as $$
begin
  return query
  select e.id, e.name, e.organization_id
  from enumerators e
  where e.phone = phone_number
  limit 1;
end;
$$;

-- Grant access to public (anon) so the mobile app can call it without being logged in
grant execute on function check_enumerator_phone(text) to anon;
grant execute on function check_enumerator_phone(text) to authenticated;
grant execute on function check_enumerator_phone(text) to service_role;
