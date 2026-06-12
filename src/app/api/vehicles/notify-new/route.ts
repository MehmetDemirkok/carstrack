import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers } from "@/lib/notify";

/**
 * Filoya yeni araç eklenince şirketteki yönetici + operatörlere 4 kanaldan
 * bilgi verir. Fire-and-forget.
 *
 *   POST /api/vehicles/notify-new  { vehicleId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { vehicleId?: unknown };
    if (!body.vehicleId || typeof body.vehicleId !== "string") {
      return NextResponse.json({ ok: false, error: "vehicleId gerekli" }, { status: 400 });
    }

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

    const { data: vehicle, error: vErr } = await admin
      .from("vehicles")
      .select("id, company_id, plate, brand, model, year")
      .eq("id", body.vehicleId)
      .single();

    if (vErr || !vehicle) {
      return NextResponse.json({ ok: false, error: "Araç bulunamadı" }, { status: 404 });
    }
    if ((vehicle.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const plate = (vehicle.plate as string) || "—";
    const brand = (vehicle.brand as string) || "";
    const model = (vehicle.model as string) || "";
    const year = vehicle.year ? String(vehicle.year) : "";
    const vehicleName = `${brand} ${model}`.trim() || "Araç";

    const telegramMsg =
      `🚙 <b>Yeni Araç Eklendi</b>\n\n` +
      `🚗 <b>${vehicleName}</b>${year ? ` (${year})` : ""}\n` +
      `🔢 Plaka: <b>${plate}</b>`;

    const result = await dispatchToManagers(admin, companyId, {
      type: "vehicle_new",
      severity: "info",
      title: "🚙 Yeni Araç Eklendi",
      body: `${vehicleName}${year ? ` (${year})` : ""} — ${plate} filoya eklendi.`,
      telegram: telegramMsg,
      url: `/vehicles/${vehicle.id}`,
      tag: `vehicle-new-${vehicle.id}`,
      vehicleId: vehicle.id as string,
      vehiclePlate: plate,
      email: {
        subject: `CarsTrack — Yeni Araç Eklendi (${plate})`,
        title: "Yeni Araç Eklendi",
        emoji: "🚙",
        intro: `Filoya yeni bir araç eklendi.`,
        rows: [
          { label: "Araç", value: vehicleName },
          { label: "Plaka", value: plate },
          ...(year ? [{ label: "Yıl", value: year }] : []),
        ],
        accent: "#7c3aed",
        ctaUrl: `/vehicles/${vehicle.id}`,
        ctaLabel: "Aracı Görüntüle",
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/vehicles/notify-new error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
