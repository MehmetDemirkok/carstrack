-- ============================================================================
-- Profil fotoğrafları: satır içi base64 yerine Storage
--
-- profiles.avatar_url eskiden ~30-60 KB'lık bir data-URI tutuyordu; her profil
-- okumasında (ekip listesi, select("*") sorguları, haftalık yedek) bu yük de
-- geliyordu. Araç fotoğraflarıyla (20260917) aynı çözüm: dosya private bir
-- bucket'ta, satırda yalnızca yol. Okuma /api/avatar/... proxy route'u ile.
--
-- Yol deseni: <company_id>/<user_id>/<zaman damgası>.jpg
--   * Okuma: aynı şirketin üyeleri (ileride ekip listesinde göstermek için).
--   * Yazma/silme: yalnızca kendi klasörü (ikinci parça = auth.uid()).
--
-- Geriye dönük uyumlu: hâlâ data-URI tutan satırlar olduğu gibi gösterilir,
-- kullanıcı fotoğrafını bir sonraki değiştirişinde kendiliğinden Storage'a
-- taşınır. Bu migration uygulanmadan da uygulama çalışır — yükleme
-- başarısız olursa istemci eski davranışa (data-URI) düşer.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_delete" ON storage.objects;

CREATE POLICY "storage_avatars_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      LIMIT 1
    )
  );

CREATE POLICY "storage_avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      LIMIT 1
    )
  );

CREATE POLICY "storage_avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  );

CREATE POLICY "storage_avatars_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = (SELECT auth.uid())::text
  );
