-- ─────────────────────────────────────────────────────────────────────────────
-- Süper admin paneli — ikinci dalga.
--
-- Dört tablo:
--   cron_runs         → zamanlanmış işlerin sonucu (şu ana kadar hiçbir yere
--                       yazılmıyordu; sessizce patlayan bir cron fark edilmezdi)
--   admin_notes       → şirket/kullanıcı üzerine serbest destek notları
--   admin_email_queue → parçalı/zamanlanmış toplu duyuru kuyruğu
--   app_settings      → global uygulama ayarları (bakım bandı)
--
-- İlk üçü YALNIZCA service-role ile okunur/yazılır: RLS açıktır ama hiçbir
-- politika tanımlı değildir (bkz. 20260917_service_role_only_tables.sql ve
-- 20260918_admin_panel.sql). `app_settings` istisnadır — bakım bandını kiracı
-- uygulaması da okumak zorunda olduğu için okumaya açıktır, yazma service-role.
--
-- Bu tablolar tenant'a ait DEĞİLDİR (admin_notes hariç company_id taşımazlar);
-- kayıtlar uygulama sahibinin kendi işlemleridir.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Cron çalışma geçmişi ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_runs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- vercel.json'daki yolun son parçası: fleet-alerts, db-backup, ...
  job         text        NOT NULL,
  -- scheduled = Vercel cron tetikledi, manual = /admin/system'den elle
  trigger     text        NOT NULL DEFAULT 'scheduled'
                          CHECK (trigger IN ('scheduled', 'manual')),
  status      text        NOT NULL CHECK (status IN ('ok', 'error')),
  http_status integer,
  duration_ms integer     NOT NULL DEFAULT 0,
  -- İşin kendi döndürdüğü özet (kaç e-posta gitti, kaç satır yedeklendi, ...)
  summary     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_runs_job_created_idx
  ON public.cron_runs (job, created_at DESC);
CREATE INDEX IF NOT EXISTS cron_runs_created_idx
  ON public.cron_runs (created_at DESC);

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
-- Policy yokluğu kasıtlıdır (bkz. 20260917_service_role_only_tables.sql).
REVOKE ALL ON TABLE public.cron_runs FROM anon, authenticated;

COMMENT ON TABLE public.cron_runs IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Yazan: lib/cron/record.ts, okuyan: api/admin/system.';

-- ── Destek notları ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Yetki env tabanlı olduğu için aktör FK değil, düz e-postadır.
  actor_email  text        NOT NULL,
  target_type  text        NOT NULL CHECK (target_type IN ('user', 'company', 'vehicle')),
  -- FK YOK: hedef silinse bile not tarihçesi kalsın istiyoruz.
  target_id    uuid        NOT NULL,
  target_label text        NOT NULL DEFAULT '',
  body         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notes_target_idx
  ON public.admin_notes (target_type, target_id, created_at DESC);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_notes FROM anon, authenticated;

COMMENT ON TABLE public.admin_notes IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/admin/notes.';

-- ── Toplu duyuru kuyruğu ────────────────────────────────────────────────────
-- Gönderim tek fonksiyon çağrısına sığmadığı için (Resend sn'de 2 istek) duyuru
-- buraya yazılır ve email-queue-drain cron'u parça parça boşaltır. `scheduled_at`
-- geleceğe ayarlanırsa duyuru o ana kadar beklemiş olur.
CREATE TABLE IF NOT EXISTS public.admin_email_queue (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email    text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'sending', 'done', 'cancelled', 'error')),
  scheduled_at   timestamptz NOT NULL DEFAULT now(),
  segment        text        NOT NULL,
  segment_label  text        NOT NULL DEFAULT '',
  subject        text        NOT NULL,
  title          text        NOT NULL,
  body           text        NOT NULL DEFAULT '',
  cta_url        text,
  cta_label      text,
  signature      text,
  -- Kuyruğa alınırken çözülmüş alıcı listesi: segment sonradan değişse bile
  -- duyuru kime söz verildiyse ona gider.
  pending_ids    uuid[]      NOT NULL DEFAULT '{}',
  total_count    integer     NOT NULL DEFAULT 0,
  sent_count     integer     NOT NULL DEFAULT 0,
  failed_count   integer     NOT NULL DEFAULT 0,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  finished_at    timestamptz
);

CREATE INDEX IF NOT EXISTS admin_email_queue_due_idx
  ON public.admin_email_queue (status, scheduled_at);
CREATE INDEX IF NOT EXISTS admin_email_queue_created_idx
  ON public.admin_email_queue (created_at DESC);

ALTER TABLE public.admin_email_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_email_queue FROM anon, authenticated;

COMMENT ON TABLE public.admin_email_queue IS
  'Yalnızca service role. Policy yokluğu kasıtlıdır — permissive policy EKLEMEYİN. Erişim: api/admin/email/*, api/cron/email-queue-drain.';

-- ── Global uygulama ayarları ────────────────────────────────────────────────
-- Tek satırlık anahtar/değer. Şu an yalnızca bakım bandı için kullanılıyor.
-- DİĞERLERİNDEN FARKLI: kiracı uygulaması da okumak zorunda olduğu için
-- okumaya açıktır. Burada tenant verisi YOKTUR, yalnızca herkese gösterilecek
-- global duyuru vardır — yazma hakkı hâlâ service-role'dedir.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Yazma politikası bilinçli olarak YOK: yalnızca service-role yazabilir.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_settings FROM anon, authenticated;

COMMENT ON TABLE public.app_settings IS
  'Global ayarlar (bakım bandı). Okuma herkese açık — tenant verisi içermez. Yazma yalnızca service role: api/admin/settings.';

INSERT INTO public.app_settings (key, value)
VALUES ('banner', '{"enabled": false, "message": "", "severity": "info"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── Depolama ağırlığı görünümleri ───────────────────────────────────────────
-- Araç fotoğrafları `vehicle-documents` bucket'ına taşındı (bkz. db.ts'teki
-- "Araç fotoğrafları" bölümü): satırda artık yalnızca yol duruyor. Ama taşıma
-- geriye dönük uyumlu — HÂLÂ satır içi base64 data-URI tutan eski satırlar var
-- ve bunlar bir sonraki kaydetmeye kadar orada kalıyor. db-backup'ın vehicles
-- tablosunu 5'erli sayfalarla okumak zorunda kalmasının sebebi de bu kalıntılar.
--
-- Bu view o kalıntıyı ölçülebilir yapar: kaç araç hâlâ satır içi fotoğraf
-- taşıyor ve kaç bayt tutuyor. Hesap SQL tarafındadır — satırları panele çekip
-- JS'te ölçmek aynı 504'leri üretirdi.
--
-- security_invoker=true: RLS çağıranın kimliğiyle işler. Pratikte bu view'ları
-- yalnızca service-role okur (aşağıdaki REVOKE), ama açık davranış güvenlidir.
CREATE OR REPLACE VIEW public.admin_vehicle_weights
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.company_id,
  v.plate,
  v.brand,
  v.model,
  v.created_at,
  -- Yalnızca satır içi (data:) değerler sayılır; storage yolu ~60 bayttır.
  ( CASE WHEN v.image   LIKE 'data:%' THEN octet_length(v.image)   ELSE 0 END
  + CASE WHEN v.image_2 LIKE 'data:%' THEN octet_length(v.image_2) ELSE 0 END
  + CASE WHEN v.image_3 LIKE 'data:%' THEN octet_length(v.image_3) ELSE 0 END
  + CASE WHEN v.image_4 LIKE 'data:%' THEN octet_length(v.image_4) ELSE 0 END
  ) AS inline_bytes,
  ( (v.image   LIKE 'data:%')::int
  + (v.image_2 LIKE 'data:%')::int
  + (v.image_3 LIKE 'data:%')::int
  + (v.image_4 LIKE 'data:%')::int
  ) AS inline_count,
  ( (v.image   IS NOT NULL AND v.image   <> '' AND v.image   NOT LIKE 'data:%')::int
  + (v.image_2 IS NOT NULL AND v.image_2 <> '' AND v.image_2 NOT LIKE 'data:%')::int
  + (v.image_3 IS NOT NULL AND v.image_3 <> '' AND v.image_3 NOT LIKE 'data:%')::int
  + (v.image_4 IS NOT NULL AND v.image_4 <> '' AND v.image_4 NOT LIKE 'data:%')::int
  ) AS stored_count
FROM public.vehicles v;

COMMENT ON VIEW public.admin_vehicle_weights IS
  'Araç başına satır içi (taşınmamış) base64 fotoğraf ağırlığı. Yalnızca service-role okur: api/admin/storage.';

CREATE OR REPLACE VIEW public.admin_company_weights
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  count(w.id)                       AS vehicle_count,
  coalesce(sum(w.inline_bytes), 0)  AS inline_bytes,
  coalesce(sum(w.inline_count), 0)  AS inline_count,
  coalesce(sum(w.stored_count), 0)  AS stored_count
FROM public.companies c
LEFT JOIN public.admin_vehicle_weights w ON w.company_id = c.id
GROUP BY c.id, c.name;

COMMENT ON VIEW public.admin_company_weights IS
  'Şirket başına satır içi fotoğraf ağırlığı ve storage''a taşınmış fotoğraf sayısı. Yalnızca service-role okur: api/admin/storage.';

REVOKE ALL ON public.admin_vehicle_weights FROM anon, authenticated;
REVOKE ALL ON public.admin_company_weights FROM anon, authenticated;
