import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToUser } from "@/lib/notify";

const STATUS_LABELS: Record<string, string> = {
  unpaid: "Ödenmedi", paid: "Ödendi", objected: "İtiraz Edildi", cancelled: "İptal",
};
const STATUS_ICONS: Record<string, string> = {
  unpaid: "⏳", paid: "✅", objected: "❓", cancelled: "🚫",
};

/**
 * Bir trafik cezasının ödeme durumu değişince, ceza bir sürücüye atanmışsa
 * yalnızca o sürücüye 3 kanaldan bilgi verir. Fire-and-forget.
 *
 *   POST /api/traffic-fines/notify-status  { fineId, toStatus }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { fineId?: unknown; toStatus?: unknown };
    if (!body.fineId || typeof body.fineId !== "string" || typeof body.toStatus !== "string") {
      return NextResponse.json({ ok: false, error: "fineId/toStatus gerekli" }, { status: 400 });
    }
    const toStatus = body.toStatus;

    const fromMeta = user.user_metadata?.company_id as string | undefined;
    let companyId = fromMeta ?? null;
    if (!companyId) {
      const { data: prof } = await supabase
        .from("profiles").select("company_id").eq("id", user.id).single();
      companyId = (prof?.company_id as string) ?? null;
    }
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 404 });
    }

    const admin = createAdminClient();

    const { data: fine, error: fineErr } = await admin
      .from("traffic_fines")
      .select("id, company_id, vehicle_id, driver_id, violation_type, amount, vehicles(plate, brand, model)")
      .eq("id", body.fineId)
      .single();

    if (fineErr || !fine) {
      return NextResponse.json({ ok: false, error: "Ceza bulunamadı" }, { status: 404 });
    }
    if ((fine.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const driverId = fine.driver_id as string | null;
    if (!driverId) {
      return NextResponse.json({ ok: true, recipients: 0, inApp: 0, push: 0, email: 0 });
    }

    const vehicle = fine.vehicles as { plate?: string; brand?: string; model?: string } | null;
    const vehicleName = vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "araç";
    const plate = vehicle?.plate || "—";
    const violationType = (fine.violation_type as string)?.trim() || "Trafik cezası";
    const label = STATUS_LABELS[toStatus] || toStatus;
    const icon = STATUS_ICONS[toStatus] || "🔄";
    const isPaid = toStatus === "paid";

    const result = await dispatchToUser(admin, companyId, driverId, {
      type: "fine_status",
      severity: isPaid ? "info" : "warning",
      title: `${icon} Trafik Cezası Durumu: ${label}`,
      body: `${vehicleName} (${plate}) — ${violationType} cezanızın durumu: ${label}.`,
      url: "/traffic-fines",
      tag: `fine-status-${fine.id}`,
      vehicleId: (fine.vehicle_id as string) || undefined,
      vehiclePlate: plate,
      meta: { fineId: fine.id, toStatus },
      email: {
        subject: `CarsTrack — Trafik Cezası Durumu: ${label} (${plate})`,
        title: `Trafik Cezası Durumu: ${label}`,
        emoji: icon,
        intro: `${vehicleName} (${plate}) için size ait cezanın durumu güncellendi.`,
        rows: [
          { label: "Araç", value: `${vehicleName} (${plate})` },
          { label: "İhlal", value: violationType },
          { label: "Yeni Durum", value: label },
        ],
        accent: isPaid ? "#16a34a" : "#f97316",
        ctaUrl: "/traffic-fines",
        ctaLabel: "Cezalarımı Görüntüle",
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/traffic-fines/notify-status error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
