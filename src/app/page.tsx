import type { Metadata } from "next";
import LandingClient from "@/components/landing/landing-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
  description:
    "Araçlarınızın bakım takvimi, sigorta ve muayene tarihleri, servis geçmişi ve filo sağlık analizi. Türkiye'nin akıllı araç takip uygulaması ile periyodik bakımları asla kaçırmayın.",
  keywords: [
    "araç bakım takip",
    "araç servis takip",
    "filo yönetim sistemi",
    "araç sigorta muayene takip",
    "periyodik bakım hatırlatıcı",
    "araç masraf yönetimi",
    "servis geçmişi takip",
    "araç bakım programı",
    "filo takip uygulaması",
    "fleet management türkiye",
    "araç bakım uygulaması",
    "carstrack",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "CarsTrack",
    title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
    description:
      "Araçlarınızın bakım takvimi, sigorta ve muayene tarihleri, servis geçmişi ve filo sağlık analizi.",
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Araç Bakım Takip" }],
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
    description: "Araçlarınızın bakım takvimi, sigorta ve muayene tarihlerini tek yerden yönetin.",
    images: [`${APP_URL}/og-image.png`],
  },
};

const faqs = [
  {
    q: "CarsTrack nedir?",
    a: "CarsTrack, araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini, servis kayıtlarını ve filo durumunu dijital ortamda yönetmenizi sağlayan Türkçe bir araç takip uygulamasıdır. Bireysel araç sahiplerinden şirket filolarına kadar her ölçekte kullanılabilir.",
  },
  {
    q: "CarsTrack ücretsiz mi kullanılabilir?",
    a: "Evet, CarsTrack temel özellikleriyle tamamen ücretsiz kullanılabilir. Kayıt olmak için kredi kartı gerekmez.",
  },
  {
    q: "Kaç araç ekleyebilirim?",
    a: "İstediğiniz kadar araç ekleyebilir ve tüm araçlarınızı tek panelden yönetebilirsiniz. Araç sayısında herhangi bir kısıtlama yoktur.",
  },
  {
    q: "Mobil cihazlarda kullanılabilir mi?",
    a: "Evet, CarsTrack Progressive Web App (PWA) teknolojisiyle geliştirilmiştir. Telefon ve tabletlerde uygulama gibi çalışır, ana ekrana ekleyerek hızlıca erişebilirsiniz.",
  },
  {
    q: "Araç bakım hatırlatıcısı nasıl çalışır?",
    a: "Her araç için kilometre ve zaman bazlı bakım aralıkları tanımlayabilirsiniz. Son bakım tarihini ve kilometresini girdiğinizde CarsTrack otomatik olarak bir sonraki bakım zamanını hesaplar, yaklaşan ve geciken bakımlar için uyarı verir.",
  },
  {
    q: "Verilerimi dışa aktarabilir miyim?",
    a: "Evet, araç raporlarını ve servis geçmişini PDF ve Excel (XLSX) formatında dışa aktarabilirsiniz. Dilediğiniz zaman verilerinizin tam sahibi sizsiniz.",
  },
];

export default function LandingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CarsTrack",
    url: APP_URL,
    description:
      "Araç bakım takibi, sigorta ve muayene yönetimi, servis geçmişi ve filo analizi.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
    inLanguage: "tr-TR",
    screenshot: `${APP_URL}/og-image.png`,
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CarsTrack",
    url: APP_URL,
    logo: `${APP_URL}/logo.svg`,
    description: "Araç bakım takip ve filo yönetim sistemi",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <LandingClient />
    </>
  );
}
