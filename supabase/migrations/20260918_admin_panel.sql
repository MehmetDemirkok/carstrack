-- ─────────────────────────────────────────────────────────────────────────────
-- Süper admin paneli (/admin) için iki günlük tablosu.
--
-- İKİSİ DE YALNIZCA service-role ile yazılır/okunur: RLS açıktır ama HİÇBİR
-- politika tanımlı değildir, yani anon/authenticated istemciler tek satır bile
-- göremez. Aynı desen `email_notification_log` ve `keepalive` tablolarında da
-- kullanılıyor (bkz. 20260917_service_role_only_tables.sql).
--
-- Bu tablolar tenant'a ait DEĞİLDİR — company_id taşımazlar, çünkü kayıtlar
-- uygulama sahibinin kendi işlemleridir, şirketlerin değil.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Admin denetim kaydı: panelden yapılan her değişiklik ────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Yetki env tabanlı olduğu için aktör bir profile FK'si değil, düz e-postadır.
  actor_email  text        NOT NULL,
  action       text        NOT NULL,   -- user_role_changed, company_deleted, ...
  target_type  text        NOT NULL,   -- user | company | feedback | email | system
  target_id    text,
  target_label text,
  meta         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON public.admin_audit_log (target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Policy yokluğu kasıtlıdır (bkz. 20260917_service_role_only_tables.sql).
REVOKE ALL ON TABLE public.admin_audit_log FROM anon, authenticated;

COMMENT ON TABLE public.admin_audit_log IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/admin/*.';

-- ── Admin e-posta gönderimleri: toplu/tekil duyuru geçmişi ──────────────────
CREATE TABLE IF NOT EXISTS public.admin_email_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email     text        NOT NULL,
  segment         text        NOT NULL,   -- all | managers | drivers | company | inactive | manual
  segment_label   text        NOT NULL DEFAULT '',
  subject         text        NOT NULL,
  body            text        NOT NULL DEFAULT '',
  -- Alıcı adresleri; küçük hacimde tam liste, büyük gönderimde ilk N adres.
  recipients      text[]      NOT NULL DEFAULT '{}',
  recipient_count integer     NOT NULL DEFAULT 0,
  sent_count      integer     NOT NULL DEFAULT 0,
  failed_count    integer     NOT NULL DEFAULT 0,
  is_test         boolean     NOT NULL DEFAULT false,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_email_log_created_idx
  ON public.admin_email_log (created_at DESC);

ALTER TABLE public.admin_email_log ENABLE ROW LEVEL SECURITY;
-- Policy yokluğu kasıtlıdır (bkz. 20260917_service_role_only_tables.sql).
REVOKE ALL ON TABLE public.admin_email_log FROM anon, authenticated;

COMMENT ON TABLE public.admin_email_log IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/admin/email/*.';
