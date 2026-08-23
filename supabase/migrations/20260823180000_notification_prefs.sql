-- Kategori bazlı bildirim tercihi. Yalnızca push/e-posta kanallarını
-- etkiler (src/lib/notify.ts) — uygulama içi zil her zaman yazılır, filo
-- güvenlik özeti (fleet-alerts cron) bu tercihten bağımsızdır.
-- Nullable değil, varsayılan hepsi açık — mevcut kullanıcılar etkilenmez.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL
    DEFAULT '{"operational": true, "reminders": true}'::jsonb;
