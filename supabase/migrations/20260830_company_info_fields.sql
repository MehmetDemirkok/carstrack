-- Şirket iletişim/fatura bilgileri: ayarlar sayfasında yönetici tarafından düzenlenebilir.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS tax_office text,
  ADD COLUMN IF NOT EXISTS tax_number text;

COMMENT ON COLUMN public.companies.address IS 'Şirket açık adresi.';
COMMENT ON COLUMN public.companies.phone IS 'Şirket iletişim telefonu.';
COMMENT ON COLUMN public.companies.email IS 'Şirket iletişim e-postası.';
COMMENT ON COLUMN public.companies.tax_office IS 'Vergi dairesi.';
COMMENT ON COLUMN public.companies.tax_number IS 'Vergi numarası.';
