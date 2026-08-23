-- ============================================================================
-- Trafik Cezaları (Traffic Fines)
--
-- Yöneticiler/operatörler bir araca kesilen trafik cezasını kaydeder (manuel
-- veya tebligat fotoğrafından AI ile doldurarak), isteğe bağlı olarak bir
-- sürücüye "yansıtır" (bilgilendirme amaçlı — sürücü bildirim alır ve kendi
-- cezalarını görür). Ödeme durumunu yalnızca yönetici/operatör değiştirir;
-- ayrı bir durum-geçmişi tablosu yok, mevcut audit_logs yeterli.
--
-- RLS, feedback/vehicle_reports ile aynı (birleştirilmiş, initplan-sarmalı)
-- deseni izler: public.get_auth_company_id() + private.get_auth_role().
-- Storage RLS, report-photos bucket'ıyla aynı şirket-kapsamlı deseni izler.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_fines (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id         uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id         uuid        NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  driver_id          uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  fine_number        text        NOT NULL DEFAULT '',
  violation_type     text        NOT NULL DEFAULT '',
  amount             numeric     NOT NULL,
  discounted_amount  numeric,
  fine_date          date        NOT NULL,
  due_date           date,
  location            text,
  status             text        NOT NULL DEFAULT 'unpaid'
                      CHECK (status IN ('unpaid','paid','objected','cancelled')),
  paid_at            timestamptz,
  photo_path         text,
  notes              text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traffic_fines_company_idx    ON public.traffic_fines (company_id);
CREATE INDEX IF NOT EXISTS traffic_fines_vehicle_idx    ON public.traffic_fines (vehicle_id);
CREATE INDEX IF NOT EXISTS traffic_fines_driver_idx     ON public.traffic_fines (driver_id);
CREATE INDEX IF NOT EXISTS traffic_fines_status_idx     ON public.traffic_fines (status);
CREATE INDEX IF NOT EXISTS traffic_fines_due_date_idx   ON public.traffic_fines (due_date);
CREATE INDEX IF NOT EXISTS traffic_fines_created_at_idx ON public.traffic_fines (created_at DESC);

ALTER TABLE public.traffic_fines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traffic_fines_select" ON public.traffic_fines;
DROP POLICY IF EXISTS "traffic_fines_insert" ON public.traffic_fines;
DROP POLICY IF EXISTS "traffic_fines_update" ON public.traffic_fines;
DROP POLICY IF EXISTS "traffic_fines_delete" ON public.traffic_fines;

-- SELECT: yönetici/operatör şirketin tümünü; sürücü yalnızca kendine yansıtılanları
CREATE POLICY "traffic_fines_select"
  ON public.traffic_fines FOR SELECT
  TO authenticated
  USING (
    ((company_id = (SELECT public.get_auth_company_id()))
      AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR (driver_id = (SELECT auth.uid()))
  );

-- INSERT/UPDATE/DELETE: yalnızca yönetici/operatör — sürücü kayıt oluşturmaz/değiştirmez
CREATE POLICY "traffic_fines_insert"
  ON public.traffic_fines FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

CREATE POLICY "traffic_fines_update"
  ON public.traffic_fines FOR UPDATE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  )
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

CREATE POLICY "traffic_fines_delete"
  ON public.traffic_fines FOR DELETE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

-- ── Storage: tebligat fotoğrafı (private bucket) ────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('traffic-fine-photos', 'traffic-fine-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_traffic_fine_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_traffic_fine_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_traffic_fine_photos_delete" ON storage.objects;

CREATE POLICY "storage_traffic_fine_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'traffic-fine-photos'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "storage_traffic_fine_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'traffic-fine-photos'
    AND (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "storage_traffic_fine_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'traffic-fine-photos'
    AND (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );
