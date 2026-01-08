-- Add form_id column to submissions table
alter table submissions 
add column form_id text references forms(id) not null;

-- Update RLS policy to allow insert (for enumerators later) or admin management
-- For now, just ensuring admin can select is already covered, but let's be explicit if needed.
