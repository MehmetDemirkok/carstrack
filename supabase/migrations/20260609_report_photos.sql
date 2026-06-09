-- ============================================================================
-- Arıza Bildirimi Fotoğrafları (Vehicle Report Photos)
--
-- Sürücüler bir arıza bildirimi oluştururken en fazla 3 fotoğraf ekleyebilir.
-- Fotoğraflar `report-photos` storage bucket'ında saklanır; dosya yolları
-- vehicle_reports.photo_paths (text[]) kolonunda tutulur.
--
-- Yol deseni: <company_id>/<vehicle_id>/<uuid>.<ext>
-- RLS (storage.objects), vehicle-documents bucket'ı ile aynı şirket-kapsamlı
-- deseni izler: ilk yol parçası (company_id) kullanıcının şirketine eşit olmalı.
-- ============================================================================

-- 1) Fotoğraf yollarını tutan kolon
ALTER TABLE public.vehicle_reports
  ADD COLUMN IF NOT EXISTS photo_paths text[] NOT NULL DEFAULT '{}';

-- 2) Özel (private) bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage RLS politikaları (şirket-kapsamlı, vehicle-documents ile aynı desen)
DROP POLICY IF EXISTS "storage_report_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_report_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_report_photos_delete" ON storage.objects;

CREATE POLICY "storage_report_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "storage_report_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'report-photos'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "storage_report_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );
