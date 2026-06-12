import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEventEmail } from "@/lib/emails";
import type { EventEmailRow } from "@/lib/emails/event";

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://carstrack.app";
}

export interface EventEmailContent {
  subject: string;
  title: string;
  emoji: string;
  intro: string;
  rows: EventEmailRow[];
  note?: string;
  accent?: string;
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
      if (!email) return Promise.resolve();
      return sendEventEmail({
        to: email,
        subject: content.subject,
        recipientName: p.full_name || email,
        title: content.title,
        emoji: content.emoji,
        intro: content.intro,
        rows: content.rows,
        note: content.note,
        accent: content.accent,
        appUrl,
        ctaUrl: content.ctaUrl ? `${appUrl}${content.ctaUrl}` : undefined,
        ctaLabel: content.ctaLabel,
      });
    }),
  );

  let sent = 0;
  for (const r of settled) {
    if (r.status === "fulfilled") sent++;
    else console.error("[notify-email] gönderim hatası:", r.reason);
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
