export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFleetAlertDigest } from "@/lib/email/sendEmail";
import { sendPushToManagers } from "@/lib/push";
import { getFleetAlerts, getTrafficFineAlerts } from "@/lib/store";
import { getFuelConsumptionAlerts } from "@/lib/fuel";
import { toVehicleFromRow, toTrafficFineFromRow, toFuelVehicleLatestFromRow, toFuelVehicleStatsFromRow } from "@/lib/vehicle-mapper";
import type { FleetAlert } from "@/lib/types";
import {
  DIGEST_LOCAL_HOUR,
  formatLocalDate,
  isLocalHour,
  resolveTimeZone,
} from "@/lib/timezone";

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

export async function GET(req: Request) {
  // ── 1. Authorization ────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const appUrl = getAppUrl(req);
  const forceAll = new URL(req.url).searchParams.get("force") === "1";

  // ── 2. Şirketler: yalnızca yerel saat 09:00 olanlar işlenir ─────
  let companies: { id: string; timezone?: string; fuel_anomaly_threshold_pct?: number }[] | null = null;
  const { data: companiesWithTz, error: companiesErr } = await admin
    .from("companies")
    .select("id, timezone, fuel_anomaly_threshold_pct");
  if (companiesErr) {
    const { data: companiesFallback, error: fallbackErr } = await admin
      .from("companies")
      .select("id");
    if (fallbackErr) {
      console.error("[cron/fleet-alerts] companies error:", companiesErr);
      return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
    }
    console.warn("[cron/fleet-alerts] timezone/fuel_anomaly_threshold_pct kolonu yok — varsayılanlar kullanılıyor");
    companies = companiesFallback as { id: string }[];
  } else {
    companies = companiesWithTz as { id: string; timezone?: string; fuel_anomaly_threshold_pct?: number }[];
  }

  const timezoneByCompany = new Map<string, string>();
  const fuelThresholdByCompany = new Map<string, number>();
  const digestCompanyIds: string[] = [];
  for (const row of companies ?? []) {
    const companyId = row.id as string;
    const timeZone = resolveTimeZone(row.timezone);
    timezoneByCompany.set(companyId, timeZone);
    fuelThresholdByCompany.set(companyId, Number(row.fuel_anomaly_threshold_pct) || 15);
    if (forceAll || isLocalHour(now, timeZone, DIGEST_LOCAL_HOUR)) {
      digestCompanyIds.push(companyId);
    }
  }

  if (digestCompanyIds.length === 0) {
    console.log("[cron/fleet-alerts] skipped — no company in local digest hour");
    return NextResponse.json({
      ok: true,
      skippedReason: "outside_digest_hour",
      emailSent: 0,
      emailErrors: 0,
      skipped: 0,
      pushSent: 0,
      total: 0,
    });
  }

  // ── 3. Auth kullanıcıları (e-posta adresleri) ───────────────────
  // Not: 1000+ kullanıcı için sayfalama gerekir; filo uygulaması için yeterli.
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) {
    console.error("[cron/fleet-alerts] listUsers error:", usersErr);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
  const userEmailMap = new Map(usersData.users.map((u) => [u.id, u.email ?? ""]));

  // ── 4. Digest saatindeki şirketlerin profilleri ────────────────
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("id, company_id, role, full_name, notify_by_email")
    .in("company_id", digestCompanyIds);
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

  // ── 6. Digest saatindeki şirketlerin araçları ──────────────────
  const { data: rawVehicles, error: vehiclesErr } = await admin
    .from("vehicles")
    .select("*")
    .in("company_id", digestCompanyIds);
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

  // ── 7b. Digest saatindeki şirketlerin ödenmemiş trafik cezaları ────────
  const { data: rawFines, error: finesErr } = await admin
    .from("traffic_fines")
    .select("*, vehicles(plate, brand, model)")
    .in("company_id", digestCompanyIds)
    .eq("status", "unpaid");
  if (finesErr) {
    console.error("[cron/fleet-alerts] traffic_fines error (non-fatal):", finesErr);
  }

  const finesByCompany = new Map<string, ReturnType<typeof toTrafficFineFromRow>[]>();
  for (const row of rawFines ?? []) {
    const companyId = row.company_id as string;
    if (!finesByCompany.has(companyId)) finesByCompany.set(companyId, []);
    finesByCompany.get(companyId)!.push(toTrafficFineFromRow(row as Record<string, unknown>));
  }

  // ── 7c. Digest saatindeki şirketlerin yakıt istatistikleri (anomali tespiti) ──
  const [{ data: rawFuelLatest, error: fuelLatestErr }, { data: rawFuelStats, error: fuelStatsErr }] = await Promise.all([
    admin.from("fuel_vehicle_latest").select("*").in("company_id", digestCompanyIds),
    admin.from("fuel_vehicle_stats").select("*").in("company_id", digestCompanyIds),
  ]);
  if (fuelLatestErr) console.error("[cron/fleet-alerts] fuel_vehicle_latest error (non-fatal):", fuelLatestErr);
  if (fuelStatsErr) console.error("[cron/fleet-alerts] fuel_vehicle_stats error (non-fatal):", fuelStatsErr);

  const fuelLatestByCompany = new Map<string, ReturnType<typeof toFuelVehicleLatestFromRow>[]>();
  for (const row of rawFuelLatest ?? []) {
    const companyId = row.company_id as string;
    if (!fuelLatestByCompany.has(companyId)) fuelLatestByCompany.set(companyId, []);
    fuelLatestByCompany.get(companyId)!.push(toFuelVehicleLatestFromRow(row as Record<string, unknown>));
  }
  const fuelStatsByCompany = new Map<string, ReturnType<typeof toFuelVehicleStatsFromRow>[]>();
  for (const row of rawFuelStats ?? []) {
    const companyId = row.company_id as string;
    if (!fuelStatsByCompany.has(companyId)) fuelStatsByCompany.set(companyId, []);
    fuelStatsByCompany.get(companyId)!.push(toFuelVehicleStatsFromRow(row as Record<string, unknown>));
  }

  const alertsByCompany = new Map<string, FleetAlert[]>();
  for (const [companyId, vehicles] of vehiclesByCompany) {
    const vehicleAlerts = getFleetAlerts(vehicles);
    const fineAlerts = getTrafficFineAlerts(finesByCompany.get(companyId) ?? []);
    const fuelAlerts = getFuelConsumptionAlerts(
      fuelLatestByCompany.get(companyId) ?? [],
      fuelStatsByCompany.get(companyId) ?? [],
      fuelThresholdByCompany.get(companyId) ?? 15,
    );
    alertsByCompany.set(companyId, [...vehicleAlerts, ...fineAlerts, ...fuelAlerts]);
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

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    const companyId = profile.company_id as string;
    const role = profile.role as string;

    const email = userEmailMap.get(userId);
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

    // ── E-POSTA: tüm roller, uyarı varsa + baskılama ──
    const sendEmail = notifyByEmail && !!email;
    if (!sendEmail) {
      results.push({ userId, status: "skipped_no_channel" });
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
        date: formatLocalDate(now, timezoneByCompany.get(companyId) ?? ""),
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
  // Yönetici + operatörlerin tüm cihazlarına gider.
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

  console.log(`[cron/fleet-alerts] done — companies:${digestCompanyIds.length} email_sent:${sent} email_errors:${errors} skipped:${skipped} | push_sent:${pushSent}`);
  return NextResponse.json({ ok: true, emailSent: sent, emailErrors: errors, skipped, pushSent, total: results.length });
}
