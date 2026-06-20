
/*
# Storage Policies for survey-files bucket

Allow public read and anon write access to the survey-files bucket.
*/

DROP POLICY IF EXISTS "Public read survey files" ON storage.objects;
CREATE POLICY "Public read survey files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'survey-files');

DROP POLICY IF EXISTS "Anon upload survey files" ON storage.objects;
CREATE POLICY "Anon upload survey files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'survey-files');

DROP POLICY IF EXISTS "Anon update survey files" ON storage.objects;
CREATE POLICY "Anon update survey files"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'survey-files');

DROP POLICY IF EXISTS "Anon delete survey files" ON storage.objects;
CREATE POLICY "Anon delete survey files"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'survey-files');
