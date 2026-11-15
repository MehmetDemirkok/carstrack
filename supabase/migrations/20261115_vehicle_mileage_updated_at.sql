-- ============================================================================
-- Araç KM'sinin en son ne zaman güncellendiği (vehicles.mileage_updated_at)
--
-- updated_at herhangi bir alan değişince değiştiği için "km ne kadar eski?"
-- sorusuna cevap vermiyordu. Bu sütun YALNIZCA mileage değiştiğinde değişir.
--
-- Sütunu uygulama kodu DEĞİL, aşağıdaki trigger doldurur. Böylece:
--   * km'yi güncelleyen her yol (görev bitirme, yakıt, KM farkı kapatma,
--     araç düzenleme, admin, script) otomatik olarak kapsanır;
--   * kod bu sütuna hiç yazmadığı için migration uygulanmadan önce de
--     uygulama sorunsuz çalışır (sütun yalnızca okunur, yoksa undefined gelir).
--
-- Yalnızca yeni (NULL'a izin veren) bir sütun ekler; mevcut verilere dokunmaz.
-- RLS: vehicles tablosunun mevcut politikaları bu sütunu da kapsar.
-- ============================================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS mileage_updated_at timestamptz;

-- ----------------------------------------------------------------------------
-- Trigger fonksiyonu: km değiştiyse (veya araç km ile oluşturulduysa) zamanı yaz.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.set_vehicle_mileage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.mileage IS NOT NULL AND NEW.mileage_updated_at IS NULL THEN
      NEW.mileage_updated_at := now();
    END IF;
  ELSIF NEW.mileage IS DISTINCT FROM OLD.mileage THEN
    NEW.mileage_updated_at := now();
  ELSE
    -- km değişmediyse istemcinin bu sütunu elle değiştirmesine izin verme.
    NEW.mileage_updated_at := OLD.mileage_updated_at;
  END IF;
  RETURN NEW;
END;
$function$;

-- Not: aynı olaydaki BEFORE trigger'lar isim sırasıyla çalışır. Bu trigger
-- ("vehicles_set_...") sürücü koruma trigger'ından ("vehicles_guard_...")
-- SONRA çalışır; yine de guard'a da muafiyet eklenir (aşağıda).
DROP TRIGGER IF EXISTS vehicles_set_mileage_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_set_mileage_updated_at
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION private.set_vehicle_mileage_updated_at();

-- ----------------------------------------------------------------------------
-- Sürücü koruma trigger'ı: mileage_updated_at de sürücünün km güncellemesinin
-- doğal bir parçası olduğu için karşılaştırmadan muaf tutulur. Gövde canlıdaki
-- tanımın birebir aynısıdır; yalnızca "- 'mileage_updated_at'" eklendi.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.guard_vehicle_driver_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF private.get_auth_role() IN ('manager', 'operator') THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'mileage' - 'mileage_updated_at' - 'updated_at' - 'image_position' - 'image_position_x')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'mileage' - 'mileage_updated_at' - 'updated_at' - 'image_position' - 'image_position_x') THEN
    RAISE EXCEPTION 'Yetkisiz işlem: sürücüler yalnızca kilometre ve fotoğraf konumunu güncelleyebilir';
  END IF;

  RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Geriye dönük doldurma: yalnızca kanıtı olan araçlar için. Aracın bugünkü
-- km'sini tam olarak üreten en son görev bitişi / yakıt kaydı varsa onun
-- zamanı yazılır. Kanıt yoksa NULL kalır ("güncelleme tarihi bilinmiyor") —
-- updated_at ile tahmin yapmak yanıltıcı olurdu.
-- Bu UPDATE trigger'ları tetikler ama mileage değişmediği için trigger
-- sütunu OLD değerine (NULL) geri çeker; bu yüzden trigger geçici olarak
-- devre dışı bırakılır.
-- ----------------------------------------------------------------------------
ALTER TABLE public.vehicles DISABLE TRIGGER vehicles_set_mileage_updated_at;

UPDATE public.vehicles v
SET mileage_updated_at = ev.at
FROM (
  SELECT vehicle_id, max(at) AS at
  FROM (
    SELECT t.vehicle_id, t.end_time AS at
    FROM public.vehicle_tasks t
    JOIN public.vehicles vv ON vv.id = t.vehicle_id
    WHERE t.status = 'completed' AND t.end_time IS NOT NULL AND t.end_km = vv.mileage
    UNION ALL
    SELECT f.vehicle_id, f.fueled_at AS at
    FROM public.fuel_records f
    JOIN public.vehicles vv ON vv.id = f.vehicle_id
    WHERE f.odometer = vv.mileage
  ) s
  GROUP BY vehicle_id
) ev
WHERE v.id = ev.vehicle_id
  AND v.mileage_updated_at IS NULL;

ALTER TABLE public.vehicles ENABLE TRIGGER vehicles_set_mileage_updated_at;
