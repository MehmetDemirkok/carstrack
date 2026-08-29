-- ============================================================================
-- ŞOFÖR ROLÜ EKLENİYOR — 2026-08-29
-- ----------------------------------------------------------------------------
-- "sofor" rolü, yetki bakımından mevcut "user" (Kullanıcı) rolüyle birebir
-- aynıdır — yalnızca ekip listesinde ayrı bir etiket olarak gösterilecek.
-- RLS politikaları yükseltilmiş erişimi yalnızca 'manager'/'operator' için
-- beyaz listeye alıyor (bkz. 20260711_vehicles_rls_tighten.sql ve diğerleri),
-- bu yüzden 'sofor' otomatik olarak 'user' ile aynı kısıtlı davranışı
-- miras alır — RLS politikalarında ek değişiklik gerekmez.

ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['manager'::text, 'operator'::text, 'user'::text, 'sofor'::text]));

ALTER TABLE public.company_invites DROP CONSTRAINT company_invites_role_check;
ALTER TABLE public.company_invites ADD CONSTRAINT company_invites_role_check
  CHECK (role = ANY (ARRAY['manager'::text, 'operator'::text, 'user'::text, 'sofor'::text]));
