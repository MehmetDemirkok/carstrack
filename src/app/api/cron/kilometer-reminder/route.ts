export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToUser } from "@/lib/notify";
import { getAppUrl } from "@/lib/email/emailTypes";

/** Token geçerlilik süresi: 7 gün (bir sonraki hatırlatmaya kadar). */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getRequestAppUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin;
}

function createSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Her Pazartesi ve Cuma 10:00 (Europe/Istanbul) — araç ataması olan
 * kullanıcılara kilometre güncelleme / KM farkı kapatma hatırlatması
 * (bildirim + e-posta) gönderir.
 *
 * Sürücü başına TEK bildirim + TEK magic link; formda birden fazla araç
 * varsa plaka seçilir.
 *
 * Vercel cron UTC kullanır: 10:00 TR = 07:00 UTC → `0 7 * * 1,5`
 * (1 = Pazartesi, 5 = Cuma)
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = getRequestAppUrl(req) || getAppUrl();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  // ── 1) Aktif araç atamaları ───────────────────────────────────
  const { data: assignments, error: assignErr } = await admin
    .from("vehicle_assignments")
    .select("driver_id, vehicle_id");

  if (assignErr) {
    console.error("[cron/kilometer-reminder] assignments error:", assignErr);
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 });
  }

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: "No assignments" });
  }

  // Sürücü → araç id listesi
  const vehiclesByDriver = new Map<string, string[]>();
  for (const a of assignments) {
    const driverId = a.driver_id as string;
    const vehicleId = a.vehicle_id as string;
    const list = vehiclesByDriver.get(driverId) ?? [];
    if (!list.includes(vehicleId)) list.push(vehicleId);
    vehiclesByDriver.set(driverId, list);
  }

  const vehicleIds = [...new Set(assignments.map((a) => a.vehicle_id as string))];
  const driverIds = [...vehiclesByDriver.keys()];

  // ── 2) Araçlar + profiller ────────────────────────────────────
  const [{ data: vehicles }, { data: profiles }] = await Promise.all([
    admin.from("vehicles").select("id, company_id, plate, brand, model, mileage").in("id", vehicleIds),
    admin.from("profiles").select("id, company_id, full_name").in("id", driverIds),
  ]);

  const vehicleMap = new Map((vehicles ?? []).map((v) => [v.id as string, v]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const results: { driverId: string; vehicleCount: number; status: string }[] = [];

  for (const [driverId, driverVehicleIds] of vehiclesByDriver) {
    const profile = profileMap.get(driverId);
    if (!profile) {
      results.push({ driverId, vehicleCount: 0, status: "skipped_missing" });
      continue;
    }

    const driverVehicles = driverVehicleIds
      .map((id) => vehicleMap.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v);

    if (driverVehicles.length === 0) {
      results.push({ driverId, vehicleCount: 0, status: "skipped_no_vehicles" });
      continue;
    }

    const companyId = (profile.company_id as string) || (driverVehicles[0].company_id as string);
    const token = createSecureToken();
    // Token satırında ilk araç FK için tutulur; form tüm atanan araçları listeler.
    const anchorVehicleId = driverVehicles[0].id as string;
    const relativeFormPath = `/km-guncelle?token=${encodeURIComponent(token)}`;
    const formUrl = `${appUrl}${relativeFormPath}`;

    const { error: tokenErr } = await admin.from("kilometer_log_tokens").insert({
      token,
      company_id: companyId,
      vehicle_id: anchorVehicleId,
      user_id: driverId,
      expires_at: expiresAt,
    });

    if (tokenErr) {
      console.error(`[cron/kilometer-reminder] token insert failed:`, tokenErr);
      results.push({ driverId, vehicleCount: driverVehicles.length, status: "error_token" });
      continue;
    }

    const plates = driverVehicles.map((v) => (v.plate as string) || "—");
    const plateSummary =
      plates.length <= 3
        ? plates.join(", ")
        : `${plates.slice(0, 2).join(", ")} +${plates.length - 2} araç daha`;

    const notifyBody =
      driverVehicles.length === 1
        ? "Bu haftalık kilometre verinizi güncellemek için tıklayın."
        : `${driverVehicles.length} aracınız için haftalık kilometre verisini güncellemek üzere tıklayın.`;

    try {
      await dispatchToUser(admin, companyId, driverId, {
        type: "kilometer_reminder",
        severity: "info",
        title: "Haftalık Kilometre Güncellemesi",
        body: notifyBody,
        url: relativeFormPath,
        tag: `km-reminder-${driverId}`,
        vehiclePlate: plates[0],
        meta: { formUrl, vehicleCount: driverVehicles.length, plates },
        email: {
          subject: "CarsTrack — Haftalık Kilometre Güncellemesi",
          title: "Haftalık Kilometre Güncellemesi",
          emoji: "🛣️",
          intro: notifyBody,
          rows: [
            { label: "Araç sayısı", value: String(driverVehicles.length) },
            { label: "Plakalar", value: plateSummary },
          ],
          note:
            driverVehicles.length > 1
              ? "Formda plaka seçerek her araç için km girebilirsiniz. Bağlantı 7 gün geçerlidir."
              : "Bağlantı tek kullanımlıktır ve 7 gün geçerlidir. Giriş yapmanıza gerek yoktur.",
          ctaUrl: relativeFormPath,
          ctaLabel: "Kilometreyi Güncelle",
        },
      });
      results.push({ driverId, vehicleCount: driverVehicles.length, status: "sent" });
    } catch (err) {
      console.error(`[cron/kilometer-reminder] dispatch failed for ${driverId}:`, err);
      results.push({ driverId, vehicleCount: driverVehicles.length, status: "error_dispatch" });
    }
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
  const errors = results.filter((r) => r.status.startsWith("error")).length;
  const vehicleTotal = results.reduce((n, r) => n + r.vehicleCount, 0);

  console.log(
    `[cron/kilometer-reminder] done — drivers_sent:${sent} skipped:${skipped} errors:${errors} vehicles:${vehicleTotal}`,
  );

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    errors,
    vehicleTotal,
    total: results.length,
  });
}
