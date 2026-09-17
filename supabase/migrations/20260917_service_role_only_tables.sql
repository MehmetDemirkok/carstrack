-- Servis-rolü-dışı erişimi kapalı tablolar
-- =============================================================================
-- Bu dört tabloda RLS açık ama hiç policy yok. Bu bir eksik DEĞİL, kasıtlı:
-- tabloların tamamına yalnızca `src/lib/supabase/admin.ts` (service role) üzerinden,
-- API route'larından erişiliyor. Tarayıcı katmanı (`src/lib/db.ts`) hiçbirine dokunmuyor.
-- Policy'siz RLS = anon/authenticated için deny-all, istenen davranış budur.
--
-- Supabase advisor bunu "rls_enabled_no_policy" (INFO) olarak raporluyor; buraya
-- permissive policy eklemek güvenliği zayıflatır. Niyetin kaybolmaması için
-- hem GRANT'leri geri alıyor hem de tabloları yorumla işaretliyoruz.
--
-- Erişim noktaları (2026-09-17 itibarıyla):
--   company_invites          -> api/invites/*, api/auth/register
--   email_notification_log   -> api/cron/fleet-alerts, api/cron/activation-nudge
--   kilometer_log_tokens     -> api/kilometer-logs/*, api/cron/kilometer-reminder
--   license_notification_log -> api/cron/license-alerts

REVOKE ALL ON TABLE public.company_invites          FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_notification_log   FROM anon, authenticated;
REVOKE ALL ON TABLE public.kilometer_log_tokens     FROM anon, authenticated;
REVOKE ALL ON TABLE public.license_notification_log FROM anon, authenticated;

COMMENT ON TABLE public.company_invites IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/invites/*, api/auth/register.';
COMMENT ON TABLE public.email_notification_log IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/cron/fleet-alerts, api/cron/activation-nudge.';
COMMENT ON TABLE public.kilometer_log_tokens IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/kilometer-logs/*, api/cron/kilometer-reminder.';
COMMENT ON TABLE public.license_notification_log IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/cron/license-alerts.';
