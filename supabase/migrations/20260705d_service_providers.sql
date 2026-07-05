-- Servis sağlayıcı / bayi defteri. service_records.service_center serbest
-- metin şeması değişmiyor — bu tablo yalnızca autocomplete/öneri kaynağı.
-- Erişim genişliği service_records ile tutarlı: herhangi bir şirket üyesi
-- okuyup ekleyebilir/güncelleyebilir/silebilir (company_id izolasyonu ile).

CREATE TABLE public.service_providers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  phone       text,
  address     text,
  notes       text,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX service_providers_company_name_uidx
  ON public.service_providers (company_id, lower(name));

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_providers_select ON public.service_providers FOR SELECT TO authenticated
  USING (company_id = (SELECT get_auth_company_id()));

CREATE POLICY service_providers_insert ON public.service_providers FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT get_auth_company_id()));

CREATE POLICY service_providers_update ON public.service_providers FOR UPDATE TO authenticated
  USING (company_id = (SELECT get_auth_company_id()));

CREATE POLICY service_providers_delete ON public.service_providers FOR DELETE TO authenticated
  USING (company_id = (SELECT get_auth_company_id()));
