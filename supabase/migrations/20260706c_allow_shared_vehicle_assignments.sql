-- Bir araç artık birden fazla sürücüye aynı anda atanabilir (paylaşımlı araç
-- kullanımı). Önceki UNIQUE(vehicle_id) kısıtı bunu engelliyordu ve manager
-- zaten başka bir sürücüde olan aracı yeni bir sürücüye atamaya çalıştığında
-- 409 Conflict hatasına yol açıyordu.
--
-- UNIQUE(vehicle_id, driver_id) (vehicle_assignments_vehicle_id_driver_id_key /
-- vehicle_assignments_driver_vehicle_uniq) kısıtı kalır — aynı (araç, sürücü)
-- çiftinin iki kez eklenmesini engellemeye devam eder.

ALTER TABLE public.vehicle_assignments
  DROP CONSTRAINT IF EXISTS vehicle_assignments_vehicle_unique;
