-- ============================================================================
-- Ekip üyesini şirketten çıkarma — geri alınabilir pasifleştirme (2026-11-15b)
-- ----------------------------------------------------------------------------
-- Silme yerine pasifleştirme: profil satırı kalır, böylece geçmiş görev/kayıt/
-- ceza kayıtlarındaki isimler kaybolmaz. Pasif kullanıcı:
--   * private.get_auth_role() için NULL döner → role bağlı tüm RLS politikaları
--     (araç, görev, kayıt, rapor, atama…) anında reddeder.
--   * /api/members/[id] tarafından Supabase Auth'ta askıya alınır (ban) → yeni
--     oturum açamaz, refresh token yenilenemez.
-- Sütunlar yalnızca service-role (auth.uid() IS NULL) tarafından değiştirilebilir;
-- kullanıcı kendi satırını profiles_update politikasıyla güncelleyebildiği için
-- bu koruma guard_profile_privileged_columns tetikleyicisinde yapılır.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at    timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Auth banını pasifleştirme mi koydu? Yeniden etkinleştirmede yalnızca bizim
  -- koyduğumuz ban kaldırılır; admin panelinin veya hesap silme talebinin
  -- banına dokunulmaz.
  ADD COLUMN IF NOT EXISTS deactivation_ban  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_deactivated_by_idx ON public.profiles (deactivated_by);

-- ── 1) Pasif kullanıcının rolü yok sayılır ─────────────────────────────────
CREATE OR REPLACE FUNCTION private.get_auth_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u_role text;
BEGIN
  SELECT role INTO u_role
  FROM public.profiles
  WHERE id = auth.uid()
    AND deactivated_at IS NULL;
  RETURN u_role;
END;
$$;

-- ── 2) Koruma tetikleyicisi: pasifleştirme sütunları + son aktif yönetici ───
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  other_managers_count int;
BEGIN
  -- Pasifleştirme sütunları yalnızca sunucu (service-role) tarafından değişir.
  IF NEW.deactivated_at   IS DISTINCT FROM OLD.deactivated_at
     OR NEW.deactivated_by   IS DISTINCT FROM OLD.deactivated_by
     OR NEW.deactivation_ban IS DISTINCT FROM OLD.deactivation_ban THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Yetkisiz islem: uyelik durumu degistirilemez';
    END IF;

    -- Aktif bir yöneticiyi pasifleştirirken başka aktif yönetici kalmalı.
    IF OLD.deactivated_at IS NULL AND NEW.deactivated_at IS NOT NULL
       AND OLD.role = 'manager' THEN
      SELECT count(*) INTO other_managers_count
      FROM public.profiles
      WHERE company_id = OLD.company_id
        AND role = 'manager'
        AND deactivated_at IS NULL
        AND id <> OLD.id;

      IF other_managers_count = 0 THEN
        RAISE EXCEPTION 'Sirketin en az bir yoneticisi olmali';
      END IF;
    END IF;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN

    -- Aktif bir yöneticinin rolü düşürülürken başka aktif yönetici kalmalı.
    IF OLD.role = 'manager' AND NEW.role IS DISTINCT FROM 'manager'
       AND OLD.deactivated_at IS NULL THEN
      SELECT count(*) INTO other_managers_count
      FROM public.profiles
      WHERE company_id = OLD.company_id
        AND role = 'manager'
        AND deactivated_at IS NULL
        AND id <> OLD.id;

      IF other_managers_count = 0 THEN
        RAISE EXCEPTION 'Sirketin en az bir yoneticisi olmali';
      END IF;
    END IF;

    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF private.get_auth_role() = 'manager'
       AND NEW.company_id = public.get_auth_company_id()
       AND OLD.id <> auth.uid() THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Yetkisiz islem: role/company_id degistirilemez';
  END IF;

  RETURN NEW;
END;
$$;
