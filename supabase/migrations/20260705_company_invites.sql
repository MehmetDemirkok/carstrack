-- E-posta ile davet: company_invites tablosu.
-- Tüm erişim service-role (admin client) üzerinden API route'larla yapılır;
-- authenticated/anon için hiçbir RLS policy tanımlanmaz (varsayılan: erişim yok).
-- Nedeni: davet oluşturma/e-posta gönderme gizli anahtar (Resend) gerektirdiği
-- için zaten server route'ta olmak zorunda; client'tan doğrudan tabloya erişime
-- hiç gerek yok, bu da saldırı yüzeyini sıfırlar.

CREATE TABLE public.company_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  role         text        NOT NULL CHECK (role IN ('manager', 'operator', 'user')),
  token        text        NOT NULL UNIQUE,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at  timestamptz
);

CREATE INDEX company_invites_company_id_idx ON public.company_invites (company_id);
CREATE INDEX company_invites_token_idx      ON public.company_invites (token);

ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;
