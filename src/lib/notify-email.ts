import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationEmail } from "@/lib/email/sendEmail";
import { getAppUrl, type NotificationRow } from "@/lib/email/emailTypes";

export interface EventEmailContent {
  subject: string;
  title: string;
  emoji: string;
  intro: string;
  rows: NotificationRow[];
  note?: string;
  /** Vurgu rengi (kart üst çizgisi + buton). */
  accent?: string;
  /** CTA hedefi — appUrl'e göre göreli yol (örn. "/users"). */
  ctaUrl?: string;
  ctaLabel?: string;
}

/** E-posta alıcısı (profiles satırından). */
export interface EmailRecipient {
  id: string;
  full_name?: string | null;
  notify_by_email?: boolean | null;
}

/**
 * Verilen alıcı listesine (e-posta tercihi açık olanlara) tek olay e-postası
 * gönderir. Telegram/push ile aynı kitleye gönderim için ortak giriş noktası.
 * RESEND yapılandırılmamışsa veya alıcı yoksa sessizce 0 döner; akışı kesmez.
 */
export async function sendEventEmailToUsers(
  admin: SupabaseClient,
  recipientProfiles: EmailRecipient[],
  content: EventEmailContent,
): Promise<number> {
  if (!process.env.RESEND_API_KEY) return 0;

  const recipients = recipientProfiles.filter((p) => p.notify_by_email !== false);
  if (recipients.length === 0) return 0;

  // id → e-posta eşlemesi (auth tablosundan)
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const appUrl = getAppUrl();

  const settled = await Promise.allSettled(
    recipients.map((p) => {
      const email = emailMap.get(p.id);
      if (!email) return Promise.resolve({ success: false });
      return sendNotificationEmail(email, content.subject, {
        recipientName: p.full_name || email,
        title: content.title,
        emoji: content.emoji,
        intro: content.intro,
        rows: content.rows,
        note: content.note,
        accentColor: content.accent,
        appUrl,
        ctaUrl: content.ctaUrl ? `${appUrl}${content.ctaUrl}` : undefined,
        ctaLabel: content.ctaLabel,
      });
    }),
  );

  let sent = 0;
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value.success) sent++;
    else if (r.status === "rejected") console.error("[notify-email] gönderim hatası:", r.reason);
  }
  return sent;
}

/**
 * Bir şirketteki yönetici + operatör rolündeki, e-posta bildirimi açık olan
 * kullanıcılara tek olay e-postası gönderir (Telegram/push ile aynı kitle).
 */
export async function sendEventEmailToManagers(
  admin: SupabaseClient,
  companyId: string,
  content: EventEmailContent,
): Promise<number> {
  if (!process.env.RESEND_API_KEY) return 0;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, notify_by_email")
    .eq("company_id", companyId)
    .in("role", ["manager", "operator"]);

  return sendEventEmailToUsers(admin, (profiles ?? []) as EmailRecipient[], content);
}
