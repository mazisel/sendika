-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read sticky messages" ON public.sticky_messages;
DROP POLICY IF EXISTS "Allow all users to read sticky messages" ON public.sticky_messages;

-- Allow ALL users (including anon) to read - for displaying in header
CREATE POLICY "Allow all users to read sticky messages"
    ON public.sticky_messages
    FOR SELECT
    USING (true);
