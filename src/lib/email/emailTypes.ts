/**
 * E-posta altyapısının tek tip & yapılandırma kaynağı.
 *
 * Buradaki amaç "magic string" bırakmamaktır: gönderen adresi, marka adı,
 * destek e-postası, konu başlıkları ve marka renkleri tek bir yerden okunur.
 * Yeni bir e-posta türü eklemek isteyen geliştirici önce buraya bir
 * `EmailTemplate` değeri ve (gerekirse) prop tipi ekler.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Marka & uygulama yapılandırması (env tabanlı, güvenli varsayılanlarla)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uygulamanın genel URL'i. Bağlantı/CTA hedefleri bunun üzerine kurulur.
 * Öncelik: açık env → Vercel → güvenli varsayılan.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://carstrack.app";
}

/** Tüm e-postalarda kullanılan sabit marka bilgileri. */
export const BRAND = {
  name: "CarsTrack",
  tagline: "Filo Yönetim Sistemi",
  /** Gönderen adresi — doğrulanmış alan adı production'da env ile verilmeli. */
  fromAddress: process.env.RESEND_FROM_EMAIL ?? "CarsTrack <onboarding@resend.dev>",
  /** Yanıtların gideceği gerçek adres (Reply-To header'ı). */
  replyTo: process.env.RESEND_REPLY_TO ?? process.env.EMAIL_SUPPORT_ADDRESS ?? "destek@carstrack.app",
  /** Footer'da ve "yardım" bağlantılarında gösterilen destek adresi. */
  supportAddress: process.env.EMAIL_SUPPORT_ADDRESS ?? "destek@carstrack.app",
} as const;

/**
 * Marka renk paleti — uygulamanın Material-3 mavi temasıyla hizalıdır.
 * Bilinçli olarak ağır gradient yoktur; tek vurgu rengi + nötr zinc yüzeyler
 * (Stripe / Linear / Vercel estetiği). Hex değerler e-posta istemcileri
 * arasında öngörülebilir olsun diye oklch yerine sabit hex'tir.
 */
export const PALETTE = {
  /** Birincil marka rengi (CTA, vurgu). M3 mavi primary karşılığı. */
  brand: "#2563eb",
  brandHover: "#1d4ed8",
  // Koyu tema yüzeyleri (zinc ölçeği)
  bg: "#09090b",
  surface: "#18181b",
  surfaceMuted: "#1c1c1f",
  border: "#27272a",
  // Tipografi
  textStrong: "#fafafa",
  text: "#e4e4e7",
  textMuted: "#a1a1aa",
  textFaint: "#71717a",
  textFooter: "#52525b",
  // Durum renkleri (Notification accent için)
  info: "#2563eb",
  success: "#16a34a",
  warning: "#d97706",
  critical: "#dc2626",
} as const;

/** Bildirim/olay önem derecesi → vurgu rengi eşlemesi. */
export type EmailSeverity = "info" | "success" | "warning" | "critical";

export const SEVERITY_ACCENT: Record<EmailSeverity, string> = {
  info: PALETTE.info,
  success: PALETTE.success,
  warning: PALETTE.warning,
  critical: PALETTE.critical,
};

// ─────────────────────────────────────────────────────────────────────────────
// Şablon kimlikleri & konu başlıkları (magic string yok)
// ─────────────────────────────────────────────────────────────────────────────

export enum EmailTemplate {
  Welcome = "welcome",
  ResetPassword = "reset-password",
  VerifyEmail = "verify-email",
  MagicLink = "magic-link",
  Notification = "notification",
  FleetAlerts = "fleet-alerts",
}

/** Statik (parametresiz) konu başlıkları. */
export const SUBJECTS = {
  welcome: `${BRAND.name} — Aramıza Hoş Geldin 🎉`,
  resetPassword: `${BRAND.name} — Şifre Sıfırlama Bağlantısı`,
  verifyEmail: `${BRAND.name} — E-posta Adresini Doğrula`,
  magicLink: `${BRAND.name} — Giriş Bağlantın`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Şablon prop tipleri — her template'in girdi sözleşmesi
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseEmailProps {
  /** Karşılama satırında kullanılacak ad (yoksa nötr selam). */
  recipientName?: string;
  /** Footer/CTA bağlantılarının türetileceği uygulama URL'i. */
  appUrl?: string;
}

export interface WelcomeEmailProps extends BaseEmailProps {
  /** "Sistemi Kullanmaya Başla" butonunun hedefi (mutlak URL). */
  ctaUrl?: string;
}

export interface ResetPasswordEmailProps extends BaseEmailProps {
  /** İmzalı şifre sıfırlama bağlantısı (mutlak URL). */
  resetUrl: string;
  /** Bağlantının geçerlilik süresi (saat) — güvenlik notunda gösterilir. */
  expiresInHours?: number;
}

export interface VerifyEmailProps extends BaseEmailProps {
  /** E-posta doğrulama bağlantısı (mutlak URL). */
  verifyUrl: string;
  /** Bağlantının geçerlilik süresi (saat). */
  expiresInHours?: number;
}

export interface MagicLinkEmailProps extends BaseEmailProps {
  /** Tek seferlik giriş bağlantısı (mutlak URL). */
  loginUrl: string;
  /** Bağlantının geçerlilik süresi (dakika). */
  expiresInMinutes?: number;
}

/** Bildirim e-postasında gösterilen etiket→değer satırı. */
export interface NotificationRow {
  label: string;
  value: string;
}

export interface NotificationEmailProps extends BaseEmailProps {
  /** Kart başlığı (örn. "Görev Başladı"). */
  title: string;
  /** Başlık yanındaki emoji. */
  emoji?: string;
  /** Başlığın altındaki açıklama cümlesi. */
  intro: string;
  /** Detay satırları (etiket → değer). */
  rows?: NotificationRow[];
  /** İsteğe bağlı serbest metin not. */
  note?: string;
  /** Önem derecesi → vurgu rengini belirler. */
  severity?: EmailSeverity;
  /** Doğrudan vurgu rengi override'ı (verilirse severity'nin önüne geçer). */
  accentColor?: string;
  /** CTA butonunun hedefi (mutlak URL). */
  ctaUrl?: string;
  /** CTA buton metni. */
  ctaLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gönderim sözleşmeleri (sendEmail çekirdeği için)
// ─────────────────────────────────────────────────────────────────────────────

/** Çekirdek sendEmail() girdisi. */
export interface SendEmailParams {
  /** Tek alıcı veya alıcı listesi. */
  to: string | string[];
  subject: string;
  /** Render edilmiş HTML gövdesi. */
  html: string;
  /** Düz metin alternatifi (deliverability için önerilir). */
  text?: string;
  /** Reply-To override (varsayılan: BRAND.replyTo). */
  replyTo?: string;
  /** Loglama/teşhis için şablon kimliği. */
  template: EmailTemplate;
  /** Tek tıkla abonelikten çıkış için List-Unsubscribe bağlantısı/maili. */
  listUnsubscribe?: string;
  /** Resend etiketleri (analitik/filtreleme). */
  tags?: { name: string; value: string }[];
}

/** sendEmail() ve tüm named-sender'ların döndüğü tip. Asla throw etmez. */
export interface SendEmailResult {
  success: boolean;
  /** Başarılıysa Resend message id. */
  messageId?: string;
  /** Başarısızsa okunabilir hata mesajı. */
  error?: string;
  /** RESEND_API_KEY yoksa gönderim atlandı (hata değil). */
  skipped?: boolean;
}
