-- ============================================================
-- CarsTrack — Freemium Plan Migration (Stripe)
-- Supabase Dashboard → SQL Editor'de çalıştırın
-- ============================================================

-- 1. companies tablosuna Stripe plan alanları ekle
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan                TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_sub_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id  TEXT,
  ADD COLUMN IF NOT EXISTS plan_updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Plan kısıtı
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_plan_check'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_plan_check
      CHECK (plan IN ('free', 'pro', 'fleet'));
  END IF;
END $$;

-- 2. subscriptions tablosu (ödeme geçmişi)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan                TEXT        NOT NULL CHECK (plan IN ('pro', 'fleet')),
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  amount_cents        INTEGER     NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'TRY',
  stripe_sub_id       TEXT        UNIQUE,
  period_start        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end          TIMESTAMPTZ NOT NULL,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_company    ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe     ON subscriptions(stripe_sub_id);
CREATE INDEX IF NOT EXISTS idx_subs_status     ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers view own subs" ON subscriptions;
CREATE POLICY "Managers view own subs"
  ON subscriptions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
