-- ============================================================================
-- GÜVENLİK SERTLEŞTİRME — 2026-06-14
-- ----------------------------------------------------------------------------
-- Kapatılan açıklar:
--   C-1  Kiracı izolasyonu kullanıcı-yazılabilir user_metadata.company_id'ye
--        dayanıyordu. Artık app_metadata (yalnızca service-role yazabilir)
--        önceliklidir; user_metadata yalnızca geçiş için yedek (fallback).
--   C-2  profiles_update_self herhangi bir kullanıcının kendi role/company_id
--        kolonunu değiştirmesine izin veriyordu (yetki yükseltme). Trigger ile
--        engellendi; yöneticinin başkasını güncellemesi (profiles_update_by_manager)
--        ve service-role işlemleri korunur.
--   M-2  SECURITY DEFINER fonksiyonlarında search_path sabitlendi.
--   M-3  Kullanılmayan eski yardımcı fonksiyonların anon/authenticated EXECUTE
--        yetkisi geri alındı (RPC ile çağrılamaz).
--   C-3  Telegram bağlama için tek-kullanımlık kod kolonları eklendi.
-- ============================================================================

-- ── 0) BACKFILL: mevcut kullanıcılara app_metadata.company_id yaz ────────────
-- Kaynak: profiles.company_id (yetkili kayıt). Token yenilenince JWT'ye yansır.
UPDATE auth.users u
SET raw_app_meta_data =
  COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('company_id', p.company_id::text)
FROM public.profiles p
WHERE p.id = u.id
  AND p.company_id IS NOT NULL;

-- ── 1) Tenant helper: app_metadata öncelikli, user_metadata yedek ────────────
-- COALESCE yedeği yalnızca app_metadata henüz dolmamış kullanıcılar için geçerli;
-- backfill sonrası tüm gerçek kullanıcılarda app_metadata dolu olduğundan
-- user_metadata fiilen yok sayılır (saldırgan değiştirse de etkisi olmaz).
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata'  ->> 'company_id'),
    (auth.jwt() -> 'user_metadata' ->> 'company_id')
  )::uuid
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_company_id() TO authenticated;

-- get_auth_role: search_path sabitle (rol kaynağı profiles tablosu olarak kalır)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u_role text;
BEGIN
  SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
  RETURN u_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- ── 2) C-2: profiles role/company_id değişikliklerini koruyan trigger ────────
-- Mantık:
--   * role veya company_id DEĞİŞMİYORSA → her zaman serbest (ad/dept/avatar vb.)
--   * Değişiyorsa yalnızca:
--       - service_role / admin client (auth.uid() IS NULL) → serbest
--       - aynı şirketin manager'ı, BAŞKA bir kullanıcıyı güncelliyorsa → serbest
--     aksi halde reddedilir (sürücünün kendini manager yapması engellenir).
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN

    -- service-role (oturumsuz admin client)
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- aynı şirketin yöneticisi, kendisinden başka birini güncelliyor
    IF public.get_auth_role() = 'manager'
       AND NEW.company_id = public.get_auth_company_id()
       AND OLD.id <> auth.uid() THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Yetkisiz işlem: role/company_id değiştirilemez';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- ── 3) C-3: Telegram tek-kullanımlık bağlama kodu kolonları ──────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_link_code        text,
  ADD COLUMN IF NOT EXISTS telegram_link_expires_at  timestamptz;

CREATE INDEX IF NOT EXISTS profiles_telegram_link_code_idx
  ON public.profiles (telegram_link_code)
  WHERE telegram_link_code IS NOT NULL;

-- ── 4) M-3 — İPTAL EDİLDİ ────────────────────────────────────────────────────
-- NOT: get_driver_vehicle_id() / user_company_id() / user_role() fonksiyonları
-- ÖLÜ DEĞİL — get_driver_vehicle_id() canlı RLS politikalarında kullanılıyor
-- (service_records_driver_select, vehicles_driver_select). EXECUTE geri alınırsa
-- bu tablolara her SELECT "permission denied for function" (42501) ile patlar.
-- Bu yüzden EXECUTE grant'leri KORUNUR. Advisor'ın "anon RPC ile çağırabilir"
-- uyarısı kabul edilebilir: bu fonksiyonlar yalnızca çağıranın KENDİ verisini
-- döndürür (auth.uid() bazlı), bilgi sızdırmaz.
--
-- get_auth_company_id artık SECURITY DEFINER değil ve search_path sabit;
-- get_auth_role search_path sabit. Tek kalan trigger fonksiyonunun gereksiz
-- RPC erişimi follow-up migration'da kaldırıldı (trigger olarak çalışır).
