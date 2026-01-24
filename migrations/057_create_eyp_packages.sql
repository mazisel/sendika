-- Create EYP Packages table for storing metadata about generated EYP files
CREATE TABLE IF NOT EXISTS eyp_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES dm_documents(id) ON DELETE CASCADE,
    document_number TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase storage (e.g., "2026/2026_001.eyp")
    file_size INTEGER,
    hash_value TEXT, -- SHA-256 hash of the package
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'signed', 'sent', 'delivered', 'failed')),
    signature_path TEXT, -- Path to signed version of EYP
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES admin_users(id),
    sent_at TIMESTAMPTZ,
    kep_tracking_id TEXT, -- KEP provider tracking ID
    kep_response JSONB, -- Full KEP API response for debugging
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_eyp_packages_document_id ON eyp_packages(document_id);
CREATE INDEX IF NOT EXISTS idx_eyp_packages_status ON eyp_packages(status);

-- Enable RLS
ALTER TABLE eyp_packages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON eyp_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON eyp_packages TO service_role;

-- RLS Policies
CREATE POLICY "EYP packages viewable by authorized users" ON eyp_packages
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.view')
    );

CREATE POLICY "EYP packages insertable by authorized users" ON eyp_packages
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.create')
    );

CREATE POLICY "EYP packages updatable by authorized users" ON eyp_packages
    FOR UPDATE TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.manage')
    );

-- Note: Storage bucket 'eyp-packages' should be created in Supabase Dashboard
-- Go to Storage > Create Bucket > Name: "eyp-packages" > Private
