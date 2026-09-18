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

2. **Ortam değişkeni** — yerelde `.env.local`, canlıda Vercel:
   ```
   ADMIN_EMAILS=mehmetdemirkok@gmail.com
   ```
   Virgülle ayrılmış liste kabul eder. Tanımlı değilse sırayla
   `FEEDBACK_INBOX_EMAIL` → `mehmetdemirkok@gmail.com` kullanılır.

3. Kendi hesabınla giriş yap, `/admin` adresine git.

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
| `/admin` | Toplamlar, 30 günlük büyüme grafiği, aktivasyon hunisi, plan/rol kırılımı, son kayıtlar, dikkat listesi (araç eklememiş / uykuda hesaplar) |
| `/admin/users` | Tüm kullanıcılar: arama, rol/şirket/durum filtresi, sıralama, sayfalama, CSV |
| `/admin/users/[id]` | Profil düzenleme, rol değiştirme, askıya alma, e-posta doğrulama, şifre sıfırlama/giriş bağlantısı üretme, kalıcı silme, atanmış araçlar, etkinlik geçmişi |
| `/admin/companies` | Tüm tenant'lar: kullanıcı/araç sayısı, 30 günlük aktivite, sağlık durumu, CSV |
| `/admin/companies/[id]` | Şirket bilgileri/plan düzenleme, ekip, araç listesi, içerik sayaçları, şirketi tüm verisiyle silme |
| `/admin/email` | Duyuru oluşturma: segment seçimi, canlı alıcı sayısı, gerçek şablondan önizleme, kendine test, e-posta + uygulama içi bildirim gönderimi, gönderim geçmişi |
| `/admin/feedback` | Tüm şirketlerden gelen geri bildirimler, durum yönetimi, e-posta ile yanıtlama |
| `/admin/activity` | `audit_logs` (şirket işlemleri) + `admin_audit_log` (panel işlemleri) birleşik zaman çizelgesi |
| `/admin/system` | Ortam değişkeni sağlık kontrolü, cron'ları elle çalıştırma, DB yedekleri, tablo satır sayıları |

Üst çubuktaki global arama kullanıcı (ad/e-posta), şirket (ad) ve araç (plaka)
üzerinde çalışır.

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
