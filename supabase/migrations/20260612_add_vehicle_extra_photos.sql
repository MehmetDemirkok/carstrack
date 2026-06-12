-- Araç başına ek fotoğraflar (arka, yan vb.). Ana `image` ile birlikte toplamda 4 adet.
-- Fotoğraflar mevcut `image` kolonu gibi base64 data URL olarak saklanır.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS image_2 text,
  ADD COLUMN IF NOT EXISTS image_3 text,
  ADD COLUMN IF NOT EXISTS image_4 text;
