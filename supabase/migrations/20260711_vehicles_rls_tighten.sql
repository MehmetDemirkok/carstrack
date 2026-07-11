-- ============================================================================
-- VEHICLES RLS SIKILAŞTIRMA — 2026-07-11
-- ----------------------------------------------------------------------------
-- Sorun: vehicles_insert/update/delete politikalarında hâlâ eski "şirketteki
-- HERHANGİ bir üye" (company_id IN (SELECT profiles.company_id ...)) OR-kolu
-- vardı. Bu, rol kontrolünü fiilen devre dışı bırakıyordu — sürücü (role='user')
-- dahil her şirket üyesi UI'da gizli olsa da doğrudan API çağrısıyla herhangi
-- bir şirket aracını düzenleyip silebiliyordu. role='driver' kontrolleri ise
-- hiçbir zaman true olamayan ölü kod (profiles.role CHECK'i yalnızca
-- 'manager'|'operator'|'user' kabul eder; gerçek sürücü rolü 'user').
--
-- Çözüm:
--   - SELECT: davranış aynı kalır (tüm şirket üyeleri filoyu görebilir),
--     yalnızca ölü role='driver' kolu temizlenir.
--   - INSERT/DELETE: yalnızca manager/operator.
--   - UPDATE: manager/operator serbest; sürücüye de izin verilir (mevcut
--     akışları kırmamak için — endTask() km güncellemesi ve araç fotoğrafı
--     konumlandırma sürücü tarafından tetikleniyor) ama yeni bir trigger'la
--     sürücünün değiştirebileceği kolonlar mileage/updated_at/image_position/
--     image_position_x ile sınırlanır. Bu desen mevcut
--     guard_profile_privileged_columns trigger'ıyla (20260614_security_hardening.sql)
--     birebir aynı stildedir.
-- ============================================================================

-- ── SELECT: sadeleştir, davranış aynı ────────────────────────────────────────
DROP POLICY IF EXISTS vehicles_select ON public.vehicles;
CREATE POLICY vehicles_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()));

-- ── INSERT: yalnızca manager/operator ────────────────────────────────────────
DROP POLICY IF EXISTS vehicles_insert ON public.vehicles;
CREATE POLICY vehicles_insert ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND company_id = (SELECT public.get_auth_company_id())
  );

-- ── DELETE: yalnızca manager/operator ────────────────────────────────────────
DROP POLICY IF EXISTS vehicles_delete ON public.vehicles;
CREATE POLICY vehicles_delete ON public.vehicles
  FOR DELETE TO authenticated
  USING (
    (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND company_id = (SELECT public.get_auth_company_id())
  );

-- ── UPDATE: tüm şirket üyeleri satıra erişebilir, kolon kısıtı trigger'da ────
DROP POLICY IF EXISTS vehicles_update ON public.vehicles;
CREATE POLICY vehicles_update ON public.vehicles
  FOR UPDATE TO authenticated
  USING (company_id = (SELECT public.get_auth_company_id()))
  WITH CHECK (company_id = (SELECT public.get_auth_company_id()));

-- ── Trigger: sürücü yalnızca km + fotoğraf konumu kolonlarını değiştirebilir ──
-- private şemada tanımlanır (20260614b_definer_functions_private_schema.sql
-- deseniyle aynı) — public şemada olsaydı SECURITY DEFINER fonksiyon olarak
-- PostgREST tarafından anon/authenticated'e RPC olarak açılırdı (advisor 0028/0029).
CREATE OR REPLACE FUNCTION private.guard_vehicle_driver_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- service-role (admin client, oturumsuz) → kısıtsız
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- manager/operator → kısıtsız
  IF private.get_auth_role() IN ('manager', 'operator') THEN
    RETURN NEW;
  END IF;

  -- sürücü (role='user') → yalnızca mileage/updated_at/image_position/image_position_x
  IF (to_jsonb(NEW) - 'mileage' - 'updated_at' - 'image_position' - 'image_position_x')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'mileage' - 'updated_at' - 'image_position' - 'image_position_x') THEN
    RAISE EXCEPTION 'Yetkisiz işlem: sürücüler yalnızca kilometre ve fotoğraf konumunu güncelleyebilir';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_vehicle_driver_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS vehicles_guard_driver_update ON public.vehicles;
CREATE TRIGGER vehicles_guard_driver_update
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_vehicle_driver_update();
