-- ============================================================================
-- Allow multiple vehicles per driver in vehicle_assignments.
-- If the table had a UNIQUE(driver_id) constraint (one vehicle per driver),
-- this drops it and enforces UNIQUE(driver_id, vehicle_id) instead.
-- ============================================================================

-- Drop any single-column unique constraint on driver_id alone.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'vehicle_assignments'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 1
      AND c.conkey[1] = (
        SELECT a.attnum FROM pg_attribute a
        WHERE a.attrelid = t.oid AND a.attname = 'driver_id'
      )
  LOOP
    EXECUTE 'ALTER TABLE public.vehicle_assignments DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Ensure the pair (driver_id, vehicle_id) is unique (one assignment per vehicle per driver).
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_assignments_driver_vehicle_uniq
  ON public.vehicle_assignments (driver_id, vehicle_id);
