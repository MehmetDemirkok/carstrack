-- ============================================================================
-- Yakıt Yönetimi (Fuel Management)
--
-- Yönetici/operatör her yakıt alımını (araç, tarih/saat, istasyon, tür, litre,
-- litre fiyatı, tutar, KM, ödeme yöntemi, fiş no, fiş fotoğrafı) kaydeder.
-- Tüketim (L/100km) ve KM başına maliyet, aracın bir önceki (kronolojik)
-- yakıt kaydına göre kat edilen mesafeden hesaplanır — bu yüzden ham tablonun
-- yanında birkaç türetilmiş view tanımlanır (bkz. aşağı).
--
-- RLS, traffic_fines ile birebir aynı (birleştirilmiş, initplan-sarmalı) deseni
-- izler: public.get_auth_company_id() + private.get_auth_role(). Sürücüler bu
-- modülü göremez — yakıt alımı yalnızca yönetici/operatör tarafından girilir.
--
-- Storage RLS, traffic-fine-photos bucket'ıyla aynı şirket-kapsamlı deseni izler.
-- ============================================================================

-- ── 1) Ham tablo ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fuel_records (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id         uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id         uuid        NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  created_by         uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  fueled_at          timestamptz NOT NULL DEFAULT now(),
  station_name       text        NOT NULL DEFAULT '',
  fuel_type          text        NOT NULL CHECK (fuel_type IN ('motorin','benzin','lpg','elektrik')),
  liters             numeric     NOT NULL CHECK (liters > 0),
  price_per_liter    numeric     NOT NULL CHECK (price_per_liter > 0),
  total_amount       numeric     NOT NULL CHECK (total_amount >= 0),
  odometer           integer     NOT NULL CHECK (odometer >= 0),
  payment_method     text        NOT NULL DEFAULT 'diger'
                      CHECK (payment_method IN ('nakit','kredi_karti','yakit_karti','fatura','diger')),
  receipt_number     text        NOT NULL DEFAULT '',
  receipt_path       text,
  notes              text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fuel_records_company_idx         ON public.fuel_records (company_id);
CREATE INDEX IF NOT EXISTS fuel_records_vehicle_idx          ON public.fuel_records (vehicle_id);
CREATE INDEX IF NOT EXISTS fuel_records_fueled_at_idx        ON public.fuel_records (fueled_at DESC);
CREATE INDEX IF NOT EXISTS fuel_records_vehicle_fueled_idx   ON public.fuel_records (vehicle_id, fueled_at);
CREATE INDEX IF NOT EXISTS fuel_records_company_station_idx  ON public.fuel_records (company_id, station_name);

ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_records_select" ON public.fuel_records;
DROP POLICY IF EXISTS "fuel_records_insert" ON public.fuel_records;
DROP POLICY IF EXISTS "fuel_records_update" ON public.fuel_records;
DROP POLICY IF EXISTS "fuel_records_delete" ON public.fuel_records;

CREATE POLICY "fuel_records_select"
  ON public.fuel_records FOR SELECT
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

CREATE POLICY "fuel_records_insert"
  ON public.fuel_records FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

CREATE POLICY "fuel_records_update"
  ON public.fuel_records FOR UPDATE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  )
  WITH CHECK (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

CREATE POLICY "fuel_records_delete"
  ON public.fuel_records FOR DELETE
  TO authenticated
  USING (
    (company_id = (SELECT public.get_auth_company_id()))
    AND ((SELECT private.get_auth_role()) = ANY (ARRAY['manager','operator']))
  );

-- ── 2) Şirket ayarı: anomali eşiği (varsayılan %15, sabit kodlanmaz) ─────────

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS fuel_anomaly_threshold_pct numeric NOT NULL DEFAULT 15;

COMMENT ON COLUMN public.companies.fuel_anomaly_threshold_pct IS
  'Yakıt anomali tespiti eşik yüzdesi — bir kaydın L/100km tüketimi aracın geçmiş ortalamasının bu yüzdenin üzerindeyse anormal sayılır. Varsayılan %15.';

-- ── 3) Türetilmiş view''lar (security_invoker: RLS çağıran kullanıcı için işler) ──

-- Her kayıt için, aynı araçtaki kronolojik olarak bir önceki kayda göre kat
-- edilen mesafe / L-100km / ₺-km. Önceki kayıt yoksa, KM geri gitmişse veya
-- aynı KM'deyse (sıfıra bölme) metrikler NULL kalır — hesaplama yapılmaz.
CREATE OR REPLACE VIEW public.fuel_record_metrics
WITH (security_invoker = true) AS
SELECT
  fr.id, fr.company_id, fr.vehicle_id, fr.created_by, fr.fueled_at, fr.station_name,
  fr.fuel_type, fr.liters, fr.price_per_liter, fr.total_amount, fr.odometer,
  fr.payment_method, fr.receipt_number, fr.receipt_path, fr.notes,
  fr.created_at, fr.updated_at,
  v.plate AS vehicle_plate, v.brand AS vehicle_brand, v.model AS vehicle_model,
  LAG(fr.odometer)  OVER w AS prev_odometer,
  LAG(fr.fueled_at) OVER w AS prev_fueled_at,
  CASE WHEN LAG(fr.odometer) OVER w IS NOT NULL AND fr.odometer > LAG(fr.odometer) OVER w
       THEN fr.odometer - LAG(fr.odometer) OVER w END AS distance_km,
  CASE WHEN LAG(fr.odometer) OVER w IS NOT NULL AND fr.odometer > LAG(fr.odometer) OVER w
       THEN round((fr.liters / (fr.odometer - LAG(fr.odometer) OVER w)::numeric) * 100, 2) END AS consumption_l_100km,
  CASE WHEN LAG(fr.odometer) OVER w IS NOT NULL AND fr.odometer > LAG(fr.odometer) OVER w
       THEN round(fr.total_amount / (fr.odometer - LAG(fr.odometer) OVER w)::numeric, 2) END AS cost_per_km
FROM public.fuel_records fr
JOIN public.vehicles v ON v.id = fr.vehicle_id
WINDOW w AS (PARTITION BY fr.vehicle_id ORDER BY fr.fueled_at, fr.id);

COMMENT ON VIEW public.fuel_record_metrics IS
  'fuel_records + araç bazında kronolojik önceki kayda göre mesafe/tüketim/₺-km. security_invoker=true olduğu için fuel_records RLS''i aynen geçerlidir.';

-- Araç başına toplu istatistik — genel ortalama tüketim, ağırlıklı olarak
-- (toplam litre / toplam mesafe) hesaplanır; tek tek kayıt oranlarının basit
-- ortalaması değil (az sayıda kayıt sapmasını azaltır).
CREATE OR REPLACE VIEW public.fuel_vehicle_stats
WITH (security_invoker = true) AS
SELECT
  m.vehicle_id,
  m.company_id,
  m.vehicle_plate,
  m.vehicle_brand,
  m.vehicle_model,
  COUNT(*)::int                                    AS purchase_count,
  SUM(m.liters)                                     AS total_liters,
  SUM(m.total_amount)                               AS total_cost,
  COALESCE(SUM(m.distance_km), 0)                   AS total_distance_km,
  CASE WHEN SUM(m.distance_km) > 0
       THEN round((SUM(m.liters) / SUM(m.distance_km)::numeric) * 100, 2) END AS avg_consumption,
  CASE WHEN SUM(m.distance_km) > 0
       THEN round(SUM(m.total_amount) / SUM(m.distance_km)::numeric, 2) END AS avg_cost_per_km,
  CASE WHEN SUM(m.liters) > 0
       THEN round(SUM(m.total_amount) / SUM(m.liters)::numeric, 2) END AS avg_price_per_liter,
  MIN(m.fueled_at)                                  AS first_fueled_at,
  MAX(m.fueled_at)                                  AS last_fueled_at
FROM public.fuel_record_metrics m
GROUP BY m.vehicle_id, m.company_id, m.vehicle_plate, m.vehicle_brand, m.vehicle_model;

COMMENT ON VIEW public.fuel_vehicle_stats IS
  'Araç bazında toplam/ortalama yakıt istatistikleri — AI ve analiz sayfaları için normalize edilmiş temel metrik seti.';

-- Aracın en güncel yakıt kaydı + o kaydın hesaplanmış tüketimi — anomali
-- tespiti ("son kayıt vs. geçmiş ortalama") ve dashboard/araç detayı için.
CREATE OR REPLACE VIEW public.fuel_vehicle_latest
WITH (security_invoker = true) AS
SELECT DISTINCT ON (m.vehicle_id)
  m.vehicle_id, m.company_id, m.vehicle_plate, m.vehicle_brand, m.vehicle_model,
  m.id AS fuel_record_id, m.fueled_at, m.liters, m.total_amount, m.odometer,
  m.station_name, m.distance_km, m.consumption_l_100km, m.cost_per_km
FROM public.fuel_record_metrics m
ORDER BY m.vehicle_id, m.fueled_at DESC, m.id DESC;

COMMENT ON VIEW public.fuel_vehicle_latest IS
  'Araç başına en güncel yakıt kaydı ve hesaplanmış tüketimi — anomali tespiti ve özet kartları için.';

-- İstasyon bazlı analiz.
CREATE OR REPLACE VIEW public.fuel_station_stats
WITH (security_invoker = true) AS
SELECT
  fr.company_id,
  NULLIF(trim(fr.station_name), '')    AS station_name,
  COUNT(*)::int                        AS purchase_count,
  SUM(fr.liters)                       AS total_liters,
  SUM(fr.total_amount)                 AS total_cost,
  round(AVG(fr.price_per_liter), 2)    AS avg_price_per_liter
FROM public.fuel_records fr
WHERE trim(coalesce(fr.station_name, '')) <> ''
GROUP BY fr.company_id, NULLIF(trim(fr.station_name), '');

COMMENT ON VIEW public.fuel_station_stats IS
  'Yakıt istasyonu bazında toplam işlem/litre/harcama ve ortalama litre fiyatı.';

-- ── 4) Storage: fiş/fatura fotoğrafı veya PDF (private bucket) ──────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-receipts', 'fuel-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_fuel_receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_fuel_receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_fuel_receipts_delete" ON storage.objects;

CREATE POLICY "storage_fuel_receipts_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fuel-receipts'
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "storage_fuel_receipts_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fuel-receipts'
    AND (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "storage_fuel_receipts_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fuel-receipts'
    AND (SELECT private.get_auth_role()) IN ('manager', 'operator')
    AND split_part(name, '/', 1) = (
      SELECT (profiles.company_id)::text
      FROM public.profiles
      WHERE profiles.id = auth.uid()
      LIMIT 1
    )
  );
