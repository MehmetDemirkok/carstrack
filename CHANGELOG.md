# Sürüm Geçmişi

> Bu dosya `src/data/changelog.json` dosyasından otomatik üretilir — elle düzenlemeyin.
> Yeni sürüm için: `npm run release -- <patch|minor|major> "Başlık"` (bkz. CLAUDE.md > Sürümleme).

## v1.4.0 — 2026-11-23

**Yeni araç formu yenilendi**

### Yeni

- Yeni araç formunda "Bakım durumu" sorusu eklendi: sıfır araç, son bakımı biliyorum (tarih, km ve yapılan kalemler) veya bilmiyorum. İkinci el araçlar artık bakım uyarısı almadan "kusursuz" görünmüyor.
- Formun en üstünden ruhsatı okutup plaka, marka, model, yıl ve şasi no alanlarını otomatik doldurabilirsiniz; ruhsat aracın belgelerine de eklenir.
- Belgeden okunan bilgiler forma yazılmadan önce listeleniyor: boş alanlar işaretli, sizin girdiğinizden farklı olanlar işaretsiz geliyor; yazdıklarınızın üzerine sessizce yazılmıyor.
- Araç kaydedildikten sonra açılan ekrandan hemen sürücü atanabiliyor, araç detayına gidilebiliyor veya yeni araç eklenebiliyor.

### İyileştirme

- Form 3 adıma indi: Temel bilgiler, Belgeler, Ek bilgiler. Kilometre, yakıt ve vites artık ilk adımda ve zorunlu; eksik alanlar düğmenin üstünde yazıyor.
- Sigorta, muayene ve kasko her biri kendi kartında; poliçeyi ilgili tarihin yanına ekleyip "Belgeden oku" ile yalnızca o belgeyi okutabilirsiniz.
- Marka listesine Togg, MG, BYD, Chery, Cupra, Mazda, Mitsubishi, Suzuki, Jeep, Isuzu, Iveco, Mini, Porsche, Land Rover, Lexus, Subaru, Alfa Romeo ve DS eklendi; listede olmayan marka da yazılabiliyor.
- Plaka biçimi, model yılı, şasi numarası ve geçmiş bitiş tarihleri için uyarılar gösteriliyor.

### Düzeltme

- Listede olmayan marka yazıldığında araç "Diğer" markasıyla kaydediliyordu; artık yazılan marka kaydediliyor.
- Kayıtlı bir plaka belge okuma veya taslak yoluyla gelirse araç yine de kaydedilebiliyordu; artık kayıt anında da kontrol ediliyor.
- Renk, yakıt, vites gibi alanlar doldurulmadan geçildiğinde "Beyaz", "Benzin", "Otomatik" gibi varsayılanlar gerçek bilgi gibi kaydediliyordu; artık yakıt ve vites seçtiriliyor, renk boş kalıyor, lastik mevsimi tarihe göre tahmin ediliyor.
- Kasko poliçesinden okunan bitiş tarihi trafik sigortası tarihinin yerine yazılabiliyordu; artık kasko alanlarına yazılıyor.
- Kayıt hatasında teknik İngilizce mesaj yerine anlaşılır bir Türkçe mesaj gösteriliyor; yüklenemeyen belge varsa ayrıca bildiriliyor.

## v1.3.0 — 2026-11-23

**Araç listesinde toplu işlemler ve akıllı arama**

### Yeni

- Araçlarım'da seçim modunda "Tümünü seç" eklendi; arama ve filtreyle daraltıp yalnızca görünen araçları tek dokunuşla seçebilirsiniz.
- Seçili araçlar tek seferde bir sürücüye atanabiliyor. Araçların mevcut sürücüleri korunuyor, sürücüye araç başına değil tek bir özet bildirim gidiyor.
- Seçili araçlara standart periyodik bakım şablonu uygulanabiliyor: yalnızca eksik bakım kalemleri ekleniyor, mevcut kalemlere dokunulmuyor.
- Yalnızca seçili araçlar Excel'e aktarılabiliyor.
- Sigorta veya muayene tarihi girilmemiş araçlarda "tarihi girilmemiş" uyarısı ve bunları listeleyen "Eksik bilgi" filtresi eklendi.

### İyileştirme

- Araç aramasında plaka boşluklu ya da boşluksuz yazılabiliyor ("34ABC123" ile "34 ABC 123" bulunuyor); şasi numarası ve atanmış sürücü adıyla da arama yapılabiliyor.
- Arama ve filtre seçimi araç detayından geri dönünce korunuyor ve sayfa bağlantısıyla paylaşılabiliyor.
- Kalabalık filolarda araç kartları çok daha hızlı beliriyor.
- Aramayla eşleşen araç yoksa "Filtreyi temizle" düğmesi çıkıyor.

### Düzeltme

- Araçlar bağlantı sorunu nedeniyle yüklenemediğinde artık boş filo ekranı yerine hata mesajı ve "Tekrar Dene" düğmesi gösteriliyor.

## v1.2.0 — 2026-11-22

**Telefon numarası**

### Yeni

- Kayıt formunda cep telefonu numarası isteniyor. Doğrulama kodu gönderilmiyor; numara yalnızca iletişim için tutuluyor.
- Ayarlar > Profil bölümüne telefon alanı eklendi. Numarasını girmemiş mevcut kullanıcılara profil tamamlama kartı, pano bandı ve profil hatırlatması üzerinden soruluyor.
- Ekip sayfasında üyelerin telefon numarası görünüyor, dokununca aranabiliyor; ekip aramasında numarayla da bulunabiliyor.

### İyileştirme

- Gizlilik Politikası ve KVKK Aydınlatma Metni'ne telefon numarasının hangi amaçla tutulduğunu, kimlerin görebildiğini ve pazarlama için kullanılmadığını anlatan bölüm eklendi; Kullanım Koşulları güncellendi.
- "Verilerimi indir" dosyasında telefon numarası da yer alıyor.

## v1.1.0 — 2026-11-22

**Ayarlar sayfası iyileştirmeleri**

### Yeni

- Uygulama sürümü, yayın kimliği ve sürüm notları Ayarlar > Hakkında bölümünde görünüyor.
- Anlık bildirim alan cihazlar listeleniyor; başka bir cihazın aboneliği uzaktan kaldırılabiliyor.
- Ekip davet kodu link, WhatsApp, cihaz paylaşım menüsü ve QR kod ile paylaşılabiliyor; linki açan kişi kayıt ekranına kod dolu geliyor.
- Hesap bölümünde son giriş zamanı ve üyelik tarihi görünüyor.

### İyileştirme

- Ayarlar sayfası klavye ve ekran okuyucuyla kullanılabilir: satırlar Enter/Boşluk ile çalışıyor, form etiketleri alanlara bağlı, anahtarlar doğru duyuruluyor.
- Tanıtım sitesi bağlantısı kenar çubuğundan kaldırıldı; Ayarlar > Uygulama altında "CarsTrack Web Sitesi" olarak yer alıyor.
- Tema seçimi Açık / Koyu / Sistem olarak üç seçenekli hale geldi.
- Profil fotoğrafları veritabanı satırı yerine dosya deposunda (Storage) saklanıyor; sayfalar daha hafif yükleniyor.
- Şirketin tek yöneticisi hesap silme penceresini açtığında engel baştan gösteriliyor.
- "Telefon Bildirimleri" adı, masaüstü tarayıcıları da kapsadığı için "Anlık Bildirimler" oldu.

### Düzeltme

- Departman kaydedildiğinde profil tamamlama kartı ve banner sayfa yenilenmeden güncelleniyor.
- Hesabını silen kullanıcı artık ekipten çıkarılmış gibi pasifleştiriliyor: araç atamaları ve push abonelikleri temizleniyor, hatırlatma almıyor.

## v1.0.0 — 2026-11-15

**Kararlı sürüm: lastik, km takibi, ekip yönetimi ve PWA**

### Yeni

- Araç detayına Lastik sekmesi: mevsimlik değişim, saklanan lastikler, araç şeması ve lastik geçmişi.
- Km takibi yenilendi: tek güncelleme akışı, km güncelleme tarihi, hatalı km uyarıları ve 7 gün eski km hatırlatması.
- Ekip sayfası yenilendi; üye pasifleştirme (geri alınabilir) ve profil tamamlama hatırlatması.
- Gizlilik/KVKK metni, Kullanım Koşulları, kayıt onayı; Sentry hata izleme ve dış (S3) yedek kopyası.

### İyileştirme

- PWA yeni yayın çıktığında kendini güncelliyor; mobil ve PWA görünümü düzeltildi.

### Düzeltme

- Zaten kayıtlı bir e-postaya mükerrer davet gönderilmesi engellendi.

## v0.7.0 — 2026-10-25

**Uyarı Merkezi ve geri bildirim sayfası**

### Yeni

- Uyarı Merkezi sayfası; günlük filo raporu kritik uyarılara yönlendiriyor.
- Geri bildirim popup'ı ayrı bir sayfaya dönüştü; admin duyurularına Web Push eklendi.
- Oturum açıkken tanıtım sitesine erişim (?tanitim=1) ve giriş sonrası hedef sayfaya dönüş.

### İyileştirme

- Aktivite kayıtları Türkçeleştirildi; landing sayfasına yeni bölümler eklendi.

### Düzeltme

- Hesap değişince push aboneliği yeni kullanıcıya bağlanıyor.

## v0.6.0 — 2026-09-20

**Yakıt yönetimi, süper admin konsolu ve ücretsiz ürün**

### Yeni

- Yakıt Yönetimi modülü: alım kaydı, KPI/analiz ve anomali tespiti.
- Süper admin konsolu (/admin): kullanıcılar, şirketler, duyurular, cron sağlığı.
- Aktivasyon akışı: ilk araç kurulumu, şoför davet kartı ve takılan hesap hatırlatıcısı.

### İyileştirme

- Plan/ödeme sistemi kaldırıldı; ürün tüm şirketler için ücretsiz.
- Araç fotoğrafları Storage'a taşındı; tasarım sistemi ve landing yeniden kurgulandı.

## v0.5.0 — 2026-08-30

**Trafik cezaları, yedekleme ve şoför rolü**

### Yeni

- Trafik cezası takibi ve e-Devlet sorgulama butonu.
- Otomatik veritabanı yedekleme sistemi.
- Şoför rolü, şirket bilgileri düzenleme ve Verilerimi İndir (Excel).

### İyileştirme

- Filo uyarıları şirket saat diliminde 09:00'da; araç ekleme akışı hızlandı.

### Güvenlik

- Bağımlılık güncellemeleri, davet kodu sertleştirme ve rate limit.

## v0.4.0 — 2026-07-14

**Ehliyet takibi ve filo analitiği**

### Yeni

- Sürücü ehliyet bilgileri ve süre takibi.

### İyileştirme

- Dashboard ve filo analitiği güncellendi; taşan arayüz öğeleri düzeltildi.

## v0.3.0 — 2026-06-14

**Belgeler, bildirimler ve güvenlik**

### Yeni

- Araç belgeleri modülü ve e-posta değiştirme.
- E-posta ve telefon (push) bildirimleri; bildirim ekranı.
- Rol sistemi yenilendi; geri bildirim ekranı.

### Güvenlik

- RLS tabanlı güvenlik sertleştirmesi.

## v0.2.0 — 2026-05-14

**Şirket yetkileri, km takibi ve dışa aktarma**

### Yeni

- Şirket yetkileri ve şoför paneli; km takibi.
- Excel/PDF dışa aktarma ve profil fotoğrafı.

### İyileştirme

- Yeni tema; önbellek ve erken oturum açma ile hızlanan veri yükleme.

## v0.1.0 — 2026-05-01

**İlk yayın**

### Yeni

- Araç ekleme/düzenleme/silme, giriş-kayıt ve şifre sıfırlama.
- Resend ile e-posta gönderimi; ilk canlı yayın.
