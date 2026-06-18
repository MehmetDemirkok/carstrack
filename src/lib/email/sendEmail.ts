import { render } from "@react-email/render";
import { getResendClient, isEmailConfigured } from "./resend";
import {
  BRAND,
  EmailTemplate,
  SUBJECTS,
  getAppUrl,
  type MagicLinkEmailProps,
  type NotificationEmailProps,
  type ResetPasswordEmailProps,
  type SendEmailParams,
  type SendEmailResult,
  type VerifyEmailProps,
  type WelcomeEmailProps,
} from "./emailTypes";
import { WelcomeEmail } from "@/emails/templates/Welcome";
import { ResetPasswordEmail } from "@/emails/templates/ResetPassword";
import { VerifyEmail } from "@/emails/templates/VerifyEmail";
import { MagicLinkEmail } from "@/emails/templates/MagicLink";
import { NotificationEmail } from "@/emails/templates/Notification";
import { getFleetAlertsHtml } from "@/lib/emails/fleet-alerts";
import type { FleetAlert } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Çekirdek gönderici — tüm e-postalar bu tek noktadan geçer.
// ─────────────────────────────────────────────────────────────────────────────

/** Geçici hatalarda kaç kez yeniden denenecek (ilk deneme hariç). */
const MAX_RETRIES = 2;
/** Yeniden denemeler arası temel bekleme (ms); her denemede katlanır. */
const RETRY_BASE_DELAY_MS = 400;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resend hatasının geçici (retry'a değer) olup olmadığını belirler.
 * 429 (rate limit) ve 5xx geçicidir; 4xx (geçersiz adres vb.) kalıcıdır.
 */
function isTransientError(err: unknown): boolean {
  const status =
    typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode?: unknown }).statusCode)
      : undefined;
  if (status === undefined) return true; // ağ hatası gibi belirsiz durumlar → dene
  return status === 429 || status >= 500;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message?: unknown }).message);
  }
  return String(err);
}

/**
 * Tüm transactional e-postaların geçtiği tek gönderim fonksiyonu.
 *
 * Sorumlulukları:
 *  - RESEND yapılandırılmamışsa sessizce atla (`skipped`), akışı kesme.
 *  - try/catch + geçici hatalarda üssel geri çekilmeli (exponential backoff) retry.
 *  - Başarı ve hata için yapısal loglama.
 *  - Reply-To ve List-Unsubscribe gibi deliverability header'larını ekle.
 *
 * Asla throw etmez; her zaman bir `SendEmailResult` döner.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo, template, listUnsubscribe, tags } = params;

  if (!isEmailConfigured()) {
    console.warn(`[email:${template}] RESEND_API_KEY yok — gönderim atlandı (to=${recipientLabel(to)})`);
    return { success: false, skipped: true };
  }

  const resend = getResendClient();
  if (!resend) return { success: false, skipped: true };

  // YAPILANDIRMA KORUMASI: RESEND_FROM_EMAIL tanımlı değilse BRAND.fromAddress
  // Resend'in paylaşımlı sandbox göndericisi `onboarding@resend.dev`'e düşer.
  // Bu adres YALNIZCA hesap sahibinin kendi e-postasına teslim eder; diğer tüm
  // alıcıları 403 ile reddeder. Production'da bu sessizce olursa "sadece bir
  // kişiye mail gidiyor" hatasına yol açar — bu yüzden yüksek sesle uyar.
  if (BRAND.fromAddress.includes("onboarding@resend.dev") && process.env.NODE_ENV === "production") {
    console.error(
      `[email:${template}] YAPILANDIRMA HATASI: RESEND_FROM_EMAIL tanımlı değil — ` +
        `gönderici sandbox 'onboarding@resend.dev' (yalnız hesap sahibine teslim eder). ` +
        `Doğrulanmış alan adresini ortam değişkenine ekleyin (to=${recipientLabel(to)}).`,
    );
  }

  const headers: Record<string, string> = {};
  if (listUnsubscribe) {
    headers["List-Unsubscribe"] = listUnsubscribe;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: BRAND.fromAddress,
        to,
        subject,
        html,
        text,
        replyTo: replyTo ?? BRAND.replyTo,
        headers: Object.keys(headers).length ? headers : undefined,
        tags,
      });

      if (error) throw error;

      console.info(
        `[email:${template}] gönderildi ✓ id=${data?.id ?? "?"} to=${recipientLabel(to)}` +
          (attempt > 0 ? ` (deneme ${attempt + 1})` : ""),
      );
      return { success: true, messageId: data?.id };
    } catch (err) {
      lastError = err;
      const transient = isTransientError(err);
      console.error(
        `[email:${template}] gönderim hatası (deneme ${attempt + 1}/${MAX_RETRIES + 1}, ` +
          `${transient ? "geçici" : "kalıcı"}): ${toErrorMessage(err)}`,
      );
      if (!transient || attempt === MAX_RETRIES) break;
      await wait(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }

  return { success: false, error: toErrorMessage(lastError) };
}

/** Loglarda PII'yi sınırlamak için alıcıyı kısaca etiketler. */
function recipientLabel(to: string | string[]): string {
  const list = Array.isArray(to) ? to : [to];
  return list.length === 1 ? list[0] : `${list.length} alıcı`;
}

/** `mailto:` tabanlı List-Unsubscribe başlık değeri üretir. */
function unsubscribeHeader(): string {
  return `<mailto:${BRAND.supportAddress}?subject=unsubscribe>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adlandırılmış göngericiler — uygulama kodu bunları çağırır.
// Yeni bir e-posta türü: yeni template + buraya tek bir ince sarmalayıcı.
// ─────────────────────────────────────────────────────────────────────────────

/** Yeni üye olan kullanıcıya hoş geldin e-postası. */
export async function sendWelcomeEmail(
  to: string,
  props: WelcomeEmailProps = {},
): Promise<SendEmailResult> {
  const appUrl = props.appUrl ?? getAppUrl();
  const html = await render(WelcomeEmail({ ...props, appUrl }));
  const text = await render(WelcomeEmail({ ...props, appUrl }), { plainText: true });
  return sendEmail({
    to,
    subject: SUBJECTS.welcome,
    html,
    text,
    template: EmailTemplate.Welcome,
  });
}

/** Şifre sıfırlama e-postası. */
export async function sendPasswordResetEmail(
  to: string,
  props: ResetPasswordEmailProps,
): Promise<SendEmailResult> {
  const html = await render(ResetPasswordEmail(props));
  const text = await render(ResetPasswordEmail(props), { plainText: true });
  return sendEmail({
    to,
    subject: SUBJECTS.resetPassword,
    html,
    text,
    template: EmailTemplate.ResetPassword,
  });
}

/** E-posta doğrulama e-postası. */
export async function sendVerificationEmail(
  to: string,
  props: VerifyEmailProps,
): Promise<SendEmailResult> {
  const html = await render(VerifyEmail(props));
  const text = await render(VerifyEmail(props), { plainText: true });
  return sendEmail({
    to,
    subject: SUBJECTS.verifyEmail,
    html,
    text,
    template: EmailTemplate.VerifyEmail,
  });
}

/** Parolasız giriş (magic link) e-postası. */
export async function sendMagicLinkEmail(
  to: string,
  props: MagicLinkEmailProps,
): Promise<SendEmailResult> {
  const html = await render(MagicLinkEmail(props));
  const text = await render(MagicLinkEmail(props), { plainText: true });
  return sendEmail({
    to,
    subject: SUBJECTS.magicLink,
    html,
    text,
    template: EmailTemplate.MagicLink,
  });
}

/**
 * Genel bildirim/olay e-postası. Konu başlığı dinamik olduğundan ayrı `subject`
 * parametresi alır. Bildirim e-postaları List-Unsubscribe başlığı taşır.
 */
export async function sendNotificationEmail(
  to: string | string[],
  subject: string,
  props: NotificationEmailProps,
): Promise<SendEmailResult> {
  const appUrl = props.appUrl ?? getAppUrl();
  const html = await render(NotificationEmail({ ...props, appUrl }));
  const text = await render(NotificationEmail({ ...props, appUrl }), { plainText: true });
  return sendEmail({
    to,
    subject,
    html,
    text,
    template: EmailTemplate.Notification,
    listUnsubscribe: unsubscribeHeader(),
  });
}

export interface FleetAlertDigestParams {
  to: string;
  recipientName: string;
  alerts: FleetAlert[];
  appUrl: string;
  /** Türkçe biçimli tarih (özet başlığında gösterilir). */
  date: string;
}

/**
 * Birden çok filo uyarısını tek günlük özet e-postasında gönderir (cron işi).
 * Zengin özel HTML şablonunu kullanır ama çekirdek sendEmail()'den geçer
 * (retry + log + Reply-To + List-Unsubscribe tutarlılığı için).
 */
export async function sendFleetAlertDigest(params: FleetAlertDigestParams): Promise<SendEmailResult> {
  const criticalCount = params.alerts.filter((a) => a.severity === "critical").length;
  const subject =
    criticalCount > 0
      ? `${BRAND.name} — ${criticalCount} Kritik Filo Uyarısı`
      : `${BRAND.name} — Filo Uyarıları (${params.alerts.length})`;

  const html = getFleetAlertsHtml({
    recipientName: params.recipientName,
    alerts: params.alerts,
    appUrl: params.appUrl,
    date: params.date,
  });

  return sendEmail({
    to: params.to,
    subject,
    html,
    template: EmailTemplate.FleetAlerts,
    listUnsubscribe: unsubscribeHeader(),
  });
}
