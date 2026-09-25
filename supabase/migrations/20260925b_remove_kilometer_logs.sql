-- Haftalık km hatırlatıcısı kaldırıldıktan sonra kalan ölü şema.
-- Uygulama artık bu tabloları kullanmıyor (cron, /km-guncelle, API silindi).
-- Araç üzerindeki mileage alanı (vehicles.mileage) AYRI — ona dokunulmaz.
--
-- Storage: storage.objects doğrudan silinemez. Boş `kilometer-photos` bucket'ı
-- canlıda Storage API ile silindi; burada yalnızca policy + bucket kaydı temizlenir.

DROP POLICY IF EXISTS "storage_kilometer_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_kilometer_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_kilometer_photos_delete" ON storage.objects;

DROP TABLE IF EXISTS public.kilometer_log_tokens CASCADE;
DROP TABLE IF EXISTS public.kilometer_logs CASCADE;

-- Obje yoksa bucket kaydı düşürülebilir (Supabase koruması objeye takılır).
DELETE FROM storage.buckets WHERE id = 'kilometer-photos';
