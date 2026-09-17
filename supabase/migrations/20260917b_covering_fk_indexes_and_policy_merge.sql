-- FK covering index'leri + kilometer_logs SELECT policy birleştirmesi
-- =============================================================================
-- 1) Supabase advisor'ın "unindexed_foreign_keys" bulgusu: indekssiz FK, hem
--    join'lerde hem de referans verilen satır silinirken (cascade kontrolü)
--    seq scan'e düşürüyor. 20260614e / 20260705f desenini sürdürüyoruz.
--
-- 2) kilometer_logs'ta authenticated/SELECT için iki permissive policy vardı;
--    Postgres her satırda ikisini de çalıştırıyor. Tek policy'de OR ile
--    birleştirildi — izin kümesi birebir aynı:
--      manager/operator ise şirketin tüm kayıtları, değilse yalnızca kendi kayıtları.
--    (20260614d_rls_consolidate_permissive_policies.sql ile aynı yaklaşım.)

CREATE INDEX IF NOT EXISTS fuel_records_created_by_idx       ON public.fuel_records (created_by);
CREATE INDEX IF NOT EXISTS traffic_fines_created_by_idx      ON public.traffic_fines (created_by);
CREATE INDEX IF NOT EXISTS kilometer_log_tokens_company_idx  ON public.kilometer_log_tokens (company_id);
CREATE INDEX IF NOT EXISTS kilometer_log_tokens_vehicle_idx  ON public.kilometer_log_tokens (vehicle_id);

DROP POLICY IF EXISTS kilometer_logs_manager_select ON public.kilometer_logs;
DROP POLICY IF EXISTS kilometer_logs_own_select     ON public.kilometer_logs;

CREATE POLICY kilometer_logs_select ON public.kilometer_logs
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT get_auth_company_id())
    AND (
      (SELECT private.get_auth_role()) = ANY (ARRAY['manager'::text, 'operator'::text])
      OR user_id = (SELECT auth.uid())
    )
  );
