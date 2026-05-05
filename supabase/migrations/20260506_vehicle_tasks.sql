-- ============================================================================
-- Vehicle Task & KM Tracking
-- Drivers record start/end KM per trip; managers see all company tasks.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_tasks (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        NOT NULL REFERENCES public.companies(id)  ON DELETE CASCADE,
  vehicle_id  uuid        NOT NULL REFERENCES public.vehicles(id)   ON DELETE CASCADE,
  driver_id   uuid        NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  start_km    integer     NOT NULL CHECK (start_km >= 0),
  end_km      integer,
  distance    integer,
  description text        NOT NULL DEFAULT '',
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  start_time  timestamptz NOT NULL DEFAULT now(),
  end_time    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_end_km CHECK (end_km IS NULL OR end_km >= start_km)
);

-- Enforce one active task per driver at DB level
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_tasks_one_active_per_driver
  ON public.vehicle_tasks (driver_id)
  WHERE (status = 'active');

-- Query performance indexes
CREATE INDEX IF NOT EXISTS vehicle_tasks_company_idx    ON public.vehicle_tasks (company_id);
CREATE INDEX IF NOT EXISTS vehicle_tasks_vehicle_idx    ON public.vehicle_tasks (vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_tasks_driver_idx     ON public.vehicle_tasks (driver_id);
CREATE INDEX IF NOT EXISTS vehicle_tasks_start_time_idx ON public.vehicle_tasks (start_time DESC);

ALTER TABLE public.vehicle_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_tasks_manager_all"   ON public.vehicle_tasks;
DROP POLICY IF EXISTS "vehicle_tasks_driver_select" ON public.vehicle_tasks;
DROP POLICY IF EXISTS "vehicle_tasks_driver_insert" ON public.vehicle_tasks;
DROP POLICY IF EXISTS "vehicle_tasks_driver_update" ON public.vehicle_tasks;

-- Managers: full access to all company tasks
CREATE POLICY "vehicle_tasks_manager_all"
  ON public.vehicle_tasks FOR ALL
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'manager'
  )
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT public.get_auth_role()) = 'manager'
  );

-- Drivers: read own tasks
CREATE POLICY "vehicle_tasks_driver_select"
  ON public.vehicle_tasks FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND driver_id = auth.uid()
  );

-- Drivers: create tasks for themselves
CREATE POLICY "vehicle_tasks_driver_insert"
  ON public.vehicle_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND driver_id = auth.uid()
  );

-- Drivers: update (end) their own tasks
CREATE POLICY "vehicle_tasks_driver_update"
  ON public.vehicle_tasks FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND driver_id = auth.uid()
  )
  WITH CHECK (
    company_id = (SELECT public.get_auth_company_id())
    AND driver_id = auth.uid()
  );
