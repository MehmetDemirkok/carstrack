export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import type { KilometerLogTokenContext, KilometerLogVehicleOption } from "@/lib/types";

/**
 * Magic link token'ı doğrular ve kullanıcının atanan araçlarını döner.
 * Auth gerekmez — token kendisi yetkilendirmedir.
 *
 * GET /api/kilometer-logs/token?token=...
 */
export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`km-token:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz bekleyin." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("kilometer_log_tokens")
    .select("token, vehicle_id, user_id, company_id, expires_at, used_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json(
      { error: "Geçersiz veya bulunamayan bağlantı." },
      { status: 404 },
    );
  }

  if (row.used_at) {
    return NextResponse.json(
      { error: "Bu bağlantı daha önce kullanılmış." },
      { status: 410 },
    );
  }

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Bu bağlantının süresi dolmuş." },
      { status: 410 },
    );
  }

  const userId = row.user_id as string;
  const tokenCreatedAt = row.created_at as string;

  // Kullanıcının tüm atanmış araçları
  const { data: assignments } = await admin
    .from("vehicle_assignments")
    .select("vehicle_id")
    .eq("driver_id", userId);

  let vehicleIds = [...new Set((assignments ?? []).map((a) => a.vehicle_id as string))];

  // Atama yoksa (eski tek-araç token) token.vehicle_id'ye düş
  if (vehicleIds.length === 0 && row.vehicle_id) {
    vehicleIds = [row.vehicle_id as string];
  }

  if (vehicleIds.length === 0) {
    return NextResponse.json({ error: "Atanmış araç bulunamadı." }, { status: 404 });
  }

  const { data: vehicles } = await admin
    .from("vehicles")
    .select("id, plate, brand, model, mileage")
    .in("id", vehicleIds);

  // Bu token döneminde girilmiş km kayıtları
  const { data: recentLogs } = await admin
    .from("kilometer_logs")
    .select("vehicle_id, kilometer_value, created_at")
    .eq("user_id", userId)
    .in("vehicle_id", vehicleIds)
    .gte("created_at", tokenCreatedAt)
    .order("created_at", { ascending: false });

  const submittedIds = new Set((recentLogs ?? []).map((l) => l.vehicle_id as string));

  // Her araç için son km: önce genel son log, yoksa vehicles.mileage
  const { data: lastLogs } = await admin
    .from("kilometer_logs")
    .select("vehicle_id, kilometer_value, created_at")
    .in("vehicle_id", vehicleIds)
    .order("created_at", { ascending: false });

  const lastKmByVehicle = new Map<string, number>();
  for (const log of lastLogs ?? []) {
    const vid = log.vehicle_id as string;
    if (!lastKmByVehicle.has(vid)) {
      lastKmByVehicle.set(vid, log.kilometer_value as number);
    }
  }

  const options: KilometerLogVehicleOption[] = (vehicles ?? [])
    .map((v) => {
      const id = v.id as string;
      const plate = (v.plate as string) || "—";
      return {
        vehicleId: id,
        vehiclePlate: plate,
        vehicleName: `${v.brand ?? ""} ${v.model ?? ""}`.trim() || plate,
        previousKilometer: lastKmByVehicle.get(id) ?? (v.mileage as number) ?? 0,
        alreadySubmitted: submittedIds.has(id),
      };
    })
    .sort((a, b) => a.vehiclePlate.localeCompare(b.vehiclePlate, "tr"));

  if (options.length === 0) {
    return NextResponse.json({ error: "Araç bulunamadı." }, { status: 404 });
  }

  const context: KilometerLogTokenContext = {
    token: row.token as string,
    expiresAt: row.expires_at as string,
    vehicles: options,
  };

  return NextResponse.json(context);
}
