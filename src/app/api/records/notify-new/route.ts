import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers } from "@/lib/notify";

const TYPE_LABELS: Record<string, string> = {
  routine: "Periyodik Bakım", repair: "Tamir", tire: "Lastik",
  inspection: "Muayene", battery: "Akü", other: "Diğer",
};

/**
 * Bir araca servis/bakım kaydı eklenince şirketteki yönetici + operatörlere
 * 4 kanaldan (zil + telegram + push + e-posta) bilgi verir. Fire-and-forget.
 *
 *   POST /api/records/notify-new  { recordId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { recordId?: unknown };
    if (!body.recordId || typeof body.recordId !== "string") {
      return NextResponse.json({ ok: false, error: "recordId gerekli" }, { status: 400 });
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

    const { data: record, error: recErr } = await admin
      .from("service_records")
      .select("id, company_id, vehicle_id, date, type, title, mileage, service_center, vehicles(plate, brand, model)")
      .eq("id", body.recordId)
      .single();

    if (recErr || !record) {
      return NextResponse.json({ ok: false, error: "Kayıt bulunamadı" }, { status: 404 });
    }
    if ((record.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const vehicle = record.vehicles as { plate?: string; brand?: string; model?: string } | null;
    const vehicleName = vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "araç";
    const plate = vehicle?.plate || "—";
    const typeLabel = TYPE_LABELS[record.type as string] || "Servis";
    const title = (record.title as string)?.trim() || typeLabel;
    const mileage = (record.mileage as number)?.toLocaleString("tr-TR") ?? "—";
    const serviceCenter = (record.service_center as string)?.trim();
    const dateStr = record.date
      ? new Date(record.date as string).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";

    const telegramMsg =
      `🛠️ <b>Servis Kaydı Eklendi</b>\n\n` +
      `🚗 <b>${vehicleName}</b> (${plate})\n` +
      `📌 <b>${title}</b>\n` +
      `🏷️ Tür: <b>${typeLabel}</b>\n` +
      `📍 KM: <b>${mileage}</b>\n` +
      `🗓️ ${dateStr}` +
      (serviceCenter ? `\n🔧 ${serviceCenter}` : "");

    const result = await dispatchToManagers(admin, companyId, {
      type: "record_new",
      severity: "info",
      title: "🛠️ Servis Kaydı Eklendi",
      body: `${vehicleName} (${plate}) için "${title}" (${typeLabel}) servis kaydı eklendi. KM: ${mileage}`,
      telegram: telegramMsg,
      url: `/vehicles/${record.vehicle_id}`,
      tag: `record-${record.id}`,
      vehicleId: (record.vehicle_id as string) || undefined,
      vehiclePlate: plate,
      meta: { recordId: record.id },
      email: {
        subject: `CarsTrack — Servis Kaydı Eklendi (${plate})`,
        title: "Servis Kaydı Eklendi",
        emoji: "🛠️",
        intro: `${vehicleName} (${plate}) için yeni bir servis kaydı eklendi.`,
        rows: [
          { label: "Araç", value: `${vehicleName} (${plate})` },
          { label: "Başlık", value: title },
          { label: "Tür", value: typeLabel },
          { label: "Kilometre", value: mileage },
          { label: "Tarih", value: dateStr },
          ...(serviceCenter ? [{ label: "Servis Noktası", value: serviceCenter }] : []),
        ],
        accent: "#0ea5e9",
        ctaUrl: `/vehicles/${record.vehicle_id}`,
        ctaLabel: "Aracı Görüntüle",
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/records/notify-new error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
