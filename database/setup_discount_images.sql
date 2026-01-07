-- Rename logo_url to image_url
ALTER TABLE public.discounts RENAME COLUMN logo_url TO image_url;

-- Create storage bucket for discount images
INSERT INTO storage.buckets (id, name, public)
VALUES ('discount-images', 'discount-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for discount-images bucket
-- Public access policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'discount-images' );

-- Authenticated upload policy
CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );

-- Authenticated update policy
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );

-- Authenticated delete policy
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );
