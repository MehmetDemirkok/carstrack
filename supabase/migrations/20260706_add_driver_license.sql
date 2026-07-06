-- Sürücü ehliyet bilgileri
-- Sürücü (role='user') kullanıcıların ehliyet sınıfı/no/tarihlerini tutar.
-- Zorunlu değildir; boş bırakılabilir, sadece takip/hatırlatma amaçlıdır.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_class text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS license_issue_date date,
  ADD COLUMN IF NOT EXISTS license_expiry_date date;
