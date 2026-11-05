import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalList, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_INFO, getDataProcessors } from "@/lib/legal";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";
const DESCRIPTION =
  "CarsTrack'in hangi kişisel verileri, hangi amaçla işlediği, kimlere aktardığı ve 6698 sayılı KVKK kapsamındaki haklarınız.";

export const metadata: Metadata = {
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Gizlilik Politikası ve KVKK Aydınlatma Metni | CarsTrack",
    description: DESCRIPTION,
    url: `${APP_URL}/privacy`,
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Gizlilik Politikası" }],
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Gizlilik Politikası ve KVKK Aydınlatma Metni" description={DESCRIPTION}>
      <LegalSection title="1. Veri sorumlusu ve rollerimiz">
        <p>
          Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) m.10 uyarınca hazırlanmıştır. CarsTrack
          hizmetini sunan <strong className="text-foreground">{LEGAL_INFO.controllerName}</strong> ({LEGAL_INFO.address}),
          hesap ve hizmet kullanımına ilişkin verilerde veri sorumlusudur.
        </p>
        <p>
          Şirket hesapları, sürücü ve çalışanlarına ilişkin verileri kendi filo yönetimi amacıyla CarsTrack&apos;e girer.
          Bu verilerde veri sorumlusu ilgili şirkettir; CarsTrack şirket adına veri işleyen olarak hareket eder. Şirketiniz
          tarafından eklendiyseniz haklarınız için öncelikle şirketinize başvurabilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="2. İşlenen kişisel veriler">
        <LegalList
          items={[
            "Hesap: ad soyad, e-posta, şifrenin özeti, rol, departman, profil fotoğrafı, bildirim tercihleri.",
            "Şirket yetkilisi ve iletişim: şirket adı, adres, telefon, e-posta, vergi dairesi ve numarası.",
            "Sürücü: ehliyet numarası, ehliyet sınıfları ve tarihleri, araç atamaları, görev, kilometre ve yakıt kayıtları, trafik cezaları.",
            "Araç: plaka, ruhsat, sigorta ve muayene bilgileri, fotoğraflar, yüklenen belgeler, servis, masraf ve arıza kayıtları.",
            "Kullanım ve teknik: işlem kayıtları, bildirim ve Web Push abonelik bilgileri, geri bildirimler, IP adresi, tarayıcı bilgisi, sunucu ve hata kayıtları.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Amaçlar ve hukuki sebepler">
        <LegalList
          items={[
            "Hesabın açılması ve filo yönetimi hizmetinin sunulması: sözleşmenin kurulması ve ifası (KVKK m.5/2-c).",
            "Sigorta, muayene, bakım ve ehliyet hatırlatmaları ile hizmet bildirimleri: sözleşmenin ifası (m.5/2-c).",
            "Güvenlik, hata giderme, yedekleme, kötüye kullanımın önlenmesi ve hizmetin geliştirilmesi: meşru menfaat (m.5/2-f).",
            "Yasal yükümlülüklerin yerine getirilmesi ve uyuşmazlıklarda hakların korunması: m.5/2-ç ve m.5/2-e.",
          ]}
        />
        <p>
          Verileriniz, form ve yüklemeler aracılığıyla sizden veya şirket yetkilinizden; teknik kayıtlar ise hizmeti
          kullanırken otomatik yollarla toplanır.
        </p>
      </LegalSection>

      <LegalSection title="4. Aktarımlar ve yurt dışı">
        <p>
          Kişisel verilerinizi satmıyoruz. Verileriniz, hizmetin çalışması için aşağıdaki hizmet sağlayıcılarına aktarılır
          ve bu sağlayıcıların sistemleri nedeniyle <strong className="text-foreground">yurt dışında işlenir</strong>:
        </p>
        <div className="space-y-2">
          {getDataProcessors().map((processor) => (
            <div key={processor.name} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="font-semibold text-foreground">{processor.name}</p>
              <p>{processor.purpose}</p>
              <p className="text-xs">{processor.location}</p>
            </div>
          ))}
        </div>
        <p>
          Yetkili kurum ve mahkemelerin hukuka uygun talepleri halinde de aktarım yapılabilir. Yurt dışı aktarımların
          dayanağı ve güvenceleri (KVKK m.9) hakkında bilgi almak için bize başvurabilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="5. Belgelerin yapay zekâ ile okunması">
        <p>
          &quot;Otomatik doldur&quot; özelliğini kullandığınızda ruhsat, sigorta, ehliyet veya ceza görseli, alanların
          okunması için Google Gemini&apos;ye gönderilir. Bu belgeler T.C. kimlik numarası veya fotoğraf gibi bilgiler
          içerebilir. Özellik isteğe bağlıdır; alanları elle de doldurabilirsiniz. Gönderilen görsel, ayrıca belge olarak
          eklemediğiniz sürece CarsTrack&apos;te saklanmaz. Sonuçlar hatalı olabilir, kaydetmeden önce kontrol edin. Bu
          işlem sizin adınıza hukuki sonuç doğuran otomatik bir karar üretmez.
        </p>
      </LegalSection>

      <LegalSection title="6. Saklama süresi ve silme">
        <LegalList
          items={[
            "Veriler, hesabınız veya şirket hesabı açık olduğu sürece ve yasal saklama süreleri boyunca tutulur.",
            "Ayarlar bölümünden hesabınızı kapattığınızda giriş erişiminiz hemen kapanır; kalıcı silme talebiniz ekibimizce elle işlenir ve en geç 30 gün içinde sonuçlandırılır.",
            "Şirketin tek yöneticisi hesabını kapatmadan önce başka bir yönetici atamalı veya bizimle iletişime geçmelidir.",
            "Silinen veriler, yedeklerin saklama süresi dolana kadar (Supabase'de en fazla 60 gün) yedeklerde kalabilir.",
          ]}
        />
      </LegalSection>

      <LegalSection id="cerezler" title="7. Çerezler ve tarayıcı depolama">
        <p>
          Reklam veya pazarlama çerezi kullanmıyoruz. Oturumunuzu sürdürmek için zorunlu kimlik doğrulama çerezleri, dil ve
          tema gibi tercihleriniz için tarayıcı depolaması kullanılır. Uygulama, bildirimler için tarayıcınızda bir service
          worker çalıştırır. Vercel Analytics ve Speed Insights, ziyaret ve performans ölçümünü çerez
          kullanmadan yapar.
        </p>
      </LegalSection>

      <LegalSection title="8. Güvenlik">
        <p>
          Bağlantılar HTTPS ile korunur; şirket verileri veritabanı düzeyinde birbirinden ayrılır, erişim rollere göre
          sınırlandırılır ve şifreler özetlenerek saklanır. Hiçbir sistem mutlak güvenlik sağlayamaz; bir ihlal olması
          halinde mevzuatın gerektirdiği bildirimler yapılır.
        </p>
      </LegalSection>

      <LegalSection title="9. E-posta ve bildirimler">
        <p>
          Bakım hatırlatmaları, hesap işlemleri, kurulum hatırlatmaları, geri bildirim istekleri ve ürün duyuruları
          gönderebiliriz. E-posta ve anlık bildirim tercihlerinizi Ayarlar bölümünden değiştirebilirsiniz; güvenlik veya
          hizmetin kullanımı için zorunlu duyurular bu tercihlerden bağımsız olarak iletilebilir.
        </p>
      </LegalSection>

      <LegalSection title="10. KVKK kapsamındaki haklarınız">
        <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>
        <LegalList
          items={[
            "Verilerinizin işlenip işlenmediğini öğrenme ve bilgi talep etme",
            "İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme",
            "Aktarıldığı yurt içi ve yurt dışındaki üçüncü kişileri bilme",
            "Eksik veya yanlış işlenmişse düzeltilmesini, şartları oluştuğunda silinmesini veya yok edilmesini isteme ve bu işlemlerin aktarılan kişilere bildirilmesini talep etme",
            "Münhasıran otomatik analiz sonucu aleyhinize çıkan sonuca itiraz etme",
            "Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme",
          ]}
        />
        <p>
          Başvurunuzu kimliğinizi doğrulayan bilgilerle {LEGAL_INFO.contactEmail} adresine, {LEGAL_INFO.kepAddress} KEP
          adresine veya {LEGAL_INFO.address} adresine yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde
          sonuçlandırılır. Sonuçtan memnun kalmazsanız Kişisel Verileri Koruma Kurulu&apos;na şikâyette bulunabilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="11. Değişiklikler">
        <p>
          Bu metni güncelleyebiliriz; güncel hali her zaman bu sayfadadır ve önemli değişiklikleri ayrıca duyururuz. Hizmet
          şartları için{" "}
          <Link href="/kullanim-kosullari" className="font-semibold text-primary hover:underline">
            Kullanım Koşulları
          </Link>
          &apos;na bakın.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
