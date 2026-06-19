import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendPushToUsers } from "@/lib/push";
import { sendEventEmailToUsers, type EmailRecipient } from "@/lib/notify-email";
import type { EventEmailContent } from "@/lib/notify-email";

/**
 * Tek olay bildirimi — 4 kanala birden dağıtılır:
 *   1. Uygulama içi zil (notifications tablosu)
 *   2. Telegram
 *   3. Web Push (telefon)
 *   4. E-posta (Resend)
 *
 * Tüm bildirim içerikleri bu tek yapıdan üretilir; böylece "tek noktada" toplanır.
 */
export interface NotifyEvent {
  /** Olay anahtarı: task_start, task_end, report_new, report_status, record_new, vehicle_new, driver_new */
  type: string;
  severity?: "info" | "warning" | "critical";
  /** Zil + push başlığı (emoji içerebilir). */
  title: string;
  /** Zil + push gövdesi (düz metin). */
  body: string;
  /** Telegram mesajı (HTML, parse_mode=HTML). */
  telegram: string;
  /** E-posta içeriği (Resend şablonu). */
  email: EventEmailContent;
  /** Tıklanınca açılacak uygulama içi yol (örn. "/dashboard"). */
  url?: string;
  /** Push dedup etiketi. */
  tag?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  meta?: Record<string, unknown>;
}

export interface DispatchResult {
  recipients: number;
  inApp: number;
  telegram: number;
  push: number;
  email: number;
}

interface ManagerProfile {
  id: string;
  full_name: string | null;
  telegram_chat_id: string | null;
  notify_by_email: boolean | null;
}

/** dispatchToManagers ek seçenekleri. */
export interface DispatchOptions {
  /**
   * Yönetici + operatör kitlesine ek olarak bildirilecek kullanıcı id'leri
   * (örn. arızayı açan "kullanıcı" rolündeki kişi). Aynı şirkete ait olmalı;
   * kitledeki kişilerle ve birbirleriyle çakışanlar otomatik tekilleştirilir.
   */
  extraUserIds?: string[];
}

/**
 * Bir şirketteki yönetici + operatör rolündeki kullanıcılara olayı 4 kanaldan
 * birden iletir. Her kanal birbirinden bağımsız; biri başarısız olsa (örn. Telegram
 * bağlı değil, RESEND yok) diğerleri çalışmaya devam eder ve fonksiyon asla throw etmez.
 *
 * `options.extraUserIds` ile kitle dışındaki belirli kullanıcılara da (ör. arızayı
 * açan kişi) aynı olay iletilebilir.
 *
 * @param admin Service-role Supabase client (RLS bypass — notifications insert için şart).
 */
export async function dispatchToManagers(
  admin: SupabaseClient,
  companyId: string,
  event: NotifyEvent,
  options?: DispatchOptions,
): Promise<DispatchResult> {
  const result: DispatchResult = { recipients: 0, inApp: 0, telegram: 0, push: 0, email: 0 };

  // Alıcı kitle: yönetici + operatör — bir kez çekilir.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, telegram_chat_id, notify_by_email")
    .eq("company_id", companyId)
    .in("role", ["manager", "operator"]);

  const managers = (profiles ?? []) as ManagerProfile[];

  // Ek alıcılar (ör. arızayı açan kullanıcı) — kitlede olmayanları aynı şirketten çek.
  const extraIds = (options?.extraUserIds ?? []).filter(
    (id): id is string => !!id && !managers.some((m) => m.id === id),
  );
  if (extraIds.length > 0) {
    const { data: extraProfiles } = await admin
      .from("profiles")
      .select("id, full_name, telegram_chat_id, notify_by_email")
      .eq("company_id", companyId)
      .in("id", extraIds);
    for (const p of (extraProfiles ?? []) as ManagerProfile[]) {
      if (!managers.some((m) => m.id === p.id)) managers.push(p);
    }
  }

  if (managers.length === 0) return result;
  result.recipients = managers.length;

  const userIds = managers.map((m) => m.id);
  const severity = event.severity ?? "info";

  // 1) Uygulama içi zil — alıcı başına bir satır.
  try {
    const rows = managers.map((m) => ({
      company_id: companyId,
      user_id: m.id,
      type: event.type,
      title: event.title,
      body: event.body,
      url: event.url ?? null,
      severity,
      vehicle_id: event.vehicleId ?? null,
      vehicle_plate: event.vehiclePlate ?? null,
      meta: event.meta ?? {},
    }));
    const { error, count } = await admin
      .from("notifications")
      .insert(rows, { count: "exact" });
    if (error) {
      console.error("[notify] zil kaydı hatası:", error);
    } else {
      result.inApp = count ?? rows.length;
    }
  } catch (err) {
    console.error("[notify] zil kaydı istisnası:", err);
  }

  // 2) Telegram — chat_id'si olanlara.
  const chatIds = managers
    .map((m) => m.telegram_chat_id)
    .filter((c): c is string => !!c);
  if (chatIds.length > 0) {
    const settled = await Promise.allSettled(
      chatIds.map((chatId) => sendTelegramMessage(chatId, event.telegram)),
    );
    result.telegram = settled.filter((r) => r.status === "fulfilled").length;
    for (const r of settled) {
      if (r.status === "rejected") console.error("[notify] telegram hatası:", r.reason);
    }
  }

  // 3) Web Push — tüm cihazlara.
  result.push = await sendPushToUsers(admin, userIds, {
    title: event.title,
    body: event.body,
    url: event.url ?? "/dashboard",
    tag: event.tag,
  }).catch((err) => {
    console.error("[notify] push hatası:", err);
    return 0;
  });

  // 4) E-posta — e-posta tercihi açık olanlara.
  const emailRecipients: EmailRecipient[] = managers.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    notify_by_email: m.notify_by_email,
  }));
  result.email = await sendEventEmailToUsers(admin, emailRecipients, event.email).catch((err) => {
    console.error("[notify] e-posta hatası:", err);
    return 0;
  });

  return result;
}
