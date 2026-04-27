export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFleetAlertDigest } from "@/lib/emails";
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

  // ── 3. Tüm profiller (rol + company_id + ad soyad) ───────────────
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("id, company_id, role, full_name");
  if (profilesErr) {
    console.error("[cron/fleet-alerts] profiles error:", profilesErr);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  // ── 4. Sürücü → araç atamaları ─────────────────────────────────
  const { data: assignments } = await admin
    .from("vehicle_assignments")
    .select("driver_id, vehicle_id");
  const driverVehicleMap = new Map(
    (assignments ?? []).map((a: { driver_id: string; vehicle_id: string }) => [
      a.driver_id,
      a.vehicle_id,
    ])
  );

  // ── 5. Tüm araçlar (tek sorgu, RLS bypass) ──────────────────────
  const { data: rawVehicles, error: vehiclesErr } = await admin.from("vehicles").select("*");
  if (vehiclesErr) {
    console.error("[cron/fleet-alerts] vehicles error:", vehiclesErr);
    return NextResponse.json({ error: "Failed to load vehicles" }, { status: 500 });
  }

  // ── 6. Araçları şirket bazında grupla + uyarıları hesapla ───────
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

  // ── 7. Her kullanıcıyı işle ──────────────────────────────────────
  const results: { userId: string; status: string; alertCount?: number }[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    const email = userEmailMap.get(userId);
    if (!email) continue;

    // Rol bazlı uyarı belirleme
    let userAlerts: FleetAlert[];
    if (profile.role === "manager") {
      userAlerts = alertsByCompany.get(profile.company_id as string) ?? [];
    } else {
      // Sürücü: yalnızca atanmış aracın uyarıları
      const vehicleId = driverVehicleMap.get(userId);
      userAlerts = vehicleId ? (alertsByVehicle.get(vehicleId) ?? []) : [];
    }

    if (userAlerts.length === 0) {
      results.push({ userId, status: "skipped_no_alerts" });
      continue;
    }

    // ── 8. Dedup: son gönderim zamanlarını çek ──────────────────
    const alertIds = userAlerts.map((a) => a.id);
    const { data: recentLogs } = await admin
      .from("email_notification_log")
      .select("alert_id, severity, sent_at")
      .eq("user_id", userId)
      .in("alert_id", alertIds)
      .order("sent_at", { ascending: false });

    // alert_id → en son gönderim tarihi
    const lastSentMap = new Map<string, Date>();
    for (const log of recentLogs ?? []) {
      if (!lastSentMap.has(log.alert_id)) {
        lastSentMap.set(log.alert_id, new Date(log.sent_at as string));
      }
    }

    // Baskılama penceresi geçmemiş uyarıları filtrele
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

    // ── 9. E-posta gönder ────────────────────────────────────────
    try {
      await sendFleetAlertDigest({
        to: email,
        recipientName: (profile.full_name as string) || email,
        alerts: alertsToSend,
        appUrl,
        date: turkishDate,
      });

      // ── 10. Log kaydet (başarıdan SONRA) ──────────────────────
      const logRows = alertsToSend.map((alert) => ({
        user_id: userId,
        alert_id: alert.id,
        severity: alert.severity,
        sent_at: now.toISOString(),
      }));
      await admin.from("email_notification_log").insert(logRows);

      results.push({ userId, status: "sent", alertCount: alertsToSend.length });
    } catch (err) {
      // Tek kullanıcı hatası tüm çalışmayı durdurmasın
      console.error(`[cron/fleet-alerts] user ${userId} failed:`, err);
      results.push({ userId, status: "error" });
    }
  }

  // ── 11. Özet döndür ─────────────────────────────────────────────
  const sent = results.filter((r) => r.status === "sent").length;
  const errors = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;

  console.log(`[cron/fleet-alerts] done — sent:${sent} errors:${errors} skipped:${skipped}`);
  return NextResponse.json({ ok: true, sent, errors, skipped, total: results.length });
}
