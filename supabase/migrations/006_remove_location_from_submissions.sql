-- Remove location column from submissions table
-- Location data should now be part of the 'data' JSONB column if a location field exists in the form schema.

ALTER TABLE submissions DROP COLUMN IF EXISTS location;
