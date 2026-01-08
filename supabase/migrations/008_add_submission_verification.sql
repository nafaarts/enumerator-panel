-- Add verification status to submissions
-- user request: "tambahkan status verifikasi pada data submission"

-- 1. Add status column
-- Values: 'pending', 'verified', 'rejected'
ALTER TABLE submissions
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected'));

-- 2. Add admin notes for verification context (optional but useful)
ALTER TABLE submissions
ADD COLUMN admin_notes TEXT;

-- 3. Add verification timestamp
ALTER TABLE submissions
ADD COLUMN verified_at TIMESTAMPTZ;
