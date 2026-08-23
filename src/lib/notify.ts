import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";
import { sendEventEmailToUsers, type EmailRecipient } from "@/lib/notify-email";
import type { EventEmailContent } from "@/lib/notify-email";

/**
 * Tek olay bildirimi — 3 kanala birden dağıtılır:
 *   1. Uygulama içi zil (notifications tablosu)
 *   2. Web Push (telefon)
 *   3. E-posta (Resend)
 *
 * Tüm bildirim içerikleri bu tek yapıdan üretilir; böylece "tek noktada" toplanır.
 */
/**
 * Olay türünü kategori tercihine eşler — yalnızca push/e-posta kanallarını
 * filtreler, uygulama içi zil her zaman gelir (kaçırılan bir olay olmasın).
 * Eşlemede olmayan (ör. güvenlik/kurtarma) türler her zaman gönderilir.
 *
 *  - operational: günlük aktivite (yeni araç/kayıt/arıza/görev/ekip/geri bildirim)
 *  - reminders:   kişiye özel hatırlatmalar (km, ehliyet, trafik cezası)
 */
export const EVENT_CATEGORY: Record<string, "operational" | "reminders"> = {
  vehicle_new: "operational",
  record_new: "operational",
  report_new: "operational",
  report_status: "operational",
  task_start: "operational",
  task_end: "operational",
  driver_new: "operational",
  vehicle_assigned: "operational",
  feedback_status: "operational",
  license_expiry_team: "operational",
  fine_assigned: "reminders",
  fine_status: "reminders",
  kilometer_reminder: "reminders",
  license_expiry: "reminders",
};

/**
 * Kısa pencerede tekrarlanan aynı tür olaylar için push/e-posta "soğuma"
 * süresi (dk). Bir kullanıcı bu süre içinde aynı türden zaten bir push/e-posta
 * aldıysa sonraki tekrarlar yalnızca zile yazılır (kaybolmaz, sadece telefonu/
 * e-postayı meşgul etmez) — art arda birden çok arıza/görev/kayıt bildirimi
 * art arda gelen zil-dışı gürültüyü önler. Eşlemede olmayan türler için soğuma
 * uygulanmaz.
 */
export const EVENT_COOLDOWN_MINUTES: Record<string, number> = {
  report_new: 3,
  record_new: 3,
  task_start: 3,
  task_end: 3,
  vehicle_new: 3,
};

export interface NotifyEvent {
  /** Olay anahtarı: task_start, task_end, report_new, report_status, record_new, vehicle_new, driver_new... (bkz. EVENT_CATEGORY) */
  type: string;
  severity?: "info" | "warning" | "critical";
  /** Zil + push başlığı (emoji içerebilir). */
  title: string;
  /** Zil + push gövdesi (düz metin). */
  body: string;
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
  push: number;
  email: number;
}

interface ManagerProfile {
  id: string;
  full_name: string | null;
  notify_by_email: boolean | null;
  notification_prefs: Record<string, boolean> | null;
}

/** Bir alıcının bu olay kategorisi için push/e-posta almayı kabul edip etmediği. */
function isCategoryAllowed(profile: ManagerProfile, category: "operational" | "reminders" | undefined): boolean {
  if (!category) return true;
  const prefs = profile.notification_prefs;
  if (!prefs || prefs[category] === undefined) return true; // varsayılan: açık
  return prefs[category] !== false;
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
 * Verilen alıcı profil listesine olayı 3 kanaldan birden iletir. Her kanal
 * birbirinden bağımsız; biri başarısız olsa (örn. RESEND yok) diğerleri
 * çalışmaya devam eder ve fonksiyon asla throw etmez.
 *
 * `dispatchToManagers` ve `dispatchToUser` bu ortak gövdeyi paylaşır — kitle
 * farkı yalnızca çağıran tarafın hangi profilleri topladığındadır.
 *
 * @param admin Service-role Supabase client (RLS bypass — notifications insert için şart).
 */
async function dispatchToProfiles(
  admin: SupabaseClient,
  companyId: string,
  recipients: ManagerProfile[],
  event: NotifyEvent,
): Promise<DispatchResult> {
  const result: DispatchResult = { recipients: 0, inApp: 0, push: 0, email: 0 };

  const managers = recipients;
  if (managers.length === 0) return result;
  result.recipients = managers.length;

  const severity = event.severity ?? "info";
  const category = EVENT_CATEGORY[event.type];
  // Push/e-posta yalnızca bu kategoriyi kapatmamış alıcılara gider; zil
  // (aşağıda) her zaman TÜM alıcılara yazılır — hiçbir olay tamamen kaybolmaz.
  let interruptEligible = managers.filter((m) => isCategoryAllowed(m, category));

  // Kısa pencerede tekrar eden aynı türden olaylarda, bu süre içinde zaten
  // push/e-posta almış alıcılar bir kez daha rahatsız edilmez (zil hepsine
  // yazılmaya devam eder — bkz. aşağıdaki adım 1).
  const cooldownMinutes = EVENT_COOLDOWN_MINUTES[event.type];
  if (cooldownMinutes && interruptEligible.length > 0) {
    const cutoff = new Date(Date.now() - cooldownMinutes * 60_000).toISOString();
    const { data: recent } = await admin
      .from("notifications")
      .select("user_id")
      .eq("type", event.type)
      .in("user_id", interruptEligible.map((m) => m.id))
      .gte("created_at", cutoff);
    const coolingDownIds = new Set((recent ?? []).map((r) => r.user_id as string));
    if (coolingDownIds.size > 0) {
      interruptEligible = interruptEligible.filter((m) => !coolingDownIds.has(m.id));
    }
  }

  const userIds = interruptEligible.map((m) => m.id);

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

  // 2) Web Push — tüm cihazlara.
  result.push = await sendPushToUsers(admin, userIds, {
    title: event.title,
    body: event.body,
    url: event.url ?? "/dashboard",
    tag: event.tag,
  }).catch((err) => {
    console.error("[notify] push hatası:", err);
    return 0;
  });

  // 3) E-posta — e-posta tercihi açık VE bu kategoriyi kapatmamış olanlara.
  const emailRecipients: EmailRecipient[] = interruptEligible.map((m) => ({
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

/**
 * Bir şirketteki yönetici + operatör rolündeki kullanıcılara olayı 3 kanaldan
 * birden iletir (bkz. dispatchToProfiles).
 *
 * `options.extraUserIds` ile kitle dışındaki belirli kullanıcılara da (ör. arızayı
 * açan kişi) aynı olay iletilebilir.
 */
export async function dispatchToManagers(
  admin: SupabaseClient,
  companyId: string,
  event: NotifyEvent,
  options?: DispatchOptions,
): Promise<DispatchResult> {
  // Alıcı kitle: yönetici + operatör — bir kez çekilir.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, notify_by_email, notification_prefs")
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
      .select("id, full_name, notify_by_email, notification_prefs")
      .eq("company_id", companyId)
      .in("id", extraIds);
    for (const p of (extraProfiles ?? []) as ManagerProfile[]) {
      if (!managers.some((m) => m.id === p.id)) managers.push(p);
    }
  }

  return dispatchToProfiles(admin, companyId, managers, event);
}

/**
 * Tek bir kullanıcıya (ör. kendi ehliyet süresi dolan sürücü) olayı 3 kanaldan
 * birden iletir (bkz. dispatchToProfiles). Kullanıcı bulunamazsa sessizce boş
 * sonuç döner.
 */
export async function dispatchToUser(
  admin: SupabaseClient,
  companyId: string,
  userId: string,
  event: NotifyEvent,
): Promise<DispatchResult> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, notify_by_email, notification_prefs")
    .eq("id", userId)
    .single();

  if (!profile) return { recipients: 0, inApp: 0, push: 0, email: 0 };

  return dispatchToProfiles(admin, companyId, [profile as ManagerProfile], event);
}
