import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalList, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_INFO } from "@/lib/legal";

const DESCRIPTION = "CarsTrack filo yönetim hizmetinin kullanımına ilişkin şartlar, sorumluluklar ve sınırlamalar.";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: DESCRIPTION,
  alternates: { canonical: "/kullanim-kosullari" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalDocument title="Kullanım Koşulları" description={DESCRIPTION}>
      <LegalSection title="1. Taraflar ve kabul">
        <p>
          Bu koşullar, CarsTrack hizmetini sunan {LEGAL_INFO.controllerName} ({LEGAL_INFO.address}) ile hesap oluşturan
          kullanıcı arasında geçerlidir. Bir şirket adına hesap açıyorsanız bu konuda yetkili olduğunuzu beyan edersiniz.
          Hizmeti kullanabilmek için en az 18 yaşında olmalısınız.
        </p>
      </LegalSection>

      <LegalSection title="2. Hizmet">
        <p>
          CarsTrack; araç, servis, belge, görev, yakıt ve trafik cezası kayıtlarını takip etmeye ve hatırlatma almaya yarayan
          çevrimiçi bir filo yönetim aracıdır. Hizmet şu anda ücretsizdir. Özellikleri değiştirebilir, ekleyebilir veya
          kaldırabiliriz. İleride ücretli bir hizmet sunulursa, ücret uygulanmadan önce duyurulur ve kabulünüz alınır.
        </p>
      </LegalSection>

      <LegalSection title="3. Hesap ve şirket sorumlulukları">
        <LegalList
          items={[
            "Doğru bilgi vermek, şifrenizi gizli tutmak ve hesabınızdaki işlemleri takip etmek sizin sorumluluğunuzdadır.",
            "Şirket yöneticisi; davet ettiği kullanıcılardan, verdiği rollerden ve davet kodunun korunmasından sorumludur.",
            "Şirket, sürücü ve çalışanlarına ait girdiği verilerde KVKK kapsamında veri sorumlusudur: ilgili kişileri aydınlatmak, gerekli hukuki sebebe sahip olmak ve talepleri yanıtlamak şirkete aittir.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Veri işleme">
        <p>
          CarsTrack, şirketlerin girdiği kişisel verileri yalnızca hizmeti sunmak, güvenliğini sağlamak ve yasal
          yükümlülükleri yerine getirmek için, uygun teknik ve idari tedbirleri alarak işler. Bu kapsamda{" "}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            Gizlilik Politikası
          </Link>
          &apos;nda listelenen yurt dışındaki alt hizmet sağlayıcılarını kullanır. Şirket hesabı açarak bu sağlayıcıların
          kullanılmasını ve ayrıntıların o metinde güncellenmesini kabul edersiniz.
        </p>
      </LegalSection>

      <LegalSection title="5. Yasak kullanımlar">
        <LegalList
          items={[
            "Hukuka aykırı içerik yüklemek veya üzerinde hakkınız olmayan kişisel verileri girmek",
            "Başka şirketlerin verilerine erişmeye çalışmak, güvenlik önlemlerini aşmak veya hizmeti aksatmak",
            "Hizmeti otomatik araçlarla aşırı yüklemek, tersine mühendislik yapmak veya izinsiz yeniden satmak",
          ]}
        />
        <p>Bu durumlarda hesabı askıya alabilir veya kapatabiliriz.</p>
      </LegalSection>

      <LegalSection title="6. İçerik ve fikri mülkiyet">
        <p>
          Girdiğiniz veriler size veya şirketinize aittir; hizmeti sunabilmemiz için bunları işleme iznini vermiş olursunuz.
          CarsTrack yazılımı, tasarımı ve markası üzerindeki haklar saklıdır.
        </p>
      </LegalSection>

      <LegalSection title="7. Hatırlatmalar ve otomatik okuma">
        <p>
          Sigorta, muayene, bakım, ehliyet ve ceza hatırlatmaları yardımcı niteliktedir; girilen verilere, e-posta ve anlık
          bildirim altyapısına bağlıdır, gecikebilir veya ulaşmayabilir. Yasal süreleri ve ödemeleri takip etmek sizin
          sorumluluğunuzdadır. Yapay zekâ ile okunan belge bilgileri hatalı olabilir, kaydetmeden önce kontrol edin. Üçüncü
          taraf bağlantıları (örneğin TÜVTÜRK randevu sayfası) kendi şartlarına tabidir.
        </p>
      </LegalSection>

      <LegalSection title="8. Hizmetin sürekliliği ve sorumluluk">
        <p>
          Hizmet &quot;olduğu gibi&quot; sunulur; kesintisiz veya hatasız çalışacağı garanti edilmez. Yedek alınır ancak
          yedeklerin her veri kaybını önleyeceği garanti edilmez; önemli kayıtlarınızın kopyasını ayrıca saklamanızı öneririz.
          Mevzuatın izin verdiği ölçüde; dolaylı zararlardan, kâr kaybından ve kaçırılan süre veya hatırlatmaların
          sonuçlarından sorumlu değiliz. Kast, ağır kusur ve emredici tüketici mevzuatından doğan sorumluluk ve haklar
          saklıdır.
        </p>
      </LegalSection>

      <LegalSection title="9. Fesih">
        <p>
          Hesabınızı istediğiniz zaman Ayarlar bölümünden kapatabilirsiniz. Şirketin tek yöneticisi bunun için önce yeni bir
          yönetici atamalı veya bizimle iletişime geçmelidir. Hizmeti tümüyle sonlandırmamız halinde verilerinizi
          alabilmeniz için makul bir süre önce duyuru yaparız. Verilerin silinmesi Gizlilik Politikası&apos;na tabidir.
        </p>
      </LegalSection>

      <LegalSection title="10. Değişiklikler, hukuk ve iletişim">
        <p>
          Bu koşulları güncelleyebiliriz; önemli değişiklikleri yürürlükten önce duyururuz. Değişiklikten sonra kullanmaya
          devam etmek güncel koşulların kabulü anlamına gelir. Koşullara Türk hukuku uygulanır; uyuşmazlıklarda{" "}
          {LEGAL_INFO.courtCity} mahkemeleri ve icra daireleri yetkilidir. Tüketicilerin kanundan doğan tüketici hakem heyeti
          ve mahkemelerine başvuru hakları saklıdır. İletişim: {LEGAL_INFO.contactEmail}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
