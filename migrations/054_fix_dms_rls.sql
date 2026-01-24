-- Fix RLS Policies for Document Management System to use SECURITY DEFINER functions
-- addressing the 401/Recursion errors.

-- 1. DECISIONS
DROP POLICY IF EXISTS "Decisions are viewable by authorized users" ON dm_decisions;
DROP POLICY IF EXISTS "Decisions are insertable by authorized users" ON dm_decisions;
DROP POLICY IF EXISTS "Decisions are updatable by authorized users" ON dm_decisions;

CREATE POLICY "Decisions are viewable by authorized users" ON dm_decisions
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('decisions.view')
        OR
        public.check_user_permission('decisions.manage')
    );

CREATE POLICY "Decisions are insertable by authorized users" ON dm_decisions
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('decisions.manage')
    );

CREATE POLICY "Decisions are updatable by authorized users" ON dm_decisions
    FOR UPDATE TO authenticated USING (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('decisions.manage')
    );

-- 2. DOCUMENTS
DROP POLICY IF EXISTS "Documents are viewable by authorized users" ON dm_documents;
DROP POLICY IF EXISTS "Documents are insertable by authorized users" ON dm_documents;
DROP POLICY IF EXISTS "Documents are updatable by authorized users" ON dm_documents;

CREATE POLICY "Documents are viewable by authorized users" ON dm_documents
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('documents.view')
        OR
        public.check_user_permission('documents.manage')
    );

CREATE POLICY "Documents are insertable by authorized users" ON dm_documents
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('documents.create')
        OR
        public.check_user_permission('documents.manage')
    );

CREATE POLICY "Documents are updatable by authorized users" ON dm_documents
    FOR UPDATE TO authenticated USING (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('documents.manage')
    );

-- 3. ATTACHMENTS
DROP POLICY IF EXISTS "Attachments are viewable by authorized users" ON dm_attachments;
DROP POLICY IF EXISTS "Attachments are insertable by authorized users" ON dm_attachments;

CREATE POLICY "Attachments are viewable by authorized users" ON dm_attachments
    FOR SELECT TO authenticated USING (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('documents.view')
        OR
        public.check_user_permission('decisions.view')
    );

CREATE POLICY "Attachments are insertable by authorized users" ON dm_attachments
    FOR INSERT TO authenticated WITH CHECK (
        public.current_user_is_super_admin()
        OR
        public.check_user_permission('documents.create')
        OR
        public.check_user_permission('decisions.manage')
    );
