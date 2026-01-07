-- Drop the generic policies we created that might conflict or were overwritten
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Restore the original Public Access policy for 'images' bucket
-- Note: We assume it was just for SELECT. If it was distinct, we might be guessing, but based on Step 189 it was SELECT.
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- Create specific policies for discount-images
CREATE POLICY "Public Access Discounts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'discount-images' );

CREATE POLICY "Authenticated Insert Discounts"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Update Discounts"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete Discounts"
ON storage.objects FOR DELETE
USING ( bucket_id = 'discount-images' AND auth.role() = 'authenticated' );
