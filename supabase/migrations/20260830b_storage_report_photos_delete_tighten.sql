-- ============================================================================
-- GÜVENLİK — report-photos silme politikasını daralt (2026-08-30b)
-- ----------------------------------------------------------------------------
-- 20260609_report_photos.sql'deki storage_report_photos_delete politikası
-- yalnızca company_id eşleşmesine bakıyordu: aynı şirketteki HERHANGİ BİR
-- kullanıcı (sürücü dahil), başka bir sürücünün yüklediği arıza fotoğrafını
-- silebiliyordu. Oysa deleteReport() (src/lib/db.ts) ve vehicle_reports
-- tablosunun kendi RLS'i (reports_manager_all) bu işlemi yalnızca
-- manager/operator rolüne açık tutuyor — storage katmanı bununla tutarsızdı.
-- Şirket-içi (intra-tenant) bir yetki gevşekliğiydi, cross-tenant sızıntı değil.
-- ============================================================================

DROP POLICY IF EXISTS "storage_report_photos_delete" ON storage.objects;

CREATE POLICY "storage_report_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND split_part(name, '/', 1) = (SELECT (public.get_auth_company_id())::text)
    AND (SELECT private.get_auth_role()) = ANY (ARRAY['manager', 'operator'])
  );
