-- ============================================================================
-- Drop legacy Turkish-named RLS policies that survived the first migration.
-- ----------------------------------------------------------------------------
-- These reference the old `auth_company_id()` / `auth_user_role()` helpers and,
-- crucially, set up a `vehicles` ⇄ `vehicle_assignments` cycle that triggers
-- 42P17 (infinite recursion) at query time. The new `*_select`/`*_insert`/...
-- policies installed by 20260425_fix_rls_recursion.sql cover the same cases
-- without recursion, so the legacy ones are now pure noise.
-- ============================================================================

-- companies
DROP POLICY IF EXISTS "Kullanıcılar kendi şirketlerini görebilir" ON public.companies;

-- profiles
DROP POLICY IF EXISTS "Kullanıcılar kendi şirketindeki profilleri görebilir" ON public.profiles;
DROP POLICY IF EXISTS "Yöneticiler profil yönetebilir" ON public.profiles;

-- vehicles  (these are the ones forming the recursion cycle)
DROP POLICY IF EXISTS "Yöneticiler şirket araçlarını ekleyebilir"   ON public.vehicles;
DROP POLICY IF EXISTS "Yöneticiler şirket araçlarını görebilir"     ON public.vehicles;
DROP POLICY IF EXISTS "Yöneticiler şirket araçlarını güncelleyebilir" ON public.vehicles;
DROP POLICY IF EXISTS "Yöneticiler şirket araçlarını silebilir"     ON public.vehicles;
DROP POLICY IF EXISTS "Şoförler atanan araçları görebilir"          ON public.vehicles;

-- service_records
DROP POLICY IF EXISTS "Yöneticiler kayıt ekleyebilir"             ON public.service_records;
DROP POLICY IF EXISTS "Yöneticiler şirket kayıtlarını görebilir"  ON public.service_records;
DROP POLICY IF EXISTS "Şoförler atanan aracın kayıtlarını görebilir" ON public.service_records;

-- vehicle_assignments
DROP POLICY IF EXISTS "Yöneticiler atama yapabilir"          ON public.vehicle_assignments;
DROP POLICY IF EXISTS "Yöneticiler atamaları görebilir"      ON public.vehicle_assignments;
DROP POLICY IF EXISTS "Şoförler kendi atamasını görebilir"   ON public.vehicle_assignments;

-- The legacy helper functions are no longer referenced. Drop them too.
DROP FUNCTION IF EXISTS public.auth_company_id();
DROP FUNCTION IF EXISTS public.auth_user_role();

-- Re-add a driver-side policy for vehicle_assignments using the now-only
-- non-recursive helper, so drivers can read their own assignment row.
CREATE POLICY "vehicle_assignments_driver_select_self"
  ON public.vehicle_assignments FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());
