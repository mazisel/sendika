-- Create a new bucket for official documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('official-documents', 'official-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload official documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'official-documents' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to view files
CREATE POLICY "Authenticated users can view official documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'official-documents' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow users to update/delete their own uploads (optional, good for management)
CREATE POLICY "Users can update their own official documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'official-documents' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own official documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'official-documents' 
  AND auth.uid() = owner
);
