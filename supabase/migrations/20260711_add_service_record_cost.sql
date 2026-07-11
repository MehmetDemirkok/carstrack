-- Servis kayıtlarına opsiyonel masraf tutarı (TRY) eklenir.
-- Nullable → mevcut kayıtlar etkilenmez, RLS politika değişikliği gerekmez.
ALTER TABLE public.service_records ADD COLUMN IF NOT EXISTS cost numeric NULL;
