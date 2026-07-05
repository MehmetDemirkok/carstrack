-- Audit log / aktivite geçmişi. Insert eden kişi sadece kendi adına ve kendi
-- şirketine yazabilir (actor_id/company_id spoofing yok); okuma sadece manager.

CREATE TABLE public.audit_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name    text        NOT NULL,
  action        text        NOT NULL,
  entity_type   text        NOT NULL,
  entity_id     uuid,
  entity_label  text,
  meta          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_company_id_created_idx ON public.audit_logs (company_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = (SELECT auth.uid()) AND company_id = (SELECT get_auth_company_id()));

CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT private.get_auth_role()) = 'manager' AND company_id = (SELECT get_auth_company_id()));
