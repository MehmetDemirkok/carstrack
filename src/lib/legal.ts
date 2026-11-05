/** Yasal metinlerdeki kimlik bilgileri. Köşeli parantezli değerler yayından önce doldurulmalıdır. */
export const LEGAL_INFO = {
  controllerName: "[VERİ SORUMLUSU: ŞİRKET ÜNVANI VEYA AD SOYAD]",
  address: "[TEBLİGAT ADRESİ]",
  contactEmail: "[KVKK BAŞVURU E-POSTASI]",
  kepAddress: "[KEP ADRESİ — YOKSA BU SATIR KALDIRILACAK]",
  courtCity: "[YETKİLİ MAHKEME ŞEHRİ]",
  lastUpdated: "5 Kasım 2026",
} as const;

/** Koşullar değiştiğinde artırılır; kayıt sırasında kullanıcının app_metadata'sına yazılır. */
export const TERMS_VERSION = "2026-11-05";

export interface DataProcessor {
  name: string;
  purpose: string;
  location: string;
}

/** Sentry ve dış yedek, yalnızca ilgili ortam değişkenleri tanımlıysa listelenir. */
export function getDataProcessors(): DataProcessor[] {
  return [
    {
      name: "Supabase",
      purpose: "Veritabanı, kimlik doğrulama, dosya depolama ve yedekler",
      location: "Güney Kore (Seul) veri merkezi",
    },
    {
      name: "Vercel",
      purpose: "Uygulama barındırma, sunucu kayıtları, ziyaret ve performans ölçümü",
      location: "ABD merkezli sağlayıcı",
    },
    {
      name: "Resend",
      purpose: "E-posta bildirimlerinin gönderimi",
      location: "ABD merkezli sağlayıcı",
    },
    {
      name: "Google (Gemini)",
      purpose: "Yüklediğiniz ruhsat, sigorta, ehliyet ve ceza belgelerinin otomatik okunması",
      location: "ABD merkezli sağlayıcı",
    },
    ...(process.env.NEXT_PUBLIC_SENTRY_DSN
      ? [{ name: "Sentry", purpose: "Uygulama hatalarının izlenmesi", location: "Yurt dışı merkezli sağlayıcı" }]
      : []),
    ...(process.env.BACKUP_S3_ENDPOINT
      ? [{ name: "Yedek depolama sağlayıcısı", purpose: "Veritabanı yedeğinin ikinci kopyası", location: "Yurt dışı merkezli sağlayıcı" }]
      : []),
  ];
}
