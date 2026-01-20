-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    category TEXT DEFAULT 'meeting', -- meeting, visit, ceremony, deadline, other
    color TEXT DEFAULT 'blue', -- blue, red, green, purple, orange
    created_by UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read calendar events"
    ON public.calendar_events
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert calendar events"
    ON public.calendar_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update calendar events"
    ON public.calendar_events
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete calendar events"
    ON public.calendar_events
    FOR DELETE
    TO authenticated
    USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_date, end_date);

COMMENT ON TABLE public.calendar_events IS 'Stores common calendar events for union management';
