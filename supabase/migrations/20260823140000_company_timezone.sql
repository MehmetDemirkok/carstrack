-- Şirket saat dilimi: günlük filo özeti e-postası her ülkede yerel saat 09:00'da gider.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Istanbul';

COMMENT ON COLUMN public.companies.timezone IS
  'IANA saat dilimi. Günlük filo özeti bu dilimde yerel saat 09:00''da gönderilir.';
