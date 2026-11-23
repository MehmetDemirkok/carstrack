import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToUser, type NotifyEvent } from "@/lib/notify";

/**
 * Bir araç bir sürücüye atanınca/atamadan kaldırılınca yalnızca o sürücüye
 * bilgi verir (yöneticiye değil — zaten kendisi atadı). Fire-and-forget.
 *
 *   POST /api/vehicles/notify-assigned  { vehicleId, driverId, action: "assigned" | "unassigned" }
 *   POST /api/vehicles/notify-assigned  { vehicleIds: [...], driverId, action }   (toplu atama)
 *
 * Toplu atamada sürücüye araç başına ayrı push/e-posta yağmaması için tek bir
 * özet bildirim gönderilir.
 */
const MAX_BULK_VEHICLES = 100;
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { vehicleId?: unknown; vehicleIds?: unknown; driverId?: unknown; action?: unknown };
    const vehicleIds = Array.isArray(body.vehicleIds)
      ? [...new Set(body.vehicleIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : typeof body.vehicleId === "string" && body.vehicleId
        ? [body.vehicleId]
        : [];
    if (vehicleIds.length === 0) {
      return NextResponse.json({ ok: false, error: "vehicleId gerekli" }, { status: 400 });
    }
    if (vehicleIds.length > MAX_BULK_VEHICLES) {
      return NextResponse.json({ ok: false, error: "Çok fazla araç" }, { status: 400 });
    }
    if (!body.driverId || typeof body.driverId !== "string") {
      return NextResponse.json({ ok: false, error: "driverId gerekli" }, { status: 400 });
    }
    const action = body.action === "unassigned" ? "unassigned" : "assigned";

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

    const { data: vehicles, error: vErr } = await admin
      .from("vehicles")
      .select("id, company_id, plate, brand, model")
      .in("id", vehicleIds);

    if (vErr || !vehicles || vehicles.length !== vehicleIds.length) {
      return NextResponse.json({ ok: false, error: "Araç bulunamadı" }, { status: 404 });
    }
    if (vehicles.some((v) => (v.company_id as string) !== companyId)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const isAssigned = action === "assigned";
    const describe = (v: (typeof vehicles)[number]) => {
      const plate = (v.plate as string) || "—";
      const name = `${v.brand ?? ""} ${v.model ?? ""}`.trim() || "Araç";
      return { plate, name, label: `${name} (${plate})` };
    };

    let event: NotifyEvent;
    if (vehicles.length === 1) {
      const vehicle = vehicles[0];
      const { plate, label } = describe(vehicle);
      event = {
        type: "vehicle_assigned",
        severity: "info",
        title: isAssigned ? "🚗 Araç Size Atandı" : "Araç Ataması Kaldırıldı",
        body: isAssigned
          ? `${label} artık size atandı.`
          : `${label} araç ataması sizden kaldırıldı.`,
        url: "/vehicles",
        tag: `vehicle-assign-${vehicle.id}-${body.driverId}`,
        vehicleId: vehicle.id as string,
        vehiclePlate: plate,
        meta: { action },
        email: {
          subject: `CarsTrack — ${isAssigned ? "Araç Size Atandı" : "Araç Ataması Kaldırıldı"} (${plate})`,
          title: isAssigned ? "Araç Size Atandı" : "Araç Ataması Kaldırıldı",
          emoji: isAssigned ? "🚗" : "↩️",
          intro: isAssigned
            ? `${label} artık size atandı.`
            : `${label} araç ataması sizden kaldırıldı.`,
          rows: [{ label: "Araç", value: label }],
          accent: isAssigned ? "#16a34a" : "#6b7280",
          ctaUrl: "/vehicles",
          ctaLabel: "Araçlarımı Görüntüle",
        },
      };
    } else {
      const described = vehicles.map(describe);
      const plates = described.map((d) => d.plate);
      const shortList = plates.length > 5 ? `${plates.slice(0, 5).join(", ")} ve ${plates.length - 5} araç daha` : plates.join(", ");
      const count = vehicles.length;
      event = {
        type: "vehicle_assigned",
        severity: "info",
        title: isAssigned ? `🚗 ${count} Araç Size Atandı` : `${count} Araç Ataması Kaldırıldı`,
        body: isAssigned
          ? `${shortList} artık size atandı.`
          : `${shortList} araç ataması sizden kaldırıldı.`,
        url: "/vehicles",
        tag: `vehicle-assign-bulk-${body.driverId}-${Date.now()}`,
        meta: { action, vehicleIds },
        email: {
          subject: `CarsTrack — ${isAssigned ? `${count} Araç Size Atandı` : `${count} Araç Ataması Kaldırıldı`}`,
          title: isAssigned ? `${count} Araç Size Atandı` : `${count} Araç Ataması Kaldırıldı`,
          emoji: isAssigned ? "🚗" : "↩️",
          intro: isAssigned
            ? `Aşağıdaki ${count} araç artık size atandı.`
            : `Aşağıdaki ${count} aracın ataması sizden kaldırıldı.`,
          rows: described.map((d) => ({ label: d.plate, value: d.name })),
          accent: isAssigned ? "#16a34a" : "#6b7280",
          ctaUrl: "/vehicles",
          ctaLabel: "Araçlarımı Görüntüle",
        },
      };
    }

    const result = await dispatchToUser(admin, companyId, body.driverId, event);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/vehicles/notify-assigned error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
