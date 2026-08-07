export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/**
 * Haftalık kilometre formunu kaydeder.
 * Auth yok — token + atanmış vehicle_id ile yetkilendirilir.
 *
 * POST multipart/form-data:
 *   token            string (zorunlu)
 *   vehicle_id       string (zorunlu — kullanıcının atanan araçlarından biri)
 *   kilometer_value  number (zorunlu)
 *   photo            File   (isteğe bağlı)
 *
 * Çok araçlı token'larda her araç için ayrı kayıt yapılabilir;
 * tüm araçlar girilince token tüketilir.
 */
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`km-submit:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz bekleyin." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
  }

  const token = String(form.get("token") ?? "").trim();
  const vehicleId = String(form.get("vehicle_id") ?? "").trim();
  const rawKm = String(form.get("kilometer_value") ?? "").trim().replace(/\./g, "").replace(/,/g, "");
  const photo = form.get("photo");

  if (!token) {
    return NextResponse.json({ error: "Token gerekli." }, { status: 400 });
  }
  if (!vehicleId) {
    return NextResponse.json({ error: "Araç seçimi gerekli." }, { status: 400 });
  }

  const kilometerValue = Number.parseInt(rawKm, 10);
  if (!Number.isFinite(kilometerValue) || kilometerValue < 0) {
    return NextResponse.json({ error: "Geçerli bir kilometre değeri girin." }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Token doğrula ─────────────────────────────────────────────
  const { data: tokenRow, error: tokenErr } = await admin
    .from("kilometer_log_tokens")
    .select("id, token, vehicle_id, user_id, company_id, expires_at, used_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: "Geçersiz bağlantı." }, { status: 404 });
  }
  if (tokenRow.used_at) {
    return NextResponse.json({ error: "Bu bağlantı daha önce kullanılmış." }, { status: 410 });
  }
  if (new Date(tokenRow.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: "Bu bağlantının süresi dolmuş." }, { status: 410 });
  }

  const userId = tokenRow.user_id as string;
  const companyId = tokenRow.company_id as string;
  const tokenCreatedAt = tokenRow.created_at as string;

  // ── Araç, kullanıcının atamasında mı? ─────────────────────────
  const { data: assignment } = await admin
    .from("vehicle_assignments")
    .select("vehicle_id")
    .eq("driver_id", userId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  const allowedByAssignment = !!assignment;
  const allowedByLegacyToken = !assignment && tokenRow.vehicle_id === vehicleId;

  if (!allowedByAssignment && !allowedByLegacyToken) {
    return NextResponse.json(
      { error: "Bu araç size atanmamış veya bağlantıda yok." },
      { status: 403 },
    );
  }

  // ── Önceki km ─────────────────────────────────────────────────
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, mileage, plate, company_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: "Araç bulunamadı." }, { status: 404 });
  }

  const { data: lastLog } = await admin
    .from("kilometer_logs")
    .select("kilometer_value")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousKilometer =
    (lastLog?.kilometer_value as number | undefined) ??
    (vehicle.mileage as number) ??
    0;

  if (kilometerValue < previousKilometer) {
    return NextResponse.json(
      {
        error: "Girilen değer son kilometreden küçük olamaz",
        previousKilometer,
      },
      { status: 400 },
    );
  }

  // ── İsteğe bağlı fotoğraf ─────────────────────────────────────
  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Fotoğraf en fazla 8 MB olabilir." },
        { status: 400 },
      );
    }
    const mime = photo.type || "image/jpeg";
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: "Yalnızca JPEG, PNG veya WebP fotoğraf yüklenebilir." },
        { status: 400 },
      );
    }
    const ext =
      mime === "image/png" ? "png" :
      mime === "image/webp" ? "webp" :
      mime === "image/heic" || mime === "image/heif" ? "heic" :
      "jpg";
    const filePath = `${companyId}/${vehicleId}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await photo.arrayBuffer());
    const { error: uploadErr } = await admin.storage
      .from("kilometer-photos")
      .upload(filePath, buffer, { contentType: mime, upsert: false });

    if (uploadErr) {
      console.error("[kilometer-logs] photo upload failed:", uploadErr);
      return NextResponse.json(
        { error: "Fotoğraf yüklenemedi. Tekrar deneyin." },
        { status: 500 },
      );
    }
    photoUrl = filePath;
  }

  // ── Kaydı yaz ─────────────────────────────────────────────────
  const { data: log, error: insertErr } = await admin
    .from("kilometer_logs")
    .insert({
      company_id: (vehicle.company_id as string) || companyId,
      vehicle_id: vehicleId,
      user_id: userId,
      kilometer_value: kilometerValue,
      previous_kilometer: previousKilometer,
      photo_url: photoUrl,
    })
    .select("id, created_at")
    .single();

  if (insertErr || !log) {
    console.error("[kilometer-logs] insert failed:", insertErr);
    return NextResponse.json({ error: "Kayıt oluşturulamadı." }, { status: 500 });
  }

  // ── Araç km'sini güncelle (dashboard kartına yansısın) ────────
  if (kilometerValue > ((vehicle.mileage as number) ?? 0)) {
    const { error: kmErr } = await admin
      .from("vehicles")
      .update({ mileage: kilometerValue, updated_at: new Date().toISOString() })
      .eq("id", vehicleId);

    if (kmErr) {
      console.error("[kilometer-logs] vehicle mileage update failed:", kmErr);
    }
  }

  // ── Tüm atanmış araçlar bu token döneminde girildiyse token'ı kapat ──
  const { data: allAssignments } = await admin
    .from("vehicle_assignments")
    .select("vehicle_id")
    .eq("driver_id", userId);

  const assignedIds = [
    ...new Set(
      (allAssignments ?? []).map((a) => a.vehicle_id as string).concat(
        allAssignments?.length ? [] : [tokenRow.vehicle_id as string],
      ),
    ),
  ].filter(Boolean);

  const { data: submittedLogs } = await admin
    .from("kilometer_logs")
    .select("vehicle_id")
    .eq("user_id", userId)
    .in("vehicle_id", assignedIds)
    .gte("created_at", tokenCreatedAt);

  const submittedSet = new Set((submittedLogs ?? []).map((l) => l.vehicle_id as string));
  // Az önce kaydettiğimiz aracı da ekle
  submittedSet.add(vehicleId);

  const remaining = assignedIds.filter((id) => !submittedSet.has(id));
  const allDone = remaining.length === 0;

  if (allDone) {
    await admin
      .from("kilometer_log_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);
  }

  return NextResponse.json({
    ok: true,
    id: log.id,
    kilometerValue,
    previousKilometer,
    vehiclePlate: vehicle.plate,
    vehicleId,
    createdAt: log.created_at,
    remainingVehicleIds: remaining,
    allDone,
  });
}
