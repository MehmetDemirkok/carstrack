-- Uygulama içi (zil) bildirimleri için kalıcı tablo.
-- Olay bildirimleri (görev baş/bitiş, arıza, servis, araç vb.) buraya alıcı başına
-- bir satır olarak yazılır; Telegram/push/e-posta ile birlikte tek dağıtıcıdan
-- (src/lib/notify.ts → dispatchToManagers) doldurulur.
-- INSERT yalnızca service role ile yapılır (anon insert politikası yok).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, -- alıcı
  type text not null,            -- task_start, task_end, report_new, report_status, record_new, vehicle_new, driver_new
  title text not null,
  body text not null,
  url text,
  severity text not null default 'info',  -- info | warning | critical
  vehicle_id uuid,
  vehicle_plate text,
  meta jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Kullanıcı yalnızca kendi bildirimlerini görür / okur (read_at) / siler.
create policy "own notifications - select" on public.notifications for select using (user_id = auth.uid());
create policy "own notifications - update" on public.notifications for update using (user_id = auth.uid());
create policy "own notifications - delete" on public.notifications for delete using (user_id = auth.uid());
