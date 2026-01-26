-- Grant permissions for calendar_event_participants
GRANT ALL ON TABLE calendar_event_participants TO authenticated;
GRANT ALL ON TABLE calendar_event_participants TO service_role;

-- Ensure RLS and policies exist for authenticated users
ALTER TABLE calendar_event_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated calendar participants" ON calendar_event_participants;
CREATE POLICY "Allow all for authenticated calendar participants"
    ON calendar_event_participants
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
