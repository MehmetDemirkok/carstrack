-- ============================================================================
-- PERFORMANS — RLS initplan (advisor 0003): auth.uid()/get_auth_company_id()
-- çağrılarını (SELECT ...) ile sarmalayarak satır-başına yeniden değerlendirmeyi
-- önle. Davranış DEĞİŞMEZ; yalnızca planlayıcı çağrıyı bir kez (InitPlan) çalıştırır.
-- ============================================================================

-- companies
ALTER POLICY sirket_okuma_izni ON public.companies
  USING (id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())));

-- notifications
ALTER POLICY "own notifications - delete" ON public.notifications USING (user_id = (SELECT auth.uid()));
ALTER POLICY "own notifications - select" ON public.notifications USING (user_id = (SELECT auth.uid()));
ALTER POLICY "own notifications - update" ON public.notifications USING (user_id = (SELECT auth.uid()));

-- profiles
ALTER POLICY profil_okuma_izni ON public.profiles USING ((SELECT auth.uid()) = id);
ALTER POLICY profiles_select_self ON public.profiles USING (id = (SELECT auth.uid()));
ALTER POLICY profiles_update_self ON public.profiles
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
ALTER POLICY profiles_update_by_manager ON public.profiles
  USING ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = 'manager') AND (id <> (SELECT auth.uid())))
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND ((SELECT private.get_auth_role()) = 'manager') AND (id <> (SELECT auth.uid())));

-- push_subscriptions
ALTER POLICY "Users can delete own push subscriptions" ON public.push_subscriptions USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert own push subscriptions" ON public.push_subscriptions WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can view own push subscriptions"   ON public.push_subscriptions USING ((SELECT auth.uid()) = user_id);

-- vehicle_assignments
ALTER POLICY vehicle_assignments_driver_select_self ON public.vehicle_assignments
  USING (driver_id = (SELECT auth.uid()));

-- vehicle_documents
ALTER POLICY docs_select ON public.vehicle_documents
  USING (company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid()) LIMIT 1));
ALTER POLICY docs_insert ON public.vehicle_documents
  WITH CHECK (company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid()) LIMIT 1));
ALTER POLICY docs_update ON public.vehicle_documents
  USING (company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid()) LIMIT 1));
ALTER POLICY docs_delete ON public.vehicle_documents
  USING (company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid()) LIMIT 1));

-- vehicle_report_logs
ALTER POLICY report_logs_member_insert ON public.vehicle_report_logs
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND (actor_id = (SELECT auth.uid())));
ALTER POLICY report_logs_driver_select ON public.vehicle_report_logs
  USING (report_id IN (SELECT vehicle_reports.id FROM vehicle_reports WHERE vehicle_reports.reporter_id = (SELECT auth.uid())));

-- vehicle_reports
ALTER POLICY reports_driver_insert ON public.vehicle_reports
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND (reporter_id = (SELECT auth.uid())));
ALTER POLICY reports_driver_select ON public.vehicle_reports
  USING ((company_id = (SELECT get_auth_company_id())) AND (reporter_id = (SELECT auth.uid())));

-- vehicle_tasks
ALTER POLICY vehicle_tasks_driver_insert ON public.vehicle_tasks
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid())));
ALTER POLICY vehicle_tasks_driver_select ON public.vehicle_tasks
  USING ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid())));
ALTER POLICY vehicle_tasks_driver_update ON public.vehicle_tasks
  USING ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid())))
  WITH CHECK ((company_id = (SELECT get_auth_company_id())) AND (driver_id = (SELECT auth.uid())));

-- vehicles (legacy public policies — sadece sarmalama; bırakma/birleştirme Part 2)
ALTER POLICY arac_silme_izni ON public.vehicles
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())));
ALTER POLICY arac_ekleme_izni ON public.vehicles
  WITH CHECK (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())));
ALTER POLICY arac_okuma_izni ON public.vehicles
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())));
ALTER POLICY arac_guncelleme_izni ON public.vehicles
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = (SELECT auth.uid())));
