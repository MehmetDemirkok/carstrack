-- ============================================================================
-- Yakıt Yönetimi — Sürücü Erişimi (2026-09-03)
--
-- 20260902_fuel_records.sql'de fuel_records yalnızca yönetici/operatöre
-- açıktı. Bu migration sürücü (role='user'|'sofor') erişimini ekler:
--
--   - SELECT/INSERT: yönetici/operatör şirketin tümünü; sürücü YALNIZCA kendi
--     eklediği kayıtları (created_by = kendisi) görür/oluşturur — vehicle_reports
--     (20260614d_rls_consolidate_permissive_policies.sql) ile aynı desen.
--   - INSERT ayrıca sürücüyü yalnızca KENDİSİNE atanmış araç(lar)la sınırlar
--     (vehicle_assignments — bir sürücünün birden fazla aracı olabilir, bkz.
--     20260526_fix_vehicle_assignments_multi_vehicle.sql).
--   - UPDATE/DELETE: yönetici/operatör serbest; sürücü yalnızca KENDİ
--     oluşturduğu kaydı düzenleyebilir/silebilir (vehicle_reports'tan farklı
--     olarak — ürün kararı: sürücü hatalı girişini kendisi düzeltebilsin).
--     UPDATE'te de araç ataması aynı şekilde doğrulanır (vehicle_id'yi
--     kendisine atanmamış bir araca çeviremez).
--
-- Storage (fuel-receipts): INSERT sürücü için <company_id>/<vehicle_id>/...
-- yolundaki vehicle_id'nin kendisine atanmış olmasını ister; DELETE, sildiği
-- dosyanın gerçekten kendi oluşturduğu bir fuel_records kaydına ait olmasını
-- ister (fuel_records henüz insert edilmeden önce çekilen fotoğraf için bu
-- kontrol INSERT aşamasında araç ataması üzerinden yapılır).
-- ============================================================================

-- ── 1) fuel_records ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "fuel_records_select" ON public.fuel_records;
DROP POLICY IF EXISTS "fuel_records_insert" ON public.fuel_records;
DROP POLICY IF EXISTS "fuel_records_update" ON public.fuel_records;
DROP POLICY IF EXISTS "fuel_records_delete" ON public.fuel_records;

CREATE POLICY "fuel_records_select"
  ON public.fuel_records FOR SELECT
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND (
      ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
      OR (created_by = (SELECT auth.uid()))
    )
  );

CREATE POLICY "fuel_records_insert"
  ON public.fuel_records FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND (
      ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
      OR (
        (created_by = (SELECT auth.uid()))
        AND (vehicle_id IN (
          SELECT va.vehicle_id FROM public.vehicle_assignments va
          WHERE va.driver_id = (SELECT auth.uid())
        ))
      )
    )
  );

CREATE POLICY "fuel_records_update"
  ON public.fuel_records FOR UPDATE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND (
      ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
      OR (created_by = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND (
      ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
      OR (
        (created_by = (SELECT auth.uid()))
        AND (vehicle_id IN (
          SELECT va.vehicle_id FROM public.vehicle_assignments va
          WHERE va.driver_id = (SELECT auth.uid())
        ))
      )
    )
  );

CREATE POLICY "fuel_records_delete"
  ON public.fuel_records FOR DELETE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND (
      ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
      OR (created_by = (SELECT auth.uid()))
    )
  );

-- ── 2) Storage: fuel-receipts ────────────────────────────────────────────────

DROP POLICY IF EXISTS "storage_fuel_receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_fuel_receipts_delete" ON storage.objects;

CREATE POLICY "storage_fuel_receipts_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fuel-receipts'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
    AND (
      (SELECT private.get_auth_role()) IN ('manager', 'operator')
      OR split_part(name, '/', 2)::uuid IN (
        SELECT va.vehicle_id FROM public.vehicle_assignments va
        WHERE va.driver_id = auth.uid()
      )
    )
  );

CREATE POLICY "storage_fuel_receipts_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fuel-receipts'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
    AND (
      (SELECT private.get_auth_role()) IN ('manager', 'operator')
      OR EXISTS (
        SELECT 1 FROM public.fuel_records fr
        WHERE fr.receipt_path = storage.objects.name AND fr.created_by = auth.uid()
      )
    )
  );
