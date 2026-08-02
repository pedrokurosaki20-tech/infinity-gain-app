DROP POLICY IF EXISTS "Auth read campaign files" ON storage.objects;
CREATE POLICY "Auth read campaign files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'share-campaigns');

DROP POLICY IF EXISTS "Admins insert campaign files" ON storage.objects;
CREATE POLICY "Admins insert campaign files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'share-campaigns' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update campaign files" ON storage.objects;
CREATE POLICY "Admins update campaign files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'share-campaigns' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'share-campaigns' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete campaign files" ON storage.objects;
CREATE POLICY "Admins delete campaign files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'share-campaigns' AND public.has_role(auth.uid(), 'admin'));