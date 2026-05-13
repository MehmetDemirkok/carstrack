-- ============================================================
-- CarsTrack — Freemium Plan Migration (Stripe) — IDEMPOTENT
-- Birden fazla çalıştırılsa bile güvenli.
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. companies tablosu ─────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan               TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_sub_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Plan check constraint (idempotent)
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

-- ── 2. subscriptions tablosu ─────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'active',
  amount_cents INTEGER     NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'TRY',
  stripe_sub_id TEXT,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eksik kolonları güvenle ekle (tablo zaten varsa)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_sub_id  TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Check constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_plan_check
      CHECK (plan IN ('pro', 'fleet'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN ('active', 'cancelled', 'expired', 'pending'));
  END IF;
END $$;

-- Unique constraint on stripe_sub_id (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_sub_id_key'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_stripe_sub_id_key UNIQUE (stripe_sub_id);
  END IF;
END $$;

-- ── 3. Index'ler ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subs_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subs_status  ON subscriptions(status);

-- stripe_sub_id index sadece kolon varsa ekle
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_sub_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_subs_stripe ON subscriptions(stripe_sub_id);
  END IF;
END $$;

-- ── 4. RLS ───────────────────────────────────────────────────

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

-- ── 5. updated_at trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
