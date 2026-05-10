-- E-posta bildirim tercihi: kullanıcı devre dışı bırakabilir.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN NOT NULL DEFAULT true;
