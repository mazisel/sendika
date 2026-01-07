-- Add created_at column if it does not exist
ALTER TABLE member_documents 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column if it does not exist
ALTER TABLE member_documents 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Force refresh schema cache by notifying pgbouncer/postgrest (if applicable, or just generic update)
COMMENT ON TABLE member_documents IS 'Member documents storage with timestamps';
