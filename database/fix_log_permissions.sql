-- =====================================================
-- FIX LOG PERMISSIONS
-- Run this script in Supabase SQL Editor to resolve 403 errors
-- =====================================================

-- 1. Grant Table Permissions to 'authenticated' role
-- Supabase API uses 'authenticated' role for logged-in users.
-- Even with RLS, these GRANTs are required for access.

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_templates TO authenticated;
GRANT SELECT ON public.admin_users TO authenticated; -- Required for RLS checks

-- Grant same to service_role just in case
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.sms_logs TO service_role;
GRANT ALL ON public.sms_templates TO service_role;
GRANT ALL ON public.admin_users TO service_role;

-- 2. Grant Sequence Permissions
-- If tables use serial/sequences, this is needed for INSERTS
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 3. Refresh RLS Policies
-- Re-defining policies ensures they are correctly applied to the authenticated role.

-- Audit Logs Policy
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow view access to authorized admins" ON public.audit_logs;
CREATE POLICY "Allow view access to authorized admins" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            -- Check for authorized roles. Adjust as needed.
            AND (role = 'super_admin' OR role = 'admin' OR role_type IN ('general_manager', 'regional_manager', 'branch_manager'))
        )
    );

DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON public.audit_logs;
CREATE POLICY "Allow insert access to authenticated users" ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');


-- SMS Logs Policy
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view sms logs" ON public.sms_logs;
CREATE POLICY "Admins can view sms logs" ON public.sms_logs
    FOR SELECT
    TO authenticated
    USING (
        -- Allow access to anyone who is a valid admin user
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can insert sms logs" ON public.sms_logs;
CREATE POLICY "Admins can insert sms logs" ON public.sms_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );


-- SMS Templates Policy
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active sms templates" ON public.sms_templates;
CREATE POLICY "Public can view active sms templates" ON public.sms_templates
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage sms templates" ON public.sms_templates;
CREATE POLICY "Admins can manage sms templates" ON public.sms_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            AND (role = 'super_admin' OR role = 'admin' OR role_type = 'general_manager')
        )
    );
