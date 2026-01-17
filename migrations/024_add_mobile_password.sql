-- Add mobile_password column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS mobile_password TEXT;
