import type { Metadata } from "next";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const SITE_NAME = "CarsTrack";

/** Primary Turkish keywords for fleet / vehicle maintenance niche. */
export const PRIMARY_KEYWORDS = [
  "araç bakım takip",
  "filo yönetim sistemi",
  "araç servis takip",
  "sigorta muayene takip",
  "periyodik bakım hatırlatıcı",
  "araç masraf yönetimi",
  "filo takip uygulaması",
  "araç bakım programı",
  "servis geçmişi takip",
  "fleet management türkiye",
] as const;

export const DEFAULT_DESCRIPTION =
  "Araç bakım takibi, sigorta ve muayene hatırlatıcıları, servis geçmişi ve filo analitiği. Türkiye'de ücretsiz filo yönetim sistemi — CarsTrack.";

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false, noimageindex: true },
};

export const indexRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return APP_URL;
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    keywords: keywords ?? [...PRIMARY_KEYWORDS],
    alternates: { canonical: path },
    robots: noIndex ? noIndexRobots : indexRobots,
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: "tr_TR",
      images: [
        {
          url: absoluteUrl("/og-image.png"),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/og-image.png")],
    },
  };
}

export type FaqItem = { q: string; a: string };

export const LANDING_FAQS: FaqItem[] = [
  {
    q: "CarsTrack nedir?",
    a: "CarsTrack, araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini, servis kayıtlarını ve filo durumunu dijital ortamda yönetmenizi sağlayan Türkçe bir araç bakım takip ve filo yönetim sistemidir. Bireysel araç sahiplerinden şirket filolarına kadar her ölçekte kullanılabilir.",
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
    a: "Evet, CarsTrack Progressive Web App (PWA) teknolojisiyle geliştirilmiştir. Telefon ve tabletlerde uygulama gibi çalışır; ana ekrana ekleyerek hızlıca erişebilirsiniz.",
  },
  {
    q: "Araç bakım hatırlatıcısı nasıl çalışır?",
    a: "Her araç için kilometre ve zaman bazlı bakım aralıkları tanımlayabilirsiniz. Son bakım tarihini ve kilometresini girdiğinizde CarsTrack bir sonraki bakım zamanını hesaplar; yaklaşan ve geciken bakımlar için uyarı verir.",
  },
  {
    q: "Sigorta ve muayene takibi var mı?",
    a: "Evet. Trafik sigortası, kasko, yeşil kart ve TÜVTÜRK muayene bitiş tarihlerini kaydedebilirsiniz. Süre dolmadan önce e-posta ve uygulama bildirimi alırsınız.",
  },
  {
    q: "Verilerimi dışa aktarabilir miyim?",
    a: "Evet, araç raporlarını ve servis geçmişini PDF ve Excel (XLSX) formatında dışa aktarabilirsiniz. Verilerinizin sahibi sizsiniz.",
  },
  {
    q: "Şirket filosu ve sürücü yönetimi destekleniyor mu?",
    a: "Evet. Yönetici ve sürücü rolleri ile araç atama, görev/seyahat takibi, arıza bildirimleri ve ekip koordinasyonunu tek panelden yönetebilirsiniz.",
  },
];

export function faqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: APP_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Fleet Management",
    operatingSystem: "Web, iOS, Android",
    inLanguage: "tr-TR",
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Araç bakım takibi",
      "Sigorta ve muayene hatırlatıcı",
      "Servis geçmişi",
      "Filo analitiği",
      "Sürücü ve ekip yönetimi",
      "PDF / Excel rapor",
    ],
    screenshot: absoluteUrl("/og-image.png"),
    image: absoluteUrl("/og-image.png"),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: APP_URL,
      logo: absoluteUrl("/logo.svg"),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: APP_URL,
    logo: absoluteUrl("/logo.svg"),
    description: "Araç bakım takip ve filo yönetim sistemi",
    foundingDate: "2025",
    areaServed: { "@type": "Country", name: "Turkey" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["Turkish", "English"],
      url: absoluteUrl("/register"),
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: APP_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "tr-TR",
    publisher: { "@type": "Organization", name: SITE_NAME, url: APP_URL },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
