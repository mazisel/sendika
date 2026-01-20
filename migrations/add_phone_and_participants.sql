-- Add phone column to admin_users
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create calendar_event_participants table
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(event_id, admin_id)
);

-- Add RLS policies for participants
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read participants"
    ON public.calendar_event_participants
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage participants"
    ON public.calendar_event_participants
    FOR ALL
    TO authenticated
    USING (true);

-- Indices
CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_event ON public.calendar_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_admin ON public.calendar_event_participants(admin_id);

COMMENT ON TABLE public.calendar_event_participants IS 'Stores participant information for calendar events';
