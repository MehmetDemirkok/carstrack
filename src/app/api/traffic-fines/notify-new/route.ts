import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToUser } from "@/lib/notify";

/**
 * Bir trafik cezası bir sürücüye atandığında (oluşturulurken veya sonradan)
 * yalnızca o sürücüye bilgi mesajı gönderir (yöneticiye değil — zaten kendisi
 * oluşturdu).
 *
 * UI tarafında ceza kaydedildikten SONRA fire-and-forget olarak çağrılır;
 * başarısız olsa bile akışı etkilemez.
 *
 *   POST /api/traffic-fines/notify-new  { fineId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { fineId?: unknown };
    if (!body.fineId || typeof body.fineId !== "string") {
      return NextResponse.json({ ok: false, error: "fineId gerekli" }, { status: 400 });
    }

    const fromMeta = user.user_metadata?.company_id as string | undefined;
    let companyId = fromMeta ?? null;
    if (!companyId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      companyId = (prof?.company_id as string) ?? null;
    }
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 404 });
    }

    const admin = createAdminClient();

    const { data: fine, error: fineErr } = await admin
      .from("traffic_fines")
      .select("id, company_id, vehicle_id, driver_id, fine_number, violation_type, amount, discounted_amount, fine_date, due_date, location, vehicles(plate, brand, model)")
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
    const amount = Number(fine.amount) || 0;
    const discountedAmount = fine.discounted_amount !== null && fine.discounted_amount !== undefined
      ? Number(fine.discounted_amount) : undefined;

    const formatTRY = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`;
    const fineDate = new Date(fine.fine_date as string).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul",
    });
    const dueDate = fine.due_date
      ? new Date(fine.due_date as string).toLocaleDateString("tr-TR", {
          day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul",
        })
      : undefined;

    const result = await dispatchToUser(admin, companyId, driverId, {
      type: "fine_assigned",
      severity: "warning",
      title: "🚨 Trafik Cezası Bildirimi",
      body: `${vehicleName} (${plate}) için ${formatTRY(amount)} tutarında ceza kaydınıza yansıtıldı: ${violationType}`,
      url: "/traffic-fines",
      tag: `fine-${fine.id}`,
      vehicleId: (fine.vehicle_id as string) || undefined,
      vehiclePlate: plate,
      meta: { fineId: fine.id },
      email: {
        subject: `CarsTrack — Trafik Cezası (${plate})`,
        title: "Trafik Cezası Bildirimi",
        emoji: "🚨",
        intro: `${vehicleName} (${plate}) için size yansıtılan bir trafik cezası kaydedildi.`,
        rows: [
          { label: "Araç", value: `${vehicleName} (${plate})` },
          { label: "İhlal", value: violationType },
          { label: "Tutar", value: formatTRY(amount) },
          ...(discountedAmount !== undefined
            ? [{ label: "İndirimli Tutar", value: formatTRY(discountedAmount) }]
            : []),
          { label: "Ceza Tarihi", value: fineDate },
          ...(dueDate ? [{ label: "Son Ödeme Tarihi", value: dueDate }] : []),
          ...(fine.fine_number ? [{ label: "Tebligat No", value: fine.fine_number as string }] : []),
          ...(fine.location ? [{ label: "Konum", value: fine.location as string }] : []),
        ],
        accent: "#f97316",
        ctaUrl: "/traffic-fines",
        ctaLabel: "Cezalarımı Görüntüle",
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/traffic-fines/notify-new error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
