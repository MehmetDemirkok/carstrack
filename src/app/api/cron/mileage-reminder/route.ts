export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers, dispatchToUser } from "@/lib/notify";
import { withCronLogging } from "@/lib/cron/record";
import { activeRows } from "@/lib/member-status";
import { MILEAGE_REMINDER_DAYS, mileageReminderDays } from "@/lib/mileage";
import { isDriverRole } from "@/lib/types";

/**
 * ESKİ KM HATIRLATICISI (yalnızca km'si eski araçlar)
 *
 * Km'si MILEAGE_REMINDER_DAYS günden uzun süredir doğrulanmamış araçlar için
 * (kural: lib/mileage.ts → mileageReminderDays):
 *   1. Araca atanmış aktif sürücü(ler)e kişisel hatırlatma — kendi eski
 *      araçları tek bildirimde, /km-guncelle sayfasına yönlendirir.
 *   2. Şirket yönetici/operatörlerine haftalık özet — özellikle sürücüsü
 *      olmayan araçlar başka kimseye hatırlatılmadığı için.
 * Km'si güncel araçlar için hiçbir şey gönderilmez. Aktif görevdeki araç
 * atlanır (görev bitince km zaten güncellenir).
 *
 * Gürültü sınırları (dedup: email_notification_log, alert_id serbest metin):
 *   - sürücü: en fazla DRIVER_RESEND_DAYS günde bir, son 30 günde en çok
 *     DRIVER_MAX_PER_30D kez,
 *   - yönetici özeti: en fazla TEAM_RESEND_DAYS günde bir.
 * Push/e-posta "reminders" kategorisindedir (kullanıcı kapatabilir); zil her
 * zaman yazılır. `?dry=1` gönderim yapmadan kimlere gideceğini döndürür.
 *
 * Önceki haftalık "kilometer-reminder" herkese km'den bağımsız e-posta
 * atıyordu ve kaldırılmıştı; bu cron yalnızca eski km'ler için çalışır.
 */

const DRIVER_RESEND_DAYS = 3;
const DRIVER_MAX_PER_30D = 4;
const TEAM_RESEND_DAYS = 7;
const ALERT_DRIVER = "mileage:stale";
const ALERT_TEAM = "mileage:team";
const DAY_MS = 86_400_000;

interface VehicleRow {
  id: string;
  company_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  mileage: number | null;
  mileage_updated_at?: string | null;
  mileage_confirmed_at?: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  company_id: string | null;
  role: string;
}

type DueVehicle = { id: string; companyId: string; plate: string; name: string; km: number; days: number };

function staleText(v: DueVehicle): string {
  return v.km === 0 ? "km hiç girilmemiş" : `${v.days} gündür güncellenmedi`;
}

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const now = new Date();

  // `*`: mileage_confirmed_at migration'ı uygulanmamışsa da sorgu düşmesin.
  const [vehiclesRes, tasksRes, assignmentsRes, profilesRes] = await Promise.all([
    admin.from("vehicles").select("*"),
    admin.from("vehicle_tasks").select("vehicle_id").eq("status", "active"),
    admin.from("vehicle_assignments").select("vehicle_id, driver_id"),
    admin.from("profiles").select("*").not("company_id", "is", null),
  ]);
  if (vehiclesRes.error || profilesRes.error) {
    console.error("[cron/mileage-reminder] veri yüklenemedi:", vehiclesRes.error ?? profilesRes.error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }

  const busy = new Set((tasksRes.data ?? []).map((t) => t.vehicle_id as string));
  const profiles = new Map(activeRows(profilesRes.data as ProfileRow[]).map((p) => [p.id, p]));

  // ── 1. Km'si eski araçlar ──────────────────────────────────────
  const due: DueVehicle[] = [];
  for (const v of (vehiclesRes.data ?? []) as VehicleRow[]) {
    if (busy.has(v.id)) continue;
    const days = mileageReminderDays(
      {
        mileage: v.mileage ?? 0,
        mileageUpdatedAt: v.mileage_updated_at ?? undefined,
        mileageConfirmedAt: v.mileage_confirmed_at ?? undefined,
        createdAt: v.created_at,
      },
      now,
    );
    if (days === null) continue;
    due.push({
      id: v.id,
      companyId: v.company_id,
      plate: v.plate,
      name: [v.brand, v.model].filter(Boolean).join(" "),
      km: v.mileage ?? 0,
      days,
    });
  }

  // ── 2. Sürücülere dağıt; sürücüsü olmayanlar yönetici özetine ──
  const driversByVehicle = new Map<string, string[]>();
  for (const a of assignmentsRes.data ?? []) {
    const list = driversByVehicle.get(a.vehicle_id as string) ?? [];
    list.push(a.driver_id as string);
    driversByVehicle.set(a.vehicle_id as string, list);
  }

  const byDriver = new Map<string, { companyId: string; vehicles: DueVehicle[] }>();
  const byCompany = new Map<string, { all: DueVehicle[]; unassigned: number }>();
  for (const v of due) {
    const drivers = (driversByVehicle.get(v.id) ?? []).filter((id) => {
      const p = profiles.get(id);
      return !!p && p.company_id === v.companyId && isDriverRole(p.role);
    });
    for (const d of drivers) {
      const entry = byDriver.get(d) ?? { companyId: v.companyId, vehicles: [] };
      entry.vehicles.push(v);
      byDriver.set(d, entry);
    }
    const c = byCompany.get(v.companyId) ?? { all: [], unassigned: 0 };
    c.all.push(v);
    if (drivers.length === 0) c.unassigned++;
    byCompany.set(v.companyId, c);
  }

  const managersByCompany = new Map<string, string[]>();
  for (const p of profiles.values()) {
    if (p.role !== "manager" && p.role !== "operator") continue;
    const list = managersByCompany.get(p.company_id!) ?? [];
    list.push(p.id);
    managersByCompany.set(p.company_id!, list);
  }

  // ── 3. Gönderim geçmişi (dedup) ───────────────────────────────
  const candidateUsers = [...byDriver.keys(), ...[...byCompany.keys()].flatMap((c) => managersByCompany.get(c) ?? [])];
  const history = new Map<string, number[]>(); // `${user}|${alert}` → gönderim zamanları
  if (candidateUsers.length > 0) {
    const { data: logs } = await admin
      .from("email_notification_log")
      .select("user_id, alert_id, sent_at")
      .in("alert_id", [ALERT_DRIVER, ALERT_TEAM])
      .in("user_id", [...new Set(candidateUsers)])
      .gte("sent_at", new Date(now.getTime() - 30 * DAY_MS).toISOString());
    for (const l of logs ?? []) {
      const key = `${l.user_id}|${l.alert_id}`;
      history.set(key, [...(history.get(key) ?? []), Date.parse(l.sent_at as string)]);
    }
  }
  const lastSent = (user: string, alert: string) => Math.max(0, ...(history.get(`${user}|${alert}`) ?? []));
  const sentCount = (user: string, alert: string) => (history.get(`${user}|${alert}`) ?? []).length;

  const driverTargets = [...byDriver.entries()].filter(([userId]) =>
    now.getTime() - lastSent(userId, ALERT_DRIVER) >= DRIVER_RESEND_DAYS * DAY_MS &&
    sentCount(userId, ALERT_DRIVER) < DRIVER_MAX_PER_30D,
  );
  const teamTargets = [...byCompany.entries()].filter(([companyId]) => {
    const managers = managersByCompany.get(companyId) ?? [];
    if (managers.length === 0) return false;
    const last = Math.max(0, ...managers.map((m) => lastSent(m, ALERT_TEAM)));
    return now.getTime() - last >= TEAM_RESEND_DAYS * DAY_MS;
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      staleVehicles: due.length,
      driverNotifications: driverTargets.map(([userId, e]) => ({ userId, plates: e.vehicles.map((v) => v.plate) })),
      teamDigests: teamTargets.map(([companyId, c]) => ({ companyId, stale: c.all.length, unassigned: c.unassigned })),
    });
  }

  const logRows: { user_id: string; alert_id: string; severity: string }[] = [];

  // ── 4. Sürücü hatırlatmaları ──────────────────────────────────
  let driverSent = 0;
  for (const [userId, { companyId, vehicles }] of driverTargets) {
    vehicles.sort((a, b) => b.days - a.days);
    const single = vehicles.length === 1 ? vehicles[0] : null;
    const title = "🚗 Km güncellemesi bekleniyor";
    const body = single
      ? `${single.plate} aracınızın ${staleText(single)}. Güncel km'yi girmek birkaç saniye sürer; araç kullanılmadıysa "Değişmedi"ye dokunun.`
      : `${vehicles.length} aracınızın km'si ${MILEAGE_REMINDER_DAYS} günden uzun süredir güncellenmedi: ${vehicles.slice(0, 3).map((v) => v.plate).join(", ")}${vehicles.length > 3 ? "…" : ""}. Kullanılmayan araç için "Değişmedi"ye dokunmanız yeterli.`;
    const url = single ? `/km-guncelle?arac=${single.id}` : "/km-guncelle";

    try {
      await dispatchToUser(admin, companyId, userId, {
        type: "mileage_stale",
        severity: "info",
        title,
        body,
        url,
        tag: `mileage-stale-${userId}`,
        meta: { vehicleIds: vehicles.map((v) => v.id) },
        email: {
          subject: "CarsTrack — Km güncellemesi bekleniyor",
          title: "Km güncellemesi bekleniyor",
          emoji: "🚗",
          intro: "Bakım ve muayene uyarılarının zamanında gelmesi için aracınızın güncel km'si gerekiyor. Araç kullanılmadıysa \"Değişmedi\"ye dokunmanız yeterli.",
          rows: vehicles.slice(0, 10).map((v) => ({
            label: `${v.plate}${v.name ? ` • ${v.name}` : ""}`,
            value: staleText(v),
          })),
          note: "Bu hatırlatmayı Ayarlar › Hatırlatıcılar seçeneğinden kapatabilirsiniz.",
          accent: "#f59e0b",
          ctaUrl: url,
          ctaLabel: "Km'yi Güncelle",
        },
      });
      driverSent++;
      logRows.push({ user_id: userId, alert_id: ALERT_DRIVER, severity: "info" });
    } catch (e) {
      console.error("[cron/mileage-reminder] sürücü bildirimi hatası:", e);
    }
  }

  // ── 5. Yönetici özetleri ──────────────────────────────────────
  let teamSent = 0;
  for (const [companyId, { all, unassigned }] of teamTargets) {
    all.sort((a, b) => b.days - a.days);
    const title = "🚗 Km'si eski araçlar";
    const body = `Filonuzda ${all.length} aracın km'si ${MILEAGE_REMINDER_DAYS} günden uzun süredir güncellenmedi${unassigned > 0 ? ` (${unassigned} tanesinin sürücüsü yok, hatırlatma yalnızca size gidiyor)` : ""}. Bakım uyarılarının doğru çalışması için güncelleyin.`;
    try {
      await dispatchToManagers(admin, companyId, {
        type: "mileage_stale_team",
        severity: "info",
        title,
        body,
        url: "/km-guncelle",
        tag: `mileage-team-${companyId}`,
        meta: { stale: all.length, unassigned },
        email: {
          subject: "CarsTrack — Km'si eski araçlar",
          title: "Km'si eski araçlar",
          emoji: "🚗",
          intro: body,
          rows: all.slice(0, 10).map((v) => ({
            label: `${v.plate}${v.name ? ` • ${v.name}` : ""}`,
            value: staleText(v),
          })),
          note: all.length > 10 ? `ve ${all.length - 10} araç daha.` : undefined,
          accent: "#f59e0b",
          ctaUrl: "/km-guncelle",
          ctaLabel: "Km'leri Güncelle",
        },
      });
      teamSent++;
      for (const m of managersByCompany.get(companyId) ?? []) {
        logRows.push({ user_id: m, alert_id: ALERT_TEAM, severity: "info" });
      }
    } catch (e) {
      console.error("[cron/mileage-reminder] yönetici özeti hatası:", e);
    }
  }

  if (logRows.length > 0) {
    const { error } = await admin.from("email_notification_log").insert(logRows);
    if (error) console.error("[cron/mileage-reminder] log yazılamadı:", error);
  }

  console.info(`[cron/mileage-reminder] eski=${due.length} sürücü=${driverSent} yönetici-özeti=${teamSent}`);
  return NextResponse.json({ ok: true, staleVehicles: due.length, driverSent, teamSent });
}

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
export const GET = withCronLogging("mileage-reminder", handler);
