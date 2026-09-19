# Süper Admin Konsolu (`/admin`)

Tüm tenant'ları (şirketleri, kullanıcıları, içeriği) tek yerden gören ve
yöneten, **yalnızca uygulama sahibine açık** panel. Kiracı uygulamasından
tamamen ayrıdır: kendi kabuğu, kendi API yüzeyi, kendi denetim kaydı vardır.

## Kurulum

1. **Migration'ı çalıştır** — Supabase SQL Editor'da:
   `supabase/migrations/20260918_admin_panel.sql`
   İki tablo oluşturur: `admin_audit_log` (panelden yapılan her işlem) ve
   `admin_email_log` (gönderilen duyurular). İkisi de yalnızca service-role
   erişimlidir (RLS açık, policy yok — bkz. `20260917_service_role_only_tables.sql`).

   > Migration çalıştırılmadan da panel açılır ve çalışır; yalnızca denetim
   > kaydı ve gönderim geçmişi boş kalır (kod `try/catch` ile sessizce geçer).

2. **İkinci migration'ı çalıştır** —
   `supabase/migrations/20260919_admin_panel_v2.sql`
   Dört tablo (`cron_runs`, `admin_notes`, `admin_email_queue`, `app_settings`)
   ve iki depolama görünümü (`admin_vehicle_weights`, `admin_company_weights`)
   ekler. İlk üç tablo yine yalnızca service-role erişimlidir; `app_settings`
   istisnadır — bakım bandını kiracı uygulaması da okuduğu için SELECT'e açıktır,
   yazma service-role'dedir.

   > Bu migration olmadan da panel açılır: cron geçmişi, notlar, kuyruk ve
   > depolama panelleri "tablo yok" uyarısı gösterir, geri kalan her şey çalışır.

3. **Ortam değişkeni** — yerelde `.env.local`, canlıda Vercel:
   ```
   ADMIN_EMAILS=mehmetdemirkok@gmail.com
   ```
   Virgülle ayrılmış liste kabul eder. Tanımlı değilse sırayla
   `FEEDBACK_INBOX_EMAIL` → `mehmetdemirkok@gmail.com` kullanılır.

4. Kendi hesabınla giriş yap, `/admin` adresine git.

## Yetkilendirme — üç bağımsız katman

Yetki **veritabanında tutulmaz**. Böylece bir RLS açığı veya ele geçirilmiş
yönetici hesabı kendini admin yapamaz.

| Katman | Dosya | Ne yapar |
|---|---|---|
| Erken çıkış | `src/proxy.ts` | Cookie'deki JWT'den `email` claim'ini okur, listede değilse `/dashboard`'a atar. **İmza doğrulamaz — güvenlik sınırı değildir**, sadece hızlı yönlendirmedir. |
| Sayfa kapısı | `src/app/admin/layout.tsx` | `getSuperAdmin()` → Supabase `getUser()` ile doğrulatır. Yetkisizse `notFound()` (403 değil 404 — panelin varlığı sızdırılmaz). |
| API kapısı | `src/lib/admin/api.ts` → `withAdmin()` | Her `/api/admin/*` ucu bağımsız olarak aynı kontrolü tekrarlar. Service-role istemcisi guard'ın **dışında** hiç oluşturulmaz. |

`/api/admin/*` yolları proxy matcher'ının dışındadır (`api` hariç tutulur);
korumaları tamamen `withAdmin`'dendir.

## Sayfalar

| Yol | İçerik |
|---|---|
| `/admin` | Toplamlar, son 7 günde üretilen içerik, 30 günlük büyüme grafiği, haftalık kohortlar, aktivasyon hunisi, rol kırılımı, son kayıtlar, dikkat listesi (araç eklememiş / uykuda hesaplar) |
| `/admin/users` | Tüm kullanıcılar: arama, rol/şirket/durum filtresi, sıralama, sayfalama, CSV |
| `/admin/users/[id]` | Profil düzenleme, rol değiştirme, askıya alma, e-posta doğrulama, şifre sıfırlama/giriş bağlantısı üretme, kalıcı silme, atanmış araçlar, etkinlik geçmişi, destek notları |
| `/admin/companies` | Tüm tenant'lar: kullanıcı/araç sayısı, 30 günlük aktivite, sağlık durumu, CSV |
| `/admin/companies/[id]` | Şirket bilgileri düzenleme, ekip, araç listesi, içerik sayaçları, destek notları, şirketi tüm verisiyle silme |
| `/admin/vehicles` | Tüm filo: plaka/marka/şirket/sürücü araması, belge durumu filtresi, sıralama, sayfalama |
| `/admin/vehicles/[id]` | Aracın künyesi, sürücüleri, belgeleri, servis/sefer/yakıt/ceza/arıza geçmişi, destek notları |
| `/admin/invites` | Tüm şirketlerin ekip davetleri: bekleyen/süresi geçmiş/kabul/iptal, daveti iptal etme |
| `/admin/email` | Duyuru oluşturma: segment seçimi, canlı alıcı sayısı, gerçek şablondan önizleme, kendine test, e-posta + uygulama içi bildirim gönderimi, kuyruk/zamanlama, gönderim geçmişi |
| `/admin/feedback` | Tüm şirketlerden gelen geri bildirimler, durum yönetimi, e-posta ile yanıtlama |
| `/admin/activity` | `audit_logs` + `admin_audit_log` birleşik zaman çizelgesi; güne göre gruplu, şirket/işlem/tarih/arama filtreli, CSV |
| `/admin/system` | Global duyuru bandı, depolama baskısı, cron sağlığı ve elle çalıştırma, eksik ortam değişkenleri, DB yedekleri, tablo satır sayıları + son 7 gün artışı |

Üst çubuktaki global arama kullanıcı (ad/e-posta), şirket (ad) ve araç (plaka)
üzerinde çalışır; araç sonucu doğrudan araç sayfasını açar.

## Destek notları

Kullanıcı, şirket ve araç detaylarındaki not paneli `admin_notes`'a yazar.
Notlar **yalnızca bu panelde** görünür (tablo service-role'e kapalıdır) ve
hedefe FK ile bağlı DEĞİLDİR: şirket silinse bile "neden sildik" notu kalsın
diye.

## Cron sağlığı

`src/lib/cron/record.ts` içindeki `withCronLogging` her cron'un GET'ini sarar:
gövdeye dokunmadan süreyi ölçer, yanıtı okur ve `cron_runs` tablosuna yazar.
`/admin/system` her iş için son çalışma, süre ve 7 günlük hata sayısını gösterir
— önceden otomatik çalışmaların sonucu hiçbir yere yazılmıyordu, sessizce
patlayan bir cron fark edilmezdi. Panelden elle tetiklenen çalışmalar
`x-admin-manual-run` başlığı sayesinde `manual` olarak ayrılır.

## Depolama

Araç fotoğrafları `vehicle-documents` bucket'ına taşındı, ama taşıma geriye
dönük uyumlu: eski satırlar hâlâ base64 data-URI taşıyor olabilir ve db-backup'ın
`vehicles` tablosunu 5'erli sayfalarla okumasının sebebi bu kalıntı.
`/admin/system` → Depolama paneli kaç aracın hâlâ satır içi fotoğraf taşıdığını
ve bucket kullanımını gösterir. Bayt hesabı `admin_vehicle_weights` /
`admin_company_weights` view'larında, SQL tarafında yapılır — satırları panele
çekip JS'te ölçmek aynı Gateway Timeout'ları üretirdi.

## Uygulama bandı

`app_settings.banner` tüm kiracıların üstünde görünen global duyuruyu tutar;
`/admin/system` üzerinden açılır/kapatılır ve her değişiklik denetime yazılır.
Kiracı tarafında `src/components/layout/app-banner.tsx` gösterir — okuma
başarısız olursa bant hiç çıkmaz, uygulama akışını asla engellemez.

## E-posta gönderimi

**Segmentler** (`src/lib/admin/recipients.ts`): tüm kullanıcılar, şirket
yetkilileri, operatörler, sürücüler, belirli şirket, 30+ gündür pasif olanlar,
hiç giriş yapmamışlar, araç eklememiş şirketler.

Alıcı çözümlemesinde:
- Adresi olmayan veya doğrulanmamış hesaplar **her zaman** elenir.
- `profiles.notify_by_email = false` diyenler elenir — panelde bu sayı ayrıca
  gösterilir. "Zorunlu duyuru" kutusu işaretlenirse tercihe bakılmaz
  (güvenlik/fiyat/kesinti duyuruları için).
- Aynı adres birden fazla profile bağlıysa tek kez gönderilir.

**Gönderim** `src/lib/email/sendEmail.ts → sendAdminBroadcastEmail` üzerinden,
yani retry + log + Reply-To + List-Unsubscribe tutarlılığıyla yapılır. Alıcı
başına ayrı çağrı yapılır (herkes kendi adıyla selamlansın ve alıcılar
birbirini görmesin diye), Resend'in saniyede 2 istek sınırına uymak için
partiler arasında beklenir — 500 alıcı ≈ 4 dakika.

Bu süre tek fonksiyon çağrısına sığmadığı için gönderimin iki yolu var:

1. **Doğrudan gönderim** (`/api/admin/email/send`) — parçalıdır: uç 45 sn'lik
   bütçesi dolunca kalan alıcıları `remaining` ile döndürür, panel aynı uca
   `resumeUserIds` ile devam eder ve onay düğmesinde ilerlemeyi gösterir.
   Fonksiyon hiçbir planda ortada öldürülmez. Her parça `admin_email_log`'a
   kendi satırını yazar. Tarayıcının açık kalması gerekir.

2. **Kuyruk** (`/api/admin/email/queue`) — duyuru `admin_email_queue`'ya
   yazılır, `email-queue-drain` cron'u (5 dakikada bir) parça parça boşaltır.
   Tarayıcı kapatılabilir, `scheduled_at` ile ileri bir saate bırakılabilir.
   Alıcı listesi kuyruğa alınırken çözülüp satıra yazılır: segment sonradan
   değişse bile duyuru kime söz verildiyse ona gider. Gönderilen alıcılar
   `pending_ids`'ten düşüldüğü için kimse iki kez almaz.

Gövde **düz metindir**: boş satır paragraf ayırır, `- ` ile başlayan satır
madde olur. HTML bilinçli olarak kabul edilmez.

**Uygulama içi duyuru** (`/api/admin/notify`) `notifications` tablosuna yazar;
bildirim tercihine bakmaz çünkü uygulama içi zil her zaman çalar (bkz.
`src/lib/notify.ts`).

## Cron'ları elle çalıştırma

`/admin/system` → "Çalıştır". `CRON_SECRET` sunucu tarafında eklenir, tarayıcıya
asla gitmez. Yalnızca `src/lib/admin/crons.ts` içindeki tanımlı yollar
çağrılabilir (SSRF'e kapalı allow-list). **Bu işler gerçek e-posta gönderir.**

`src/lib/admin/crons.ts` ile `vercel.json` elle senkron tutulur — yeni bir cron
eklenirse iki dosyaya da yazılmalıdır.

## Ölçek notu

Kullanıcı ve şirket listelerinde filtreleme/sıralama **bellekte** yapılır.
Sebebi mimaridir, tembellik değil: e-posta ve son giriş bilgisi `auth.users`
tablosunda, geri kalan her şey `profiles`/`companies` tablosunda ve PostgREST
bu ikisini join edemiyor — hangi yaklaşımda olursa olsun iki liste kodda
birleştirilmek zorunda. On binlerce kullanıcıya çıkılırsa bu bir SQL view'a
taşınmalıdır (`src/lib/admin/api.ts` içindeki nota bakın).

## Denetim

Panelden yapılan her değiştirici işlem `admin_audit_log`'a yazılır: kim
(e-posta), ne (aksiyon), neyi (hedef tür/id/etiket), ne zaman ve serbest `meta`.
`/admin/activity` bunu şirketlerin kendi `audit_logs` kayıtlarıyla aynı akışta
gösterir. Özellikle "tek seferlik giriş bağlantısı üretme" işlemi — kullanıcının
oturumunu açabildiği için — her seferinde kayda geçer.
