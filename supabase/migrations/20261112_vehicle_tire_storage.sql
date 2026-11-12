-- Sökülen (araçta takılı olmayan) lastik takımının nerede saklandığı.
-- Mevsimlik lastik değişiminde doldurulur, Lastik sekmesinde gösterilir.
-- Yalnızca boş (NULL) sütun ekler; mevcut satırlara ve verilere dokunmaz.
-- RLS: vehicles tablosunun mevcut politikaları bu sütunları da kapsar.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS stored_tire_season    text,  -- Saklanan takımın mevsimi (Yazlık / Kışlık / Dört Mevsim)
  ADD COLUMN IF NOT EXISTS tire_storage_location text,  -- Lastik otelinde / Firma deposunda / Araçta / bagajda ...
  ADD COLUMN IF NOT EXISTS tire_storage_note     text;  -- Saklayan firma / adres (örn. lastikçinin adı)
