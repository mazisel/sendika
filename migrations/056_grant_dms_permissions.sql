-- Fix Permission Denied Errors by explicitly granting access to tables for authenticated users.
-- RLS policies control "Which" rows they see, but these GRANTS allow them to query the table at all.

-- 1. Document Management Tables
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_document_templates TO authenticated;

-- 2. Ensure Grants for Service Role as well (Best Practice)
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_decisions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_attachments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_sequences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON dm_document_templates TO service_role;

-- 3. Also safeguard role_permissions access if not already granted
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON permissions TO authenticated;
