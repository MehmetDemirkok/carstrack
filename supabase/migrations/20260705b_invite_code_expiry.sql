-- Davet kodu yenileme/süre sınırı: mevcut kodlar NULL kalır (= süresiz,
-- geriye dönük kırılma yok); sadece manager'ın "Yeni Kod Oluştur" ile ürettiği
-- kodlarda süre uygulanır (bkz. /api/companies/regenerate-invite-code).
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS invite_code_expires_at timestamptz;
