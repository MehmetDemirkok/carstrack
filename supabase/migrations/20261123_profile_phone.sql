-- ============================================================================
-- Kullanıcı telefon numarası
--
-- Kayıt formunda zorunlu, mevcut kullanıcılardan Ayarlar > Profil üzerinden
-- (profil tamamlama kartı / bandı / profile-reminder cron'u) istenir.
-- Yalnızca iletişim amaçlıdır: SMS veya arama ile doğrulama yapılmaz, pazarlama
-- için kullanılmaz (bkz. /privacy). Biçim uygulamada normalize edilir
-- (src/lib/phone.ts → "+905321234567").
--
-- RLS: mevcut profiles politikaları geçerlidir — kullanıcı kendi satırını
-- güncelleyebilir, aynı şirketin üyeleri okuyabilir. guard_profile_privileged_columns
-- yalnızca rol/şirket/pasiflik sütunlarını korur; phone serbest bir alandır.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- Uygulama dışından (SQL/admin) bozuk veri girilmesin: "+" ve 10–15 rakam.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format CHECK (phone IS NULL OR phone ~ '^\+[0-9]{10,15}$');

COMMENT ON COLUMN public.profiles.phone IS
  'Kullanıcının iletişim telefonu (+905321234567). Doğrulanmaz; yalnızca iletişim amaçlı.';
