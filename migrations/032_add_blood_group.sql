-- Add blood_group column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
