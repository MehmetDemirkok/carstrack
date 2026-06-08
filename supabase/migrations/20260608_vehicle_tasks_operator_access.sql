-- ============================================================================
-- Görev gizliliği & yetkili rol erişimi
--
-- Sürücü gizliliği zaten "vehicle_tasks_driver_select" politikası ile sağlanıyor:
--   driver_id = auth.uid()  →  sürücü yalnızca kendi görevlerini görür.
--
-- Bu migration mevcut "manager_all" politikasını "manager + operator" olacak
-- şekilde genişletir. Operatör de yetkili bir roldür ve panelde tüm görevleri
-- yönetebilmelidir. Bu değişiklik SADECE operatör erişimini ekler; sürücülerin
-- gördüğü kapsamı DEĞİŞTİRMEZ (driver_select politikası aynen korunur).
-- ============================================================================

DROP POLICY IF EXISTS "vehicle_tasks_manager_all" ON public.vehicle_tasks;

CREATE POLICY "vehicle_tasks_manager_all"
  ON public.vehicle_tasks FOR ALL
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('manager', 'operator')
  )
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) IN ('manager', 'operator')
  );
