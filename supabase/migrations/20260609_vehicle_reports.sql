-- ============================================================================
-- Vehicle Reports (Araç Arıza / Durum Bildirimleri)
--
-- Sürücüler araçtaki arıza/durumları bildirir. Yöneticiler (manager/operator)
-- bunları görüntüler ve durumu ilerletir: Açık → İncelendi → Çözülüyor → Çözüldü.
-- Her durum değişikliği vehicle_report_logs tablosunda geriye dönük loglanır.
--
-- vehicle_tasks (20260506_vehicle_tasks.sql) ile aynı RLS/yetki desenini izler:
--   get_auth_company_id() / get_auth_role() yardımcı fonksiyonları.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_reports (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id      uuid        NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  reporter_id     uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  title           text        NOT NULL DEFAULT '',
  description     text        NOT NULL DEFAULT '',
  category        text        NOT NULL DEFAULT 'other'
                  CHECK (category IN ('engine','brake','tire','electrical','fluid','warning_light','body','other')),
  severity        text        NOT NULL DEFAULT 'medium'
                  CHECK (severity IN ('low','medium','high','critical')),
  status          text        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','acknowledged','in_progress','resolved')),
  resolution_note text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS vehicle_reports_company_idx    ON public.vehicle_reports (company_id);
CREATE INDEX IF NOT EXISTS vehicle_reports_vehicle_idx    ON public.vehicle_reports (vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_reports_reporter_idx   ON public.vehicle_reports (reporter_id);
CREATE INDEX IF NOT EXISTS vehicle_reports_status_idx     ON public.vehicle_reports (status);
CREATE INDEX IF NOT EXISTS vehicle_reports_created_at_idx ON public.vehicle_reports (created_at DESC);

CREATE TABLE IF NOT EXISTS public.vehicle_report_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id   uuid        NOT NULL REFERENCES public.vehicle_reports(id) ON DELETE CASCADE,
  company_id  uuid        NOT NULL REFERENCES public.companies(id)       ON DELETE CASCADE,
  actor_id    uuid        NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  from_status text,
  to_status   text,
  note        text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_report_logs_report_idx  ON public.vehicle_report_logs (report_id);
CREATE INDEX IF NOT EXISTS vehicle_report_logs_company_idx ON public.vehicle_report_logs (company_id);

-- ── RLS: vehicle_reports ────────────────────────────────────────────────────

ALTER TABLE public.vehicle_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_manager_all"   ON public.vehicle_reports;
DROP POLICY IF EXISTS "reports_driver_select" ON public.vehicle_reports;
DROP POLICY IF EXISTS "reports_driver_insert" ON public.vehicle_reports;

-- Yöneticiler / operatörler: şirketteki tüm bildirimlere tam erişim
CREATE POLICY "reports_manager_all"
  ON public.vehicle_reports FOR ALL
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('manager','operator')
  )
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('manager','operator')
  );

-- Sürücüler: yalnızca kendi bildirimlerini okur
CREATE POLICY "reports_driver_select"
  ON public.vehicle_reports FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND reporter_id = auth.uid()
  );

-- Sürücüler: kendi adlarına bildirim oluşturur
CREATE POLICY "reports_driver_insert"
  ON public.vehicle_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND reporter_id = auth.uid()
  );

-- ── RLS: vehicle_report_logs ────────────────────────────────────────────────

ALTER TABLE public.vehicle_report_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_logs_manager_all"   ON public.vehicle_report_logs;
DROP POLICY IF EXISTS "report_logs_member_insert" ON public.vehicle_report_logs;
DROP POLICY IF EXISTS "report_logs_driver_select" ON public.vehicle_report_logs;

-- Yöneticiler / operatörler: şirketteki tüm loglara tam erişim
CREATE POLICY "report_logs_manager_all"
  ON public.vehicle_report_logs FOR ALL
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('manager','operator')
  )
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('manager','operator')
  );

-- Tüm şirket üyeleri kendi adlarına log ekleyebilir
-- (sürücünün "oluşturuldu" logu + yöneticinin durum değişiklik logu).
CREATE POLICY "report_logs_member_insert"
  ON public.vehicle_report_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND actor_id = auth.uid()
  );

-- Sürücüler: yalnızca kendi bildirimlerine ait logları okur
CREATE POLICY "report_logs_driver_select"
  ON public.vehicle_report_logs FOR SELECT
  TO authenticated
  USING (
    report_id IN (
      SELECT id FROM public.vehicle_reports WHERE reporter_id = auth.uid()
    )
  );
