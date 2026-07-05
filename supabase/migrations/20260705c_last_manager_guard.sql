-- Son yönetici koruması: bir şirketin tüm 'manager' rolündeki üyelerinin
-- aynı anda role'den düşürülmesini engeller (kim yaptığından bağımsız —
-- hem manager'lı normal akış hem service-role için geçerli). Mevcut
-- guard_profile_privileged_columns() (20260614_security_hardening.sql,
-- 20260614b_definer_functions_private_schema.sql'de private.get_auth_role'a
-- yönlendirildi) davranışı aynen korunur, sadece bu yeni kontrol eklenir.

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  other_managers_count int;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN

    -- Şirketin en az bir yöneticisi kalmalı.
    IF OLD.role = 'manager' AND NEW.role IS DISTINCT FROM 'manager' THEN
      SELECT count(*) INTO other_managers_count
      FROM public.profiles
      WHERE company_id = OLD.company_id
        AND role = 'manager'
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
