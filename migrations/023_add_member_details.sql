-- Add new columns to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS institution_register_no TEXT,
ADD COLUMN IF NOT EXISTS retirement_register_no TEXT;
