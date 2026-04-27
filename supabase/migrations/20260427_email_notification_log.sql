-- ============================================================================
-- email_notification_log: alert e-posta dedup tablosu
-- ============================================================================
-- Hangi kullanıcıya hangi uyarının ne zaman gönderildiğini kaydeder.
-- Cron job bu tabloyu okuyarak aynı uyarıyı tekrar göndermez:
--   critical → 3 günde bir, warning → 7 günde bir.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_notification_log (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id  text NOT NULL,   -- FleetAlert.id ile birebir eşleşir (ör: "<vehicleId>-ins")
  severity  text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  sent_at   timestamptz NOT NULL DEFAULT now()
);

-- Baskılama sorgusu için index: user + alert + en son gönderim zamanı
CREATE INDEX IF NOT EXISTS idx_enl_user_alert_sent
  ON public.email_notification_log (user_id, alert_id, sent_at DESC);

-- RLS etkin — politika yok (sadece service-role admin client yazıyor/okuyor)
ALTER TABLE public.email_notification_log ENABLE ROW LEVEL SECURITY;
