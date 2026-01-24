-- Grant permissions for missing tables to authenticated users

-- Document Defaults
GRANT ALL ON TABLE dm_document_defaults TO authenticated;
GRANT ALL ON TABLE dm_document_defaults TO service_role;

-- Authorized Signers
GRANT ALL ON TABLE dm_authorized_signers TO authenticated;
GRANT ALL ON TABLE dm_authorized_signers TO service_role;

-- Calendar Events
GRANT ALL ON TABLE calendar_events TO authenticated;
GRANT ALL ON TABLE calendar_events TO service_role;

-- Legal Requests
GRANT ALL ON TABLE legal_requests TO authenticated;
GRANT ALL ON TABLE legal_requests TO service_role;



-- Sequences (Important for inserts)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Force RLS Policies for these tables if they don't exist
-- Calendar Events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated calendar" ON calendar_events;
CREATE POLICY "Allow all for authenticated calendar" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sticky Messages (saw an error for this too elsewhere)
ALTER TABLE sticky_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated sticky_messages" ON sticky_messages;
CREATE POLICY "Allow all for authenticated sticky_messages" ON sticky_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Legal Requests
ALTER TABLE legal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated legal_requests" ON legal_requests;
CREATE POLICY "Allow all for authenticated legal_requests" ON legal_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DM Authorized Signers
ALTER TABLE dm_authorized_signers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated dm_authorized_signers" ON dm_authorized_signers;
CREATE POLICY "Allow all for authenticated dm_authorized_signers" ON dm_authorized_signers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DM Document Defaults
ALTER TABLE dm_document_defaults ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated dm_document_defaults" ON dm_document_defaults;
CREATE POLICY "Allow all for authenticated dm_document_defaults" ON dm_document_defaults FOR ALL TO authenticated USING (true) WITH CHECK (true);
