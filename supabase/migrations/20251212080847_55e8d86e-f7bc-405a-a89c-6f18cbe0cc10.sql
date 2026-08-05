-- Make support-images bucket public so uploaded images can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'support-images';

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can upload support images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view support images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their support images" ON storage.objects;

-- Create RLS policies for support-images bucket
CREATE POLICY "Users can upload support images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view support images"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-images');

CREATE POLICY "Users can delete their support images"
ON storage.objects FOR DELETE
USING (bucket_id = 'support-images' AND auth.uid()::text = (storage.foldername(name))[1]);