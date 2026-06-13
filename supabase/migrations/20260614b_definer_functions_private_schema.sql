-- ============================================================================
-- GÜVENLİK — SECURITY DEFINER yardımcı fonksiyonlarını API'den gizle (2026-06-14b)
-- ----------------------------------------------------------------------------
-- Supabase advisor 0028/0029: public şemadaki SECURITY DEFINER fonksiyonları
-- anon/authenticated tarafından /rest/v1/rpc ile çağrılabiliyordu.
--   * get_auth_role(), get_driver_vehicle_id() RLS politikalarında CANLI kullanılıyor;
--     EXECUTE geri alınamaz (test: RLS politikası fonksiyonu için 42501 verir).
--     Çözüm: PostgREST'in açmadığı `private` şemaya taşı (EXECUTE korunur, RPC kapanır).
--   * user_role(), user_company_id() hiçbir politikada/kodda KULLANILMIYOR → DROP.
-- Sonuç: RLS davranışı birebir aynı; 8 fonksiyon uyarısı temizlenir.
-- (2026-06-14 security_hardening.sql'deki "kabul edilen risk" notunun yerine geçer.)
-- ============================================================================

-- ── 1) PostgREST'e kapalı private şema ──────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ── 2) Canlı yardımcıları private şemada yeniden oluştur ────────────────────
CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u_role text;
BEGIN
  SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
  RETURN u_role;
END;
$$;

CREATE OR REPLACE FUNCTION private.get_driver_vehicle_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT vehicle_id INTO v_id
  FROM public.vehicle_assignments
  WHERE driver_id = auth.uid()
  LIMIT 1;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION private.get_auth_role()         FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_driver_vehicle_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_auth_role()         TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_driver_vehicle_id() TO authenticated;

-- ── 3) Tüm politikaları private.* fonksiyonlara yönlendir ───────────────────
-- profiles
ALTER POLICY profiles_update_by_manager ON public.profiles
  USING ((company_id = get_auth_company_id()) AND ((SELECT private.get_auth_role()) = 'manager') AND (id <> auth.uid()))
  WITH CHECK ((company_id = get_auth_company_id()) AND ((SELECT private.get_auth_role()) = 'manager') AND (id <> auth.uid()));

-- service_records
ALTER POLICY service_records_driver_select ON public.service_records
  USING (((SELECT private.get_auth_role()) = 'driver') AND (vehicle_id = (SELECT private.get_driver_vehicle_id())));
ALTER POLICY service_records_manager_delete ON public.service_records
  USING (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));
ALTER POLICY service_records_manager_insert ON public.service_records
  WITH CHECK (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));
ALTER POLICY service_records_manager_select ON public.service_records
  USING (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));
ALTER POLICY service_records_manager_update ON public.service_records
  USING (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())))
  WITH CHECK (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));

-- vehicle_assignments
ALTER POLICY vehicle_assignments_delete ON public.vehicle_assignments
  USING (((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])) AND (EXISTS (
    SELECT 1 FROM vehicles v WHERE ((v.id = vehicle_assignments.vehicle_id) AND (v.company_id = get_auth_company_id())))));
ALTER POLICY vehicle_assignments_insert ON public.vehicle_assignments
  WITH CHECK (((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])) AND (EXISTS (
    SELECT 1 FROM vehicles v WHERE ((v.id = vehicle_assignments.vehicle_id) AND (v.company_id = get_auth_company_id())))));

-- vehicle_report_logs
ALTER POLICY report_logs_manager_all ON public.vehicle_report_logs
  USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));

-- vehicle_reports
ALTER POLICY reports_manager_all ON public.vehicle_reports
  USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));

-- vehicle_tasks
ALTER POLICY vehicle_tasks_manager_all ON public.vehicle_tasks
  USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));

-- vehicles
ALTER POLICY vehicles_driver_select ON public.vehicles
  USING (((SELECT private.get_auth_role()) = 'driver') AND (id = (SELECT private.get_driver_vehicle_id())));
ALTER POLICY vehicles_manager_delete ON public.vehicles
  USING (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));
ALTER POLICY vehicles_manager_insert ON public.vehicles
  WITH CHECK (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));
ALTER POLICY vehicles_manager_select ON public.vehicles
  USING (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));
ALTER POLICY vehicles_manager_update ON public.vehicles
  USING (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())))
  WITH CHECK (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())));

-- ── 4) Trigger fonksiyonunu private.get_auth_role'a yönlendir ───────────────
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF private.get_auth_role() = 'manager'
       AND NEW.company_id = public.get_auth_company_id()
       AND OLD.id <> auth.uid() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Yetkisiz islem: role/company_id degistirilemez';
  END IF;
  RETURN NEW;
END;
$$;

-- ── 5) Eski public fonksiyonları kaldır (2 taşındı, 2 ölü) ──────────────────
DROP FUNCTION IF EXISTS public.get_auth_role();
DROP FUNCTION IF EXISTS public.get_driver_vehicle_id();
DROP FUNCTION IF EXISTS public.user_role();
DROP FUNCTION IF EXISTS public.user_company_id();
