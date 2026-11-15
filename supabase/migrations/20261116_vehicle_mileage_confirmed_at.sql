-- ============================================================================
-- "Km değişmedi" onayı (vehicles.mileage_confirmed_at) — 2026-11-16
--
-- mileage_updated_at yalnızca km DEĞİŞİNCE ilerler (trigger). Park halindeki
-- bir araçta km aynı kalır; sürücü "km değişmedi" dediğinde bu bilginin bir
-- yerde tutulması gerekir, yoksa eski km hatırlatması (mileage-reminder cron'u)
-- o aracı sonsuza dek "eski" sayar.
--
-- Km'nin güncelliği = greatest(mileage_updated_at, mileage_confirmed_at).
--
-- Sütunu yalnızca sunucu (POST /api/vehicles/[id]/mileage, service-role) yazar.
-- Sürücüler istemciden bu sütunu değiştiremez: guard_vehicle_driver_update
-- karşılaştırmasından muaf tutulmadığı için reddedilir.
-- Yalnızca yeni, NULL'a izin veren bir sütun ekler; mevcut verilere dokunmaz.
-- ============================================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS mileage_confirmed_at timestamptz;
