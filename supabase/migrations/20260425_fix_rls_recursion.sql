-- ============================================================================
-- Fix RLS infinite recursion + enforce per-company data isolation
-- ----------------------------------------------------------------------------
-- The previous policies referenced `profiles` from inside `vehicles` policies
-- (and vice-versa), which Postgres detects as a cyclic dependency at query
-- planning time and rejects with: 42P17 "infinite recursion detected in
-- policy for relation 'vehicles'".
--
-- Fix: introduce two SECURITY DEFINER helper functions that look up the
-- caller's company_id / role *outside* of RLS. All policies route through
-- these helpers, so no policy needs to subquery another RLS-protected table.
-- ============================================================================

-- ── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.user_company_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;

-- ── companies ──────────────────────────────────────────────────────────────

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select"               ON public.companies;
DROP POLICY IF EXISTS "Users can view their company"   ON public.companies;

CREATE POLICY "companies_select"
  ON public.companies FOR SELECT
  TO authenticated
  USING (id = public.user_company_id());

-- ── profiles ───────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self"                  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_company"               ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self"                  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select"                       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"                       ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"    ON public.profiles;

CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_company"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (company_id = public.user_company_id());

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── vehicles ───────────────────────────────────────────────────────────────

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select"                            ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert"                            ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update"                            ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete"                            ON public.vehicles;
DROP POLICY IF EXISTS "Users can view their company vehicles"      ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles for their company" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their company vehicles"    ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete their company vehicles"    ON public.vehicles;
DROP POLICY IF EXISTS "select_company_vehicles"                    ON public.vehicles;
DROP POLICY IF EXISTS "insert_company_vehicles"                    ON public.vehicles;
DROP POLICY IF EXISTS "update_company_vehicles"                    ON public.vehicles;
DROP POLICY IF EXISTS "delete_company_vehicles"                    ON public.vehicles;

CREATE POLICY "vehicles_select"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (company_id = public.user_company_id());

CREATE POLICY "vehicles_insert"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "vehicles_update"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "vehicles_delete"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (company_id = public.user_company_id());

-- ── service_records ────────────────────────────────────────────────────────

ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_records_select"                       ON public.service_records;
DROP POLICY IF EXISTS "service_records_insert"                       ON public.service_records;
DROP POLICY IF EXISTS "service_records_update"                       ON public.service_records;
DROP POLICY IF EXISTS "service_records_delete"                       ON public.service_records;
DROP POLICY IF EXISTS "Users can view their company records"         ON public.service_records;
DROP POLICY IF EXISTS "Users can insert records for their company"   ON public.service_records;
DROP POLICY IF EXISTS "Users can update their company records"       ON public.service_records;
DROP POLICY IF EXISTS "Users can delete their company records"       ON public.service_records;

CREATE POLICY "service_records_select"
  ON public.service_records FOR SELECT
  TO authenticated
  USING (company_id = public.user_company_id());

CREATE POLICY "service_records_insert"
  ON public.service_records FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "service_records_update"
  ON public.service_records FOR UPDATE
  TO authenticated
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "service_records_delete"
  ON public.service_records FOR DELETE
  TO authenticated
  USING (company_id = public.user_company_id());

-- ── vehicle_assignments ────────────────────────────────────────────────────

ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_assignments_select" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "vehicle_assignments_insert" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "vehicle_assignments_update" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "vehicle_assignments_delete" ON public.vehicle_assignments;

CREATE POLICY "vehicle_assignments_select"
  ON public.vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_assignments.vehicle_id
        AND v.company_id = public.user_company_id()
    )
  );

CREATE POLICY "vehicle_assignments_insert"
  ON public.vehicle_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_role() = 'manager'
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_assignments.vehicle_id
        AND v.company_id = public.user_company_id()
    )
  );

CREATE POLICY "vehicle_assignments_delete"
  ON public.vehicle_assignments FOR DELETE
  TO authenticated
  USING (
    public.user_role() = 'manager'
    AND EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_assignments.vehicle_id
        AND v.company_id = public.user_company_id()
    )
  );
