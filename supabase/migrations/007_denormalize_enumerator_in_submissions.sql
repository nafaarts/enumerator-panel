-- Denormalize enumerator data in submissions table
-- Purpose: Prevent submission data loss when an enumerator is deleted.
-- Changes:
-- 1. Add enumerator_name and enumerator_phone columns.
-- 2. Populate these columns from existing relationships (best effort for existing data).
-- 3. Drop enumerator_id foreign key constraint (and column, if we want to fully decouple, but usually keeping ID as optional reference is safer, but user request says "hilangkan relasi langsung", so we will drop the foreign key constraint. The user also said "simpan data enumerator (nama, phone_number) langsung di dalam data submissions", implying these are the source of truth).
-- User instruction: "hilangkan relasi langsung enumerator ke submission... nomor berperan sepert primary key dari enumerator"

-- Step 1: Add new columns
ALTER TABLE submissions
ADD COLUMN enumerator_name TEXT,
ADD COLUMN enumerator_phone TEXT;

-- Step 2: Populate new columns from existing data (if any)
-- We need to do this BEFORE dropping the relationship if we want to preserve history.
UPDATE submissions s
SET 
  enumerator_name = e.name,
  enumerator_phone = e.phone
FROM enumerators e
WHERE s.enumerator_id = e.id;

-- Step 3: Make new columns required (assuming all submissions must have an enumerator)
-- However, we might have old data where join failed (if enumerator was already deleted? but FK prevented that).
-- So we can safely set them to NOT NULL if the update worked for all rows.
-- Let's just set them to NOT NULL to enforce the new schema rule.
-- If update failed for some rows (shouldn't happen due to FK), this alter will fail, alerting us.
ALTER TABLE submissions
ALTER COLUMN enumerator_name SET NOT NULL,
ALTER COLUMN enumerator_phone SET NOT NULL;

-- Step 4: Drop the foreign key constraint
-- We will keep the enumerator_id column for now as a "soft" reference or historical log, but drop the CONSTRAINT.
-- Wait, user said "hilangkan relasi langsung". This usually means dropping the FK constraint.
-- User also said "data submission tidak terhapus jika enumerator di hapus". Dropping FK constraint achieves this.
-- If we keep the column `enumerator_id`, it will just be a UUID string without integrity enforcement.
-- Let's drop the constraint.

ALTER TABLE submissions DROP CONSTRAINT submissions_enumerator_id_fkey;

-- Optionally, we can drop the column `enumerator_id` entirely if the user wants strictly name/phone.
-- "simpan data enumerator (nama, phone_number) langsung di dalam data submissions. di data ini nomor berperan sepert primary key dari enumerator."
-- This suggests `enumerator_phone` is the new logical link. `enumerator_id` might become stale or useless if the original record is deleted.
-- I will drop the `enumerator_id` column to strictly follow "hilangkan relasi".
ALTER TABLE submissions DROP COLUMN enumerator_id;
