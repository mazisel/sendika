-- Create dm_document_defaults table to store global default settings
CREATE TABLE IF NOT EXISTS dm_document_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    header_title TEXT,
    header_org_name TEXT,
    sender_unit TEXT,
    logo_url TEXT,
    right_logo_url TEXT,
    footer_org_name TEXT,
    footer_address TEXT,
    footer_contact TEXT,
    footer_phone TEXT,
    signers JSONB DEFAULT '[]'::jsonb,
    text_align TEXT DEFAULT 'justify',
    receiver_text_align TEXT DEFAULT 'left',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id)
);

-- Enable RLS
ALTER TABLE dm_document_defaults ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to authenticated users"
ON dm_document_defaults FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert/update/delete to authorized users"
ON dm_document_defaults FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.id = auth.uid()
        AND (au.role = 'super_admin' OR EXISTS (
            SELECT 1 FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = au.role_id
            AND p.key = 'settings.manage'
        ))
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_dm_document_defaults_updated_at
BEFORE UPDATE ON dm_document_defaults
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
