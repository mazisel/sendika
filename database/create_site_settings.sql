-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    logo_url TEXT,
    site_title TEXT DEFAULT 'Kamu Ulaşım Sen',
    primary_color TEXT DEFAULT '#e3510f',
    secondary_color TEXT DEFAULT '#20a9e0',
    -- NetGSM SMS API Settings
    netgsm_usercode TEXT,
    netgsm_password TEXT,
    netgsm_header TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for site_settings
-- Everyone can read, authenticated can update (using anon key which is equivalent to public)
-- Since the app uses custom auth (not Supabase Auth), we allow all updates
-- The admin check is done at the application level
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings" ON public.site_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings" ON public.site_settings
    FOR ALL USING (true);

-- Create storage bucket for site assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for site-assets
DROP POLICY IF EXISTS "Public Access Site Assets" ON storage.objects;
CREATE POLICY "Public Access Site Assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'site-assets' );

DROP POLICY IF EXISTS "Authenticated Insert Site Assets" ON storage.objects;
CREATE POLICY "Authenticated Insert Site Assets"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'site-assets' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Update Site Assets" ON storage.objects;
CREATE POLICY "Authenticated Update Site Assets"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'site-assets' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Delete Site Assets" ON storage.objects;
CREATE POLICY "Authenticated Delete Site Assets"
ON storage.objects FOR DELETE
USING ( bucket_id = 'site-assets' AND auth.role() = 'authenticated' );

-- Insert default settings if not exists
INSERT INTO public.site_settings (site_title, primary_color, secondary_color)
SELECT 'Kamu Ulaşım Sen', '#e3510f', '#20a9e0'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);
