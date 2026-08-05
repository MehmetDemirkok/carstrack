-- Telegram entegrasyonu kaldırıldı (Türkiye erişim engeli).
-- Bağlı kolonları ve tek-kullanımlık link kodu indeksini düşür.

DROP INDEX IF EXISTS public.profiles_telegram_link_code_idx;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS telegram_chat_id,
  DROP COLUMN IF EXISTS telegram_link_code,
  DROP COLUMN IF EXISTS telegram_link_expires_at;
