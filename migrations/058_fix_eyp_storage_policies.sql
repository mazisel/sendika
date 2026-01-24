-- Fix Storage RLS for eyp-packages bucket
-- This migration adds policies to allow authenticated users to upload/download EYP packages

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to eyp-packages bucket
CREATE POLICY "Allow upload to eyp-packages" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'eyp-packages');

-- Policy: Allow authenticated users to read from eyp-packages bucket
CREATE POLICY "Allow read from eyp-packages" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'eyp-packages');

-- Policy: Allow authenticated users to update in eyp-packages bucket
CREATE POLICY "Allow update in eyp-packages" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'eyp-packages');

-- Policy: Allow authenticated users to delete from eyp-packages bucket (optional)
CREATE POLICY "Allow delete from eyp-packages" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'eyp-packages');

-- Also ensure the bucket exists (run this in Dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('eyp-packages', 'eyp-packages', false)
-- ON CONFLICT DO NOTHING;
