-- Sürücü artık birden fazla ehliyet sınıfına sahip olabilir; her sınıfın
-- veriliş ve geçerlilik tarihi ayrı ayrı tutulur (gerçek ehliyet sistemiyle
-- birebir). Tek satırlık license_class/license_issue_date/license_expiry_date
-- yerini bir JSONB dizisine bırakır: [{ "class": "B", "issueDate": "...",
-- "expiryDate": "..." }, ...]. license_number (ehliyet belge no) tek kalır —
-- tüm sınıflar aynı fiziksel belgede yer alır.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS licenses jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Mevcut tek-sınıf verisini yeni diziye taşı.
UPDATE public.profiles
SET licenses = jsonb_build_array(
  jsonb_build_object(
    'class', license_class,
    'issueDate', license_issue_date,
    'expiryDate', license_expiry_date
  )
)
WHERE license_class IS NOT NULL AND license_class <> '';

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS license_class,
  DROP COLUMN IF EXISTS license_issue_date,
  DROP COLUMN IF EXISTS license_expiry_date;
