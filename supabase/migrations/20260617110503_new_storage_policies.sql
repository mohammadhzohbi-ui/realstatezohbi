
/*
# Storage policies for field-files and cad-files buckets
*/

DROP POLICY IF EXISTS "Public read field files" ON storage.objects;
CREATE POLICY "Public read field files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'field-files');
DROP POLICY IF EXISTS "Anon upload field files" ON storage.objects;
CREATE POLICY "Anon upload field files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'field-files');
DROP POLICY IF EXISTS "Anon delete field files" ON storage.objects;
CREATE POLICY "Anon delete field files" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'field-files');

DROP POLICY IF EXISTS "Public read cad files" ON storage.objects;
CREATE POLICY "Public read cad files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'cad-files');
DROP POLICY IF EXISTS "Anon upload cad files" ON storage.objects;
CREATE POLICY "Anon upload cad files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'cad-files');
DROP POLICY IF EXISTS "Anon delete cad files" ON storage.objects;
CREATE POLICY "Anon delete cad files" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'cad-files');
