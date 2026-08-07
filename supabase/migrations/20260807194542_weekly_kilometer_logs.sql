-- ============================================================================
-- HAFTALIK KİLOMETRE TAKİP MODÜLÜ
-- ----------------------------------------------------------------------------
-- 1) kilometer_logs  — sürücülerin geçmiş km girdileri
-- 2) kilometer_log_tokens — bildirimdeki tek kullanımlık magic link token'ları
-- 3) kilometer-photos storage bucket (isteğe bağlı sayaç fotoğrafı)
-- ============================================================================

-- ── 1) Kilometre geçmişi ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kilometer_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id        uuid        NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  kilometer_value   integer     NOT NULL CHECK (kilometer_value >= 0),
  previous_kilometer integer,
  photo_url         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kilometer_logs_vehicle_created_idx
  ON public.kilometer_logs (vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kilometer_logs_user_created_idx
  ON public.kilometer_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kilometer_logs_company_idx
  ON public.kilometer_logs (company_id);

ALTER TABLE public.kilometer_logs ENABLE ROW LEVEL SECURITY;

-- Yönetici/operatör: şirket tüm kayıtlarını görür
DROP POLICY IF EXISTS "kilometer_logs_manager_select" ON public.kilometer_logs;
CREATE POLICY "kilometer_logs_manager_select"
  ON public.kilometer_logs FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND (SELECT private.get_auth_role()) IN ('manager', 'operator')
  );

-- Sürücü: yalnızca kendi kayıtlarını görür
DROP POLICY IF EXISTS "kilometer_logs_own_select" ON public.kilometer_logs;
CREATE POLICY "kilometer_logs_own_select"
  ON public.kilometer_logs FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.get_auth_company_id())
    AND user_id = (SELECT auth.uid())
  );

-- INSERT yalnızca service role (cron + magic-link API) üzerinden yapılır;
-- authenticated için insert politikası yok.

-- ── 2) Tek kullanımlık magic link token'ları ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kilometer_log_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        NOT NULL UNIQUE,
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id  uuid        NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kilometer_log_tokens_token_idx
  ON public.kilometer_log_tokens (token)
  WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS kilometer_log_tokens_user_idx
  ON public.kilometer_log_tokens (user_id, created_at DESC);

ALTER TABLE public.kilometer_log_tokens ENABLE ROW LEVEL SECURITY;
-- Token tablosu yalnızca service role ile okunur/yazılır (RLS politikası yok).

-- ── 3) Sayaç fotoğrafı storage bucket ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('kilometer-photos', 'kilometer-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_kilometer_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_kilometer_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_kilometer_photos_delete" ON storage.objects;

-- Authenticated kullanıcılar kendi şirketinin fotoğraflarını görebilir
CREATE POLICY "storage_kilometer_photos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kilometer-photos'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

-- Upload magic-link API üzerinden service role ile yapılır;
-- authenticated insert politikası bilinçli olarak eklenmedi.
CREATE POLICY "storage_kilometer_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kilometer-photos'
    AND (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );
