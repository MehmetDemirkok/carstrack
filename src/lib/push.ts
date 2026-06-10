import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@carstrack.app";

let configured = false;
function ensureConfigured(): boolean {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return true;
}

/** VAPID anahtarları tanımlı mı? Çağrılardan önce kontrol için. */
export function isPushConfigured(): boolean {
  return !!PUBLIC_KEY && !!PRIVATE_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Tıklanınca açılacak yol (varsayılan "/"). */
  url?: string;
  /** Aynı tag'li bildirimler üst üste yığılmaz. */
  tag?: string;
  icon?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Verilen aboneliklere push gönderir. Artık geçersiz olan (404/410) abonelikleri
 * veritabanından temizler — böylece tablo bayat endpoint'lerle şişmez.
 * Telegram'daki sendTelegramMessage'ın eşdeğeridir; başarısızlık akışı kesmez.
 */
async function sendToSubscriptions(
  admin: SupabaseClient,
  subs: SubscriptionRow[],
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfigured() || subs.length === 0) return 0;

  const data = JSON.stringify(payload);
  const staleIds: string[] = [];

  const settled = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      ),
    ),
  );

  let sent = 0;
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sent++;
    } else {
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      // 404 (Not Found) / 410 (Gone) → abonelik artık geçerli değil, sil.
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(subs[i].id);
      } else {
        console.error("[push] gönderim hatası:", r.reason);
      }
    }
  });

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return sent;
}

/**
 * Bir şirketteki yönetici + operatör rolündeki kullanıcıların tüm cihazlarına
 * push bildirimi gönderir (Telegram bildirimleriyle aynı hedef kitle).
 * Admin (service role) client RLS'i bypass eder.
 */
export async function sendPushToManagers(
  admin: SupabaseClient,
  companyId: string,
  payload: PushPayload,
): Promise<number> {
  if (!isPushConfigured()) return 0;

  // Şirketteki yönetici/operatörlerin id'leri
  const { data: managers } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["manager", "operator"]);

  const userIds = (managers ?? []).map((m) => m.id as string);
  if (userIds.length === 0) return 0;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  return sendToSubscriptions(admin, (subs ?? []) as SubscriptionRow[], payload);
}
