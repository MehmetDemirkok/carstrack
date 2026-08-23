-- ============================================================================
-- Otomatik veritabanı yedekleri için özel (private) depolama alanı (2026-08-23)
-- ----------------------------------------------------------------------------
-- Günlük cron (/api/cron/db-backup) tüm public tablo verilerini JSON olarak
-- dışa aktarıp gzip'leyip buraya yazar. Bilinçli olarak storage.objects için
-- HİÇBİR RLS politikası eklenmiyor: bucket private, anon/authenticated'a
-- hiçbir izin verilmiyor. Yalnızca RLS'yi bypass eden service_role
-- (cron route'un kullandığı admin client) okuyup yazabilir.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('db-backups', 'db-backups', false)
ON CONFLICT (id) DO NOTHING;
