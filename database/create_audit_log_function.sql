-- Secure RPC function to create audit logs
-- This bypasses RLS on the table by using SECURITY DEFINER
-- It can be called by authenticated users

CREATE OR REPLACE FUNCTION public.create_audit_log_entry(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        user_agent
    ) VALUES (
        COALESCE(p_user_id, auth.uid()), -- Use passed ID or fallback to current auth user
        p_action,
        p_entity_type,
        p_entity_id,
        p_details,
        current_setting('request.headers', true)::json->>'user-agent'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_audit_log_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_audit_log_entry TO service_role;
