# Veritabanı Yedekleme

Supabase'in ücretsiz planında otomatik yedekleme yoktur (yalnızca ücretli Pro planda var). Bu yüzden kendi yedekleme sistemimiz var: `src/app/api/cron/db-backup/route.ts`.

## Nasıl çalışır

- Her gün **02:00 UTC** (Türkiye saatiyle 05:00) Vercel Cron bu uç noktayı çağırır (bkz. `vercel.json`).
- Route, `public` şemasındaki tüm tabloları (`companies`, `vehicles`, `service_records`, ... — tam liste route dosyasının başında) tek tek okuyup tek bir JSON'a toplar.
- JSON gzip ile sıkıştırılıp Supabase'in **`db-backups`** adlı özel (private) depolama alanına `backups/YYYY-MM-DD.json.gz` olarak yazılır. Bu bucket'a yalnızca `service_role` anahtarı erişebilir — normal kullanıcılar (anon/authenticated) göremez.
- 30 günden eski yedekler otomatik silinir (depolama alanı şişmesin diye).
- Yedek başarıyla alındığında `BACKUP_NOTIFY_EMAIL` adresine (tanımlı değilse `mehmetdemirkok@gmail.com`'a) bilgilendirme e-postası gider. **Dosya e-postaya eklenmez** — e-posta yalnızca yedeğin alındığını, tablo/satır sayısını ve Supabase depolamadaki konumunu bildirir; asıl kopya yalnızca Supabase'in `db-backups` bucket'ında durur. Yedekleme başarısız olursa ayrı bir uyarı e-postası gider.

Not: Bu bir **veri** yedeğidir, şema (tablo yapıları) yedeği değil. Şema zaten `supabase/migrations/` altında Git ile versiyonlanıyor — geri yükleme sırasında önce migration'lar çalıştırılır, sonra veri geri yüklenir.

## Geri yükleme (restore)

1. **Dosyayı bul:** Supabase Dashboard → Storage → `db-backups` → `backups/` klasöründen ilgili tarihli `.json.gz` dosyasını indirin (e-postaya dosya eklenmez, e-posta yalnızca bildirim amaçlıdır).
2. **Aç:** `gunzip carstrack-backup-YYYY-MM-DD.json.gz` (veya herhangi bir arşiv programıyla) → içinde `{"generatedAt": ..., "tables": {"tabloAdi": [...satırlar...]}}` şeklinde bir JSON bulacaksınız.
3. **Hedef veritabanını hazırla:** Yeni/boş bir Supabase projesindeyseniz önce `supabase/migrations/` altındaki tüm dosyaları sırayla çalıştırın (Supabase CLI: `supabase db push`, ya da SQL Editor'de tek tek).
4. **Veriyi geri yaz:** Küçük bir script ile (Node.js + `@supabase/supabase-js`, service role anahtarıyla) her tablo için JSON'daki satırları `.insert()` ile yazın. Foreign key hatası almamak için tabloları bağımlılık sırasına göre yazın (örn. `companies` → `profiles` → `vehicles` → geri kalanlar). Bu script hazır değildir; ihtiyaç anında Claude'dan (veya bir geliştiriciden) "şu tarihli yedeği şu projeye geri yükle" diye istemeniz yeterli — mevcut yedek formatına göre birkaç dakikada yazılabilir.

## Ayarları değiştirmek

- **Sıklık:** `vercel.json` içindeki `db-backup` cron'unun `schedule` alanı (cron formatı).
- **Saklama süresi:** `route.ts` içindeki `RETENTION_DAYS` (şu an 30 gün).
- **Bildirim e-postası:** `BACKUP_NOTIFY_EMAIL` ortam değişkenini Vercel'de tanımlayın (tanımlı değilse mevcut destek adresine gider).
- **Yeni tablo eklendiğinde:** `route.ts` içindeki `BACKUP_TABLES` dizisine yeni tablo adını eklemeyi unutmayın — aksi halde o tablo yedeklenmez.

## Manuel test

Deploy sonrası tek seferlik manuel tetiklemek isterseniz (CRON_SECRET gerekir):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/db-backup
```
