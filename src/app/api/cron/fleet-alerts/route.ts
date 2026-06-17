export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFleetAlertDigest } from "@/lib/email/sendEmail";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendPushToManagers } from "@/lib/push";
import { getFleetAlerts } from "@/lib/store";
import { toVehicleFromRow } from "@/lib/vehicle-mapper";
import type { FleetAlert } from "@/lib/types";

// Kritik uyarılar 3, warning uyarılar 7 günde bir yeniden gönderilir.
const SUPPRESSION_DAYS: Record<string, number> = {
  critical: 3,
  warning: 7,
  info: 30,
};

function getAppUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const origin = new URL(req.url).origin;
  return origin;
}

// Yönetici/operatöre gönderilen günlük Telegram filo raporu metnini üretir.
// Uyarı olsa da olmasa da (durum ne olursa olsun) gönderilir.
function buildTelegramDigest(opts: {
  name: string;
  date: string;
  vehicleCount: number;
  alerts: FleetAlert[];
  appUrl: string;
}): string {
  const { name, date, vehicleCount, alerts, appUrl } = opts;
  const header =
    `🚗 <b>CarsTrack Günlük Filo Raporu</b>\n${date}\n\n` +
    `Merhaba ${name},\n📊 Filonuzda <b>${vehicleCount}</b> araç kayıtlı.`;

  if (alerts.length === 0) {
    return (
      `${header}\n\n✅ <b>Her şey yolunda!</b>\n` +
      `Tüm araçların sigorta, muayene ve bakım durumu güncel — aktif uyarı yok.\n\n` +
      `<a href="${appUrl}/vehicles">Filoyu görüntüle →</a>`
    );
  }

  const sevEmoji: Record<string, string> = { critical: "🔴", warning: "🟡", info: "🔵" };
  const counts = { critical: 0, warning: 0, info: 0 } as Record<string, number>;
  for (const a of alerts) counts[a.severity] = (counts[a.severity] ?? 0) + 1;

  const summary = `🔴 Kritik: <b>${counts.critical}</b>   🟡 Uyarı: <b>${counts.warning}</b>   🔵 Bilgi: <b>${counts.info}</b>`;

  const lines = alerts.slice(0, 40).map((a) => {
    let s = `${sevEmoji[a.severity] ?? "⚪"} <b>${a.vehiclePlate}</b> — ${a.title}`;
    if (a.description) s += `\n    <i>${a.description}</i>`;
    return s;
  });
  const more = alerts.length > 40 ? `\n\n… ve ${alerts.length - 40} uyarı daha.` : "";

  return (
    `${header}\n${summary}\n\n` +
    `<b>Aktif Uyarılar (${alerts.length}):</b>\n${lines.join("\n")}${more}\n\n` +
    `<a href="${appUrl}/vehicles">Tüm araçları görüntüle →</a>`
  );
}

export async function GET(req: Request) {
  // ── 1. Authorization ────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const appUrl = getAppUrl(req);

  const turkishDate = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Istanbul",
  });

  // ── 2. Tüm auth kullanıcıları (e-posta adresleri) ────────────────
  // Not: 1000+ kullanıcı için sayfalama gerekir; filo uygulaması için yeterli.
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) {
    console.error("[cron/fleet-alerts] listUsers error:", usersErr);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
  const userEmailMap = new Map(usersData.users.map((u) => [u.id, u.email ?? ""]));

  // ── 3. Tüm profiller (rol + company_id + ad soyad + bildirim tercihi) ──
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("id, company_id, role, full_name, notify_by_email, telegram_chat_id");
  if (profilesErr) {
    console.error("[cron/fleet-alerts] profiles error:", profilesErr);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  // ── 5. Sürücü → araç atamaları ─────────────────────────────────
  const { data: assignments } = await admin
    .from("vehicle_assignments")
    .select("driver_id, vehicle_id");
  const driverVehicleMap = new Map<string, string[]>();
  for (const a of assignments ?? [] as { driver_id: string; vehicle_id: string }[]) {
    const ids = driverVehicleMap.get(a.driver_id) ?? [];
    ids.push(a.vehicle_id);
    driverVehicleMap.set(a.driver_id, ids);
  }

  // ── 6. Tüm araçlar (tek sorgu, RLS bypass) ──────────────────────
  const { data: rawVehicles, error: vehiclesErr } = await admin.from("vehicles").select("*");
  if (vehiclesErr) {
    console.error("[cron/fleet-alerts] vehicles error:", vehiclesErr);
    return NextResponse.json({ error: "Failed to load vehicles" }, { status: 500 });
  }

  // ── 7. Araçları şirket bazında grupla + uyarıları hesapla ───────
  const vehiclesByCompany = new Map<string, ReturnType<typeof toVehicleFromRow>[]>();
  for (const row of rawVehicles ?? []) {
    const companyId = row.company_id as string;
    if (!vehiclesByCompany.has(companyId)) vehiclesByCompany.set(companyId, []);
    vehiclesByCompany.get(companyId)!.push(toVehicleFromRow(row as Record<string, unknown>));
  }

  const alertsByCompany = new Map<string, FleetAlert[]>();
  for (const [companyId, vehicles] of vehiclesByCompany) {
    alertsByCompany.set(companyId, getFleetAlerts(vehicles));
  }

  // Araç başına uyarı haritası (sürücü filtrelemesi için)
  const alertsByVehicle = new Map<string, FleetAlert[]>();
  for (const alerts of alertsByCompany.values()) {
    for (const alert of alerts) {
      if (!alertsByVehicle.has(alert.vehicleId)) alertsByVehicle.set(alert.vehicleId, []);
      alertsByVehicle.get(alert.vehicleId)!.push(alert);
    }
  }

  // ── 8. Her kullanıcıyı işle ──────────────────────────────────────
  const results: { userId: string; status: string; alertCount?: number }[] = [];
  let telegramSent = 0;
  let telegramError = 0;

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    const companyId = profile.company_id as string;
    const role = profile.role as string;

    const email = userEmailMap.get(userId);
    const telegramChatId = profile.telegram_chat_id as string | null;
    const notifyByEmail = profile.notify_by_email !== false;

    // Rol bazlı uyarı belirleme
    let userAlerts: FleetAlert[];
    if (role === "manager" || role === "operator") {
      userAlerts = alertsByCompany.get(companyId) ?? [];
    } else {
      // Sürücü: atanmış tüm araçların uyarıları (yalnızca e-posta için)
      const vehicleIds = driverVehicleMap.get(userId) ?? [];
      userAlerts = vehicleIds.flatMap((vId) => alertsByVehicle.get(vId) ?? []);
    }

    // ── TELEGRAM: yalnızca yönetici + operatör, HER GÜN, baskılamasız ──
    // Durum ne olursa olsun (uyarı var/yok) günlük rapor gönderilir.
    // Sürücü rolü Telegram bildirimi ALMAZ.
    if (telegramChatId && (role === "manager" || role === "operator")) {
      const vehicleCount = (vehiclesByCompany.get(companyId) ?? []).length;
      const msg = buildTelegramDigest({
        name: (profile.full_name as string) || "Yönetici",
        date: turkishDate,
        vehicleCount,
        alerts: userAlerts,
        appUrl,
      });
      try {
        await sendTelegramMessage(telegramChatId, msg);
        telegramSent++;
      } catch (err) {
        telegramError++;
        console.error(`[cron/fleet-alerts] telegram send failed for user ${userId}:`, err);
      }
    }

    // ── E-POSTA: mevcut davranış (tüm roller, uyarı varsa + baskılama) ──
    const sendEmail = notifyByEmail && !!email;
    if (!sendEmail) {
      results.push({ userId, status: telegramChatId ? "telegram_only" : "skipped_no_channel" });
      continue;
    }

    if (userAlerts.length === 0) {
      results.push({ userId, status: "skipped_no_alerts" });
      continue;
    }

    // ── Dedup: son gönderim zamanlarını çek (e-posta baskılaması) ──
    const alertIds = userAlerts.map((a) => a.id);
    const { data: recentLogs } = await admin
      .from("email_notification_log")
      .select("alert_id, severity, sent_at")
      .eq("user_id", userId)
      .in("alert_id", alertIds)
      .order("sent_at", { ascending: false });

    const lastSentMap = new Map<string, Date>();
    for (const log of recentLogs ?? []) {
      if (!lastSentMap.has(log.alert_id)) {
        lastSentMap.set(log.alert_id, new Date(log.sent_at as string));
      }
    }

    const alertsToSend = userAlerts.filter((alert) => {
      const lastSent = lastSentMap.get(alert.id);
      if (!lastSent) return true;
      const daysSince = (now.getTime() - lastSent.getTime()) / 86_400_000;
      return daysSince >= (SUPPRESSION_DAYS[alert.severity] ?? 7);
    });

    if (alertsToSend.length === 0) {
      results.push({ userId, status: "skipped_suppressed" });
      continue;
    }

    // ── E-posta gönder ──────────────────────────────────────────
    try {
      const sendResult = await sendFleetAlertDigest({
        to: email!,
        recipientName: (profile.full_name as string) || email!,
        alerts: alertsToSend,
        appUrl,
        date: turkishDate,
      });

      // Gönderim başarısızsa (veya atlandıysa) "sent" olarak loglama.
      if (!sendResult.success) {
        results.push({ userId, status: sendResult.skipped ? "skipped_unconfigured" : "error" });
        continue;
      }

      const logRows = alertsToSend.map((alert) => ({
        user_id: userId,
        alert_id: alert.id,
        severity: alert.severity,
        sent_at: now.toISOString(),
      }));
      await admin.from("email_notification_log").insert(logRows);

      results.push({ userId, status: "sent", alertCount: alertsToSend.length });
    } catch (err) {
      console.error(`[cron/fleet-alerts] email send failed for user ${userId}:`, err);
      results.push({ userId, status: "error" });
    }
  }

  // ── 8b. TELEFON (Web Push): şirket başına tek günlük özet ─────────
  // Yönetici + operatörlerin tüm cihazlarına gider (Telegram ile aynı kitle).
  let pushSent = 0;
  for (const [companyId, alerts] of alertsByCompany) {
    const counts = { critical: 0, warning: 0, info: 0 } as Record<string, number>;
    for (const a of alerts) counts[a.severity] = (counts[a.severity] ?? 0) + 1;
    const body =
      alerts.length === 0
        ? "✅ Her şey yolunda — aktif uyarı yok."
        : `🔴 ${counts.critical} kritik · 🟡 ${counts.warning} uyarı · 🔵 ${counts.info} bilgi`;
    try {
      pushSent += await sendPushToManagers(admin, companyId, {
        title: "🚗 Günlük Filo Raporu",
        body,
        url: "/vehicles",
        tag: "fleet-digest",
      });
    } catch (err) {
      console.error(`[cron/fleet-alerts] push send failed for company ${companyId}:`, err);
    }
  }

  // ── 9. Özet döndür ──────────────────────────────────────────────
  const sent    = results.filter((r) => r.status === "sent").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;

  console.log(`[cron/fleet-alerts] done — email_sent:${sent} email_errors:${errors} skipped:${skipped} | telegram_sent:${telegramSent} telegram_errors:${telegramError} | push_sent:${pushSent}`);
  return NextResponse.json({ ok: true, emailSent: sent, emailErrors: errors, skipped, telegramSent, telegramError, pushSent, total: results.length });
}
