-- Migration: Create Document Templates Table
-- Purpose: Store document templates for reuse (Belge Havuzu)

-- Create document templates table
CREATE TABLE IF NOT EXISTS dm_document_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_code TEXT,
    subject TEXT,
    receiver TEXT,
    content TEXT,
    sender_unit TEXT,
    text_align TEXT DEFAULT 'justify',
    receiver_text_align TEXT DEFAULT 'left',
    logo_url TEXT,
    right_logo_url TEXT,
    footer_org_name TEXT,
    footer_address TEXT,
    footer_contact TEXT,
    footer_phone TEXT,
    signers JSONB,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dm_templates_created_by ON dm_document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_dm_templates_is_public ON dm_document_templates(is_public);

-- Enable RLS
ALTER TABLE dm_document_templates ENABLE ROW LEVEL SECURITY;

-- Add Permissions
INSERT INTO permissions (key, name, description, group_name) VALUES
    ('documents.templates.view', 'Şablonları Görüntüle', 'Belge şablonlarını görüntüleme yetkisi', 'documents'),
    ('documents.templates.manage', 'Şablon Yönet', 'Belge şablonu oluşturma ve silme yetkisi', 'documents')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies

-- View: Users can see their own templates + public templates
CREATE POLICY "Templates are viewable by owner or if public" ON dm_document_templates
    FOR SELECT USING (
        is_public = true
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND (
                au.role = 'super_admin'
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('documents.templates.view', 'documents.templates.manage')
                )
            )
        )
    );

-- Insert: Authorized users can create templates
CREATE POLICY "Templates are insertable by authorized users" ON dm_document_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND (
                au.role = 'super_admin'
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key IN ('documents.templates.manage', 'documents.create')
                )
            )
        )
    );

-- Update: Owner or managers can update
CREATE POLICY "Templates are updatable by owner or managers" ON dm_document_templates
    FOR UPDATE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND (
                au.role = 'super_admin'
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key = 'documents.templates.manage'
                )
            )
        )
    );

-- Delete: Owner or managers can delete
CREATE POLICY "Templates are deletable by owner or managers" ON dm_document_templates
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND (
                au.role = 'super_admin'
                OR EXISTS (
                    SELECT 1 FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = au.role_id AND p.key = 'documents.templates.manage'
                )
            )
        )
    );

-- Grant super_admin role the new permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Sistem Yöneticisi'
AND p.key IN ('documents.templates.view', 'documents.templates.manage')
ON CONFLICT DO NOTHING;
