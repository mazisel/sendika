-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Add RLS policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin or authorized roles can view logs
CREATE POLICY "Allow view access to authorized admins" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
            AND (role = 'super_admin' OR role = 'admin') -- Modify as needed for detailed permissions
        )
    );

-- Allow insert from authenticated users (via service or direct)
-- Ideally writes should happen via a secure backend function or service role,
-- but for simplicity in this generated plan, we allow inserts from authenticated users if they perform the action.
CREATE POLICY "Allow insert access to authenticated users" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.audit_logs IS 'System audit logs for tracking user actions';
