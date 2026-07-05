-- FK covering index'leri (20260614e_add_covering_fk_indexes.sql deseniyle tutarlı).
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx        ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS company_invites_invited_by_idx ON public.company_invites (invited_by);
CREATE INDEX IF NOT EXISTS service_providers_created_by_idx ON public.service_providers (created_by);
