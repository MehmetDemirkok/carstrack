-- Plan / Stripe billing sistemi kaldırıldı (2026-09-19 uygulama kodundan,
-- 2026-09-25 şemadan). Hiçbir kapı plan okumuyordu; ödeme entegrasyonu yoktu.
-- Eski denetim kayıtlarındaki company_plan_changed etiketleri uygulama tarafında
-- salt okunur kalır — burada silinmez.

-- ── 1. billing subscriptions tablosu (yoksa no-op) ───────────
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- ── 2. companies üzerindeki plan / Stripe kolonları ───────────
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_plan_check;

ALTER TABLE public.companies
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS plan_expires_at,
  DROP COLUMN IF EXISTS stripe_sub_id,
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS plan_updated_at;
