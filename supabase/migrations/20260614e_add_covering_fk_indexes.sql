-- PERFORMANS — kapsayıcı (covering) FK index'leri (advisor 0001).
-- FK kolonlarında index yoksa join'ler ve cascade silmeler yavaşlar.
CREATE INDEX IF NOT EXISTS notifications_company_id_idx        ON public.notifications      (company_id);
CREATE INDEX IF NOT EXISTS profiles_company_id_idx            ON public.profiles          (company_id);
CREATE INDEX IF NOT EXISTS service_records_company_id_idx     ON public.service_records   (company_id);
CREATE INDEX IF NOT EXISTS service_records_vehicle_id_idx     ON public.service_records   (vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_report_logs_actor_id_idx   ON public.vehicle_report_logs (actor_id);
