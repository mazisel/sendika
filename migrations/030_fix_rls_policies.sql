-- Create a secure function to check permissions
CREATE OR REPLACE FUNCTION has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    user_role_id UUID;
    user_role_str TEXT;
BEGIN
    current_user_id := auth.uid();
    
    -- Get user role info
    SELECT role_id, role INTO user_role_id, user_role_str
    FROM admin_users
    WHERE id = current_user_id;

    -- 1. Super Admin Bypass
    IF user_role_str = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- 2. Check Permission via Role
    IF user_role_id IS NOT NULL THEN
        PERFORM 1
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = user_role_id
        AND (p.key = required_permission OR p.key = 'super_admin_access'); -- fallback
        
        IF FOUND THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- Drop existing failing policies
DROP POLICY IF EXISTS "Decisions are viewable by authorized users" ON dm_decisions;
DROP POLICY IF EXISTS "Decisions are insertable by authorized users" ON dm_decisions;
DROP POLICY IF EXISTS "Decisions are updatable by authorized users" ON dm_decisions;

DROP POLICY IF EXISTS "Documents are viewable by authorized users" ON dm_documents;
DROP POLICY IF EXISTS "Documents are insertable by authorized users" ON dm_documents;
DROP POLICY IF EXISTS "Documents are updatable by authorized users" ON dm_documents;

DROP POLICY IF EXISTS "Attachments are viewable by authorized users" ON dm_attachments;
DROP POLICY IF EXISTS "Attachments are insertable by authorized users" ON dm_attachments;

-- Re-create Policies using the function

-- Decisions
CREATE POLICY "Decisions Select" ON dm_decisions FOR SELECT
    USING (has_permission('decisions.view') OR has_permission('decisions.manage'));

CREATE POLICY "Decisions Insert" ON dm_decisions FOR INSERT
    WITH CHECK (has_permission('decisions.manage'));

CREATE POLICY "Decisions Update" ON dm_decisions FOR UPDATE
    USING (has_permission('decisions.manage'));

-- Documents
CREATE POLICY "Documents Select" ON dm_documents FOR SELECT
    USING (has_permission('documents.view') OR has_permission('documents.manage'));

CREATE POLICY "Documents Insert" ON dm_documents FOR INSERT
    WITH CHECK (has_permission('documents.create') OR has_permission('documents.manage'));

CREATE POLICY "Documents Update" ON dm_documents FOR UPDATE
    USING (has_permission('documents.create') OR has_permission('documents.manage'));

-- Attachments
CREATE POLICY "Attachments Select" ON dm_attachments FOR SELECT
    USING (has_permission('documents.view') OR has_permission('decisions.view'));

CREATE POLICY "Attachments Insert" ON dm_attachments FOR INSERT
    WITH CHECK (has_permission('documents.create') OR has_permission('decisions.manage'));

-- Ensure sequence table is accessible (it was open but safer to be specific or open for auth)
DROP POLICY IF EXISTS "Sequences are viewable/updatable by authorized users" ON dm_sequences;
CREATE POLICY "Sequences Access" ON dm_sequences FOR ALL
    USING (auth.role() = 'authenticated');
