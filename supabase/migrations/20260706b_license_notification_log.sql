-- ============================================================================
-- license_notification_log: ehliyet süresi uyarısı dedup tablosu
-- ============================================================================
-- Hangi hedefe (sürücü ya da şirket geneli yönetici özeti) hangi önem
-- seviyesinde uyarı gönderildiğini kaydeder. Cron job (license-alerts) bu
-- tabloyu okuyarak aynı uyarıyı tekrar göndermez: critical → 3 günde bir,
-- warning → 7 günde bir (email_notification_log ile aynı baskılama mantığı).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.license_notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('driver', 'manager_digest')),
  target_id   uuid NOT NULL,   -- target_type='driver' → profiles.id, 'manager_digest' → companies.id
  severity    text NOT NULL CHECK (severity IN ('critical', 'warning')),
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lnl_target_sent
  ON public.license_notification_log (target_type, target_id, sent_at DESC);

-- RLS etkin — politika yok (sadece service-role admin client yazıyor/okuyor)
ALTER TABLE public.license_notification_log ENABLE ROW LEVEL SECURITY;
