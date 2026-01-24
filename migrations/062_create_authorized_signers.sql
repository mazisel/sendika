-- Create dm_authorized_signers table
CREATE TABLE IF NOT EXISTS dm_authorized_signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    title TEXT, -- Optional override for signing title
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    UNIQUE(user_id) -- A user can only be authorized once
);

-- Enable RLS
ALTER TABLE dm_authorized_signers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to authenticated users"
ON dm_authorized_signers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow manage access to authorized users"
ON dm_authorized_signers FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.id = auth.uid()
        AND (au.role = 'super_admin' OR EXISTS (
            SELECT 1 FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = au.role_id
            AND (p.key = 'definitions.manage' OR p.key = 'settings.manage')
        ))
    )
);
