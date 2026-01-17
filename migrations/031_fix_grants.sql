-- Grant usage on DMS tables to authenticated users

GRANT ALL ON TABLE dm_decisions TO service_role;
GRANT ALL ON TABLE dm_decisions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dm_decisions TO authenticated;

GRANT ALL ON TABLE dm_documents TO service_role;
GRANT ALL ON TABLE dm_documents TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dm_documents TO authenticated;

GRANT ALL ON TABLE dm_attachments TO service_role;
GRANT ALL ON TABLE dm_attachments TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dm_attachments TO authenticated;

GRANT ALL ON TABLE dm_sequences TO service_role;
GRANT ALL ON TABLE dm_sequences TO postgres;
GRANT SELECT, INSERT, UPDATE ON TABLE dm_sequences TO authenticated;

-- Ensure sequences are usable if they use SERIAL (but here we effectively use a table for sequencing)
-- If we used real SEQUENCE objects:
-- GRANT USAGE, SELECT ON SEQUENCE dm_decisions_id_seq TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE dm_documents_id_seq TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE dm_attachments_id_seq TO authenticated;
-- However, we use uuid_generate_v4() so IDs are fine.
