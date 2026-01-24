-- Comprehensive Fix for DMS RLS and Grants (Idempotent)

-- 1. Ensure basic grants (Safety net)
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON permissions TO authenticated;

-- 2. Fix dm_document_templates Policies (Use SECURE functions)
DROP POLICY IF EXISTS "Templates are viewable by owner or if public" ON dm_document_templates;
DROP POLICY IF EXISTS "Templates are insertable by authorized users" ON dm_document_templates;
DROP POLICY IF EXISTS "Templates are updatable by owner or managers" ON dm_document_templates;
DROP POLICY IF EXISTS "Templates are deletable by owner or managers" ON dm_document_templates;

CREATE POLICY "Templates are viewable by owner or if public" ON dm_document_templates
    FOR SELECT TO authenticated USING (
        is_public = true
        OR created_by = auth.uid()
        OR public.current_user_is_super_admin()
        OR public.check_user_permission('documents.templates.view')
        OR public.check_user_permission('documents.templates.manage')
    );

CREATE POLICY "Templates are insertable by authorized users" ON dm_document_templates
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.templates.manage')
        OR public.check_user_permission('documents.create')
    );

CREATE POLICY "Templates are updatable by owner or managers" ON dm_document_templates
    FOR UPDATE TO authenticated USING (
        created_by = auth.uid()
        OR public.current_user_is_super_admin()
        OR public.check_user_permission('documents.templates.manage')
    );

CREATE POLICY "Templates are deletable by owner or managers" ON dm_document_templates
    FOR DELETE TO authenticated USING (
        created_by = auth.uid()
        OR public.current_user_is_super_admin()
        OR public.check_user_permission('documents.templates.manage')
    );

-- 3. Re-Apply Fix for dm_documents, dm_decisions, dm_attachments (Just in case 054 was skipped)
-- Note: It is safe to run DROP IF EXISTS again.

-- DECISIONS
DROP POLICY IF EXISTS "Decisions are viewable by authorized users" ON dm_decisions;
DROP POLICY IF EXISTS "Decisions are insertable by authorized users" ON dm_decisions;
DROP POLICY IF EXISTS "Decisions are updatable by authorized users" ON dm_decisions;

CREATE POLICY "Decisions are viewable by authorized users" ON dm_decisions
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('decisions.view')
        OR public.check_user_permission('decisions.manage')
    );

CREATE POLICY "Decisions are insertable by authorized users" ON dm_decisions
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR public.check_user_permission('decisions.manage')
    );

CREATE POLICY "Decisions are updatable by authorized users" ON dm_decisions
    FOR UPDATE TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('decisions.manage')
    );

-- DOCUMENTS
DROP POLICY IF EXISTS "Documents are viewable by authorized users" ON dm_documents;
DROP POLICY IF EXISTS "Documents are insertable by authorized users" ON dm_documents;
DROP POLICY IF EXISTS "Documents are updatable by authorized users" ON dm_documents;

CREATE POLICY "Documents are viewable by authorized users" ON dm_documents
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.view')
        OR public.check_user_permission('documents.manage')
    );

CREATE POLICY "Documents are insertable by authorized users" ON dm_documents
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.create')
        OR public.check_user_permission('documents.manage')
    );

CREATE POLICY "Documents are updatable by authorized users" ON dm_documents
    FOR UPDATE TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.manage')
    );

-- ATTACHMENTS
DROP POLICY IF EXISTS "Attachments are viewable by authorized users" ON dm_attachments;
DROP POLICY IF EXISTS "Attachments are insertable by authorized users" ON dm_attachments;

CREATE POLICY "Attachments are viewable by authorized users" ON dm_attachments
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.view')
        OR public.check_user_permission('decisions.view')
    );

CREATE POLICY "Attachments are insertable by authorized users" ON dm_attachments
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR public.check_user_permission('documents.create')
        OR public.check_user_permission('decisions.manage')
    );
