-- Keepalive: Supabase free tier 7+ gün hareketsizlikte projeyi askıya alır.
-- Bu tabloya 2 günde bir yazma/silme yapılarak proje aktif tutulur.
create table if not exists public.keepalive (
  id         bigint generated always as identity primary key,
  pinged_at  timestamptz not null default now()
);

-- Yalnızca service role (admin client) dokunur; RLS açık, politika yok = herkese kapalı.
alter table public.keepalive enable row level security;
