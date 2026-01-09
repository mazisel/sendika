-- Update RPC function to accept IP address
CREATE OR REPLACE FUNCTION public.create_audit_log_entry(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
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
        ip_address,
        user_agent
    ) VALUES (
        COALESCE(p_user_id, auth.uid()),
        p_action,
        p_entity_type,
        p_entity_id,
        p_details,
        p_ip_address,
        current_setting('request.headers', true)::json->>'user-agent'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_audit_log_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_audit_log_entry TO service_role;
