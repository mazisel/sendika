-- Create sticky_messages table
CREATE TABLE IF NOT EXISTS public.sticky_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.sticky_messages ENABLE ROW LEVEL SECURITY;

-- Allow ALL users (including anon) to read - for displaying in header
CREATE POLICY "Allow all users to read sticky messages"
    ON public.sticky_messages
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert sticky messages"
    ON public.sticky_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete sticky messages"
    ON public.sticky_messages
    FOR DELETE
    TO authenticated
    USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sticky_messages_created_at 
    ON public.sticky_messages(created_at DESC);

COMMENT ON TABLE public.sticky_messages IS 'Stores sticky/banner messages displayed in the header';
COMMENT ON COLUMN public.sticky_messages.message IS 'The message text to display';
COMMENT ON COLUMN public.sticky_messages.created_by IS 'Admin user who created the message';
COMMENT ON COLUMN public.sticky_messages.created_at IS 'When the message was created';
