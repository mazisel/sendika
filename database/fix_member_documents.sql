-- 1. Create member_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS member_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES admin_users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON member_documents;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON member_documents;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON member_documents;

-- Policy for SELECT (Read)
CREATE POLICY "Enable read access for authenticated users" 
ON member_documents FOR SELECT 
TO authenticated 
USING (true);

-- Policy for INSERT (Write)
CREATE POLICY "Enable insert access for authenticated users" 
ON member_documents FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy for DELETE
CREATE POLICY "Enable delete access for authenticated users" 
ON member_documents FOR DELETE 
TO authenticated 
USING (true);

-- 4. Storage Bucket Policies (Optional but recommended to check manually in Dashboard)
-- Bu kısım SQL Editörden çalışmayabilir, Storage bölümünden 'member-documents' bucket'ını oluşturup Public yapmayı unutmayın.
