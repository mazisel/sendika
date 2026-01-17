-- Create sequence table for document numbering
CREATE TABLE IF NOT EXISTS dm_sequences (
    year INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'decision', 'incoming', 'outgoing'
    current_val INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (year, type)
);

-- Enable RLS for sequences
ALTER TABLE dm_sequences ENABLE ROW LEVEL SECURITY;

-- Create DM Decisions Table (Karar Defteri)
CREATE TABLE IF NOT EXISTS dm_decisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    decision_number TEXT NOT NULL, -- e.g., '2026/015'
    decision_date TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_number TEXT,
    board_type TEXT NOT NULL CHECK (board_type IN ('management', 'audit', 'discipline')),
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled', 'revised')),
    tags TEXT[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for decisions
ALTER TABLE dm_decisions ENABLE ROW LEVEL SECURITY;

-- Create DM Documents Table (Evraklar)
CREATE TABLE IF NOT EXISTS dm_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing', 'internal')),
    document_number TEXT NOT NULL, -- e.g., '2026/E/101'
    reference_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()), -- Geliş/Gidiş tarihi
    sender TEXT, -- Kurum/Kişi (Gönderen)
    receiver TEXT, -- Kurum/Kişi (Alıcı)
    subject TEXT NOT NULL,
    description TEXT,
    category_code TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('registered', 'draft', 'pending_approval', 'sent', 'archived', 'cancelled')),
    related_document_id UUID REFERENCES dm_documents(id), -- Zincirleme evrak
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for documents
ALTER TABLE dm_documents ENABLE ROW LEVEL SECURITY;

-- Create Attachments Table
CREATE TABLE IF NOT EXISTS dm_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_id UUID NOT NULL, -- dm_decisions.id or dm_documents.id
    parent_type TEXT NOT NULL CHECK (parent_type IN ('decision', 'document')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for attachments
ALTER TABLE dm_attachments ENABLE ROW LEVEL SECURITY;


-- Add Permissions
INSERT INTO permissions (key, name, description, group_name) VALUES
    ('documents.view', 'Belgeleri Görüntüle', 'Karar ve evrakları görüntüleme yetkisi', 'documents'),
    ('documents.create', 'Belge Oluştur', 'Yeni evrak oluşturma yetkisi', 'documents'),
    ('documents.manage', 'Belge Yönet', 'Belge düzenleme ve silme yetkisi', 'documents'),
    ('decisions.view', 'Kararları Görüntüle', 'Karar defterini görüntüleme yetkisi', 'documents'),
    ('decisions.manage', 'Karar Yönet', 'Karar alma ve düzenleme yetkisi', 'documents')
ON CONFLICT (key) DO NOTHING;

-- Policies

-- Decisions Policies
CREATE POLICY "Decisions are viewable by authorized users" ON dm_decisions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('decisions.view', 'decisions.manage')
                )
            )
        )
    );

CREATE POLICY "Decisions are insertable by authorized users" ON dm_decisions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key = 'decisions.manage'
                )
            )
        )
    );

CREATE POLICY "Decisions are updatable by authorized users" ON dm_decisions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key = 'decisions.manage'
                )
            )
        )
    );

-- Documents Policies
CREATE POLICY "Documents are viewable by authorized users" ON dm_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('documents.view', 'documents.manage')
                )
            )
        )
    );

CREATE POLICY "Documents are insertable by authorized users" ON dm_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('documents.create', 'documents.manage')
                )
            )
        )
    );

CREATE POLICY "Documents are updatable by authorized users" ON dm_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('documents.create', 'documents.manage')
                )
            )
        )
    );

-- Attachments Policies (inherit from parent implicitly via logic or explicit check)
-- For simplicity, if you can view docs, you can view attachments.
CREATE POLICY "Attachments are viewable by authorized users" ON dm_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key LIKE 'documents.%' OR p.key LIKE 'decisions.%'
                )
            )
        )
    );

CREATE POLICY "Attachments are insertable by authorized users" ON dm_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() 
            AND (
                au.role = 'super_admin' 
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('documents.create', 'documents.manage', 'decisions.manage')
                )
            )
        )
    );

-- Sequences Policies (Internal use usually, but need RLS)
CREATE POLICY "Sequences are viewable/updatable by authorized users" ON dm_sequences
    USING (true) WITH CHECK (true); -- Ideally restrict more but needed for the sequence function to work for any authorized user

-- Function to get next sequence
CREATE OR REPLACE FUNCTION get_next_dm_sequence(p_year INTEGER, p_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_val INTEGER;
BEGIN
    INSERT INTO dm_sequences (year, type, current_val)
    VALUES (p_year, p_type, 1)
    ON CONFLICT (year, type)
    DO UPDATE SET 
        current_val = dm_sequences.current_val + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING current_val INTO v_next_val;
    
    RETURN v_next_val;
END;
$$;
