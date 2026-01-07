-- Safely create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('discount-images', 'discount-images', true)
ON CONFLICT (id) DO NOTHING;

-- Safely drop existing policies to recreate them ensuring they point to the correct bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Recreate policies targeted at discount-images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'discount-images' );

CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );
