-- ============================================================================
-- PERFORMANS — multiple_permissive_policies (advisor 0006) + kalan initplan.
-- Her (tablo, eylem) için çakışan PERMISSIVE politikalar TEK politikada (OR ile)
-- birleştirildi. PostgreSQL zaten permissive politikaları OR'ladığı için davranış
-- BİREBİR AYNI (Strategy A — kimse erişim kazanmaz/kaybetmez). Eski Türkçe
-- politikalar (legacy) bilinçli olarak KORUNDU (OR koşulu içinde) — 'user' rolündeki
-- aktif hesap dahil mevcut erişim aynen sürer. Rol-tabanlı sıkılaştırma ileride
-- ayrı/bilinçli bir adım olarak yapılabilir.
-- ============================================================================

-- ── companies ───────────────────────────────────────────────────────────────
DROP POLICY companies_select   ON public.companies;
DROP POLICY sirket_okuma_izni  ON public.companies;
CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated
USING ((id = (SELECT get_auth_company_id()))
    OR (id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid()))));

-- ── profiles ─────────────────────────────────────────────────────────────────
DROP POLICY profil_okuma_izni        ON public.profiles;
DROP POLICY profiles_select_company  ON public.profiles;
DROP POLICY profiles_select_self     ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING ((company_id = (SELECT get_auth_company_id())) OR (id = (SELECT auth.uid())));

DROP POLICY profiles_update_by_manager ON public.profiles;
DROP POLICY profiles_update_self       ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
USING ((id = (SELECT auth.uid()))
    OR ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = 'manager') AND (id <> (SELECT auth.uid()))))
WITH CHECK ((id = (SELECT auth.uid()))
    OR ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = 'manager') AND (id <> (SELECT auth.uid()))));

-- ── service_records (sadece SELECT çakışıyordu) ──────────────────────────────
DROP POLICY service_records_driver_select  ON public.service_records;
DROP POLICY service_records_manager_select ON public.service_records;
CREATE POLICY service_records_select ON public.service_records FOR SELECT TO authenticated
USING ((((SELECT private.get_auth_role()) = 'driver')  AND (vehicle_id = (SELECT private.get_driver_vehicle_id())))
    OR (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id()))));

-- ── subscriptions (iki politika birebir aynıydı → tek; auth.uid sarmalandı) ──
DROP POLICY "Company managers view own subs" ON public.subscriptions;
DROP POLICY "Managers view own subs"         ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT TO authenticated
USING (company_id IN (SELECT profiles.company_id FROM profiles
                       WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'manager'));

-- ── vehicle_assignments (SELECT çakışması) ───────────────────────────────────
DROP POLICY vehicle_assignments_driver_select_self ON public.vehicle_assignments;
DROP POLICY vehicle_assignments_select             ON public.vehicle_assignments;
CREATE POLICY vehicle_assignments_select ON public.vehicle_assignments FOR SELECT TO authenticated
USING ((driver_id = (SELECT auth.uid()))
    OR (EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vehicle_assignments.vehicle_id
                                          AND v.company_id = (SELECT get_auth_company_id()))));

-- ── vehicle_report_logs (ALL politikayı eylem-bazına ayır) ───────────────────
DROP POLICY report_logs_manager_all   ON public.vehicle_report_logs;
DROP POLICY report_logs_member_insert ON public.vehicle_report_logs;
DROP POLICY report_logs_driver_select ON public.vehicle_report_logs;
CREATE POLICY vehicle_report_logs_select ON public.vehicle_report_logs FOR SELECT TO authenticated
USING (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR (report_id IN (SELECT vehicle_reports.id FROM vehicle_reports WHERE vehicle_reports.reporter_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_report_logs_insert ON public.vehicle_report_logs FOR INSERT TO authenticated
WITH CHECK (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
         OR ((company_id = (SELECT get_auth_company_id())) AND (actor_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_report_logs_update ON public.vehicle_report_logs FOR UPDATE TO authenticated
USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));
CREATE POLICY vehicle_report_logs_delete ON public.vehicle_report_logs FOR DELETE TO authenticated
USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));

-- ── vehicle_reports (ALL politikayı eylem-bazına ayır) ───────────────────────
DROP POLICY reports_manager_all   ON public.vehicle_reports;
DROP POLICY reports_driver_insert ON public.vehicle_reports;
DROP POLICY reports_driver_select ON public.vehicle_reports;
CREATE POLICY vehicle_reports_select ON public.vehicle_reports FOR SELECT TO authenticated
USING (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR ((company_id = (SELECT get_auth_company_id())) AND (reporter_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_reports_insert ON public.vehicle_reports FOR INSERT TO authenticated
WITH CHECK (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
         OR ((company_id = (SELECT get_auth_company_id())) AND (reporter_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_reports_update ON public.vehicle_reports FOR UPDATE TO authenticated
USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));
CREATE POLICY vehicle_reports_delete ON public.vehicle_reports FOR DELETE TO authenticated
USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));

-- ── vehicle_tasks (ALL politikayı eylem-bazına ayır) ─────────────────────────
DROP POLICY vehicle_tasks_manager_all   ON public.vehicle_tasks;
DROP POLICY vehicle_tasks_driver_insert ON public.vehicle_tasks;
DROP POLICY vehicle_tasks_driver_select ON public.vehicle_tasks;
DROP POLICY vehicle_tasks_driver_update ON public.vehicle_tasks;
CREATE POLICY vehicle_tasks_select ON public.vehicle_tasks FOR SELECT TO authenticated
USING (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_tasks_insert ON public.vehicle_tasks FOR INSERT TO authenticated
WITH CHECK (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
         OR ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_tasks_update ON public.vehicle_tasks FOR UPDATE TO authenticated
USING (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
    OR ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid()))))
WITH CHECK (((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])))
         OR ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid()))));
CREATE POLICY vehicle_tasks_delete ON public.vehicle_tasks FOR DELETE TO authenticated
USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator'])));

-- ── vehicles (legacy arac_* + modern manager/driver → eylem-bazına tek) ──────
DROP POLICY arac_okuma_izni       ON public.vehicles;
DROP POLICY arac_ekleme_izni      ON public.vehicles;
DROP POLICY arac_guncelleme_izni  ON public.vehicles;
DROP POLICY arac_silme_izni       ON public.vehicles;
DROP POLICY vehicles_manager_select ON public.vehicles;
DROP POLICY vehicles_manager_insert ON public.vehicles;
DROP POLICY vehicles_manager_update ON public.vehicles;
DROP POLICY vehicles_manager_delete ON public.vehicles;
DROP POLICY vehicles_driver_select  ON public.vehicles;
CREATE POLICY vehicles_select ON public.vehicles FOR SELECT TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())))
    OR (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id())))
    OR (((SELECT private.get_auth_role()) = 'driver')  AND (id = (SELECT private.get_driver_vehicle_id()))));
CREATE POLICY vehicles_insert ON public.vehicles FOR INSERT TO authenticated
WITH CHECK ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())))
         OR (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id()))));
CREATE POLICY vehicles_update ON public.vehicles FOR UPDATE TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())))
    OR (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id()))))
WITH CHECK ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())))
         OR (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id()))));
CREATE POLICY vehicles_delete ON public.vehicles FOR DELETE TO authenticated
USING ((company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())))
    OR (((SELECT private.get_auth_role()) = 'manager') AND (company_id = (SELECT get_auth_company_id()))));
