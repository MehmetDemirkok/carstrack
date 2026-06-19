import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers } from "@/lib/notify";

const STATUS_LABELS: Record<string, string> = {
  open: "Açık", acknowledged: "Alındı", in_progress: "İşlemde", resolved: "Çözüldü",
};
const STATUS_ICONS: Record<string, string> = {
  open: "🆕", acknowledged: "👀", in_progress: "🔧", resolved: "✅",
};

/**
 * Bir arıza bildiriminin durumu değişince (örn. çözüldü) şirketteki yönetici +
 * operatörlere 4 kanaldan bilgi verir. Fire-and-forget.
 *
 *   POST /api/reports/notify-status  { reportId, fromStatus, toStatus, note }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      reportId?: unknown; fromStatus?: unknown; toStatus?: unknown; note?: unknown;
    };
    if (!body.reportId || typeof body.reportId !== "string" || typeof body.toStatus !== "string") {
      return NextResponse.json({ ok: false, error: "reportId/toStatus gerekli" }, { status: 400 });
    }
    const toStatus = body.toStatus;
    const fromStatus = typeof body.fromStatus === "string" ? body.fromStatus : undefined;
    const note = typeof body.note === "string" ? body.note.trim() : "";

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

    const { data: report, error: repErr } = await admin
      .from("vehicle_reports")
      .select("id, company_id, vehicle_id, reporter_id, title, vehicles(plate, brand, model)")
      .eq("id", body.reportId)
      .single();

    if (repErr || !report) {
      return NextResponse.json({ ok: false, error: "Bildirim bulunamadı" }, { status: 404 });
    }
    if ((report.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const vehicle = report.vehicles as { plate?: string; brand?: string; model?: string } | null;
    const vehicleName = vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "araç";
    const plate = vehicle?.plate || "—";
    const title = (report.title as string)?.trim() || "Arıza bildirimi";
    const toLabel = STATUS_LABELS[toStatus] || toStatus;
    const fromLabel = fromStatus ? (STATUS_LABELS[fromStatus] || fromStatus) : null;
    const icon = STATUS_ICONS[toStatus] || "🔄";
    const isResolved = toStatus === "resolved";

    const telegramMsg =
      `${icon} <b>Arıza Durumu ${isResolved ? "Çözüldü" : "Güncellendi"}</b>\n\n` +
      `🚗 <b>${vehicleName}</b> (${plate})\n` +
      `📌 <b>${title}</b>\n` +
      `🔄 Durum: ${fromLabel ? `<b>${fromLabel}</b> → ` : ""}<b>${toLabel}</b>` +
      (note ? `\n📝 ${note}` : "");

    const result = await dispatchToManagers(admin, companyId, {
      type: "report_status",
      severity: isResolved ? "info" : "warning",
      title: `${icon} Arıza ${isResolved ? "Çözüldü" : "Durumu Güncellendi"}`,
      body: `${vehicleName} (${plate}) — "${title}" durumu: ${toLabel}.`,
      telegram: telegramMsg,
      url: "/reports",
      tag: `report-status-${report.id}`,
      vehicleId: (report.vehicle_id as string) || undefined,
      vehiclePlate: plate,
      meta: { reportId: report.id, toStatus },
      email: {
        subject: `CarsTrack — Arıza ${isResolved ? "Çözüldü" : "Durumu Güncellendi"} (${plate})`,
        title: `Arıza ${isResolved ? "Çözüldü" : "Durumu Güncellendi"}`,
        emoji: icon,
        intro: `${vehicleName} (${plate}) için "${title}" arızasının durumu güncellendi.`,
        rows: [
          { label: "Araç", value: `${vehicleName} (${plate})` },
          { label: "Başlık", value: title },
          { label: "Yeni Durum", value: toLabel },
          ...(fromLabel ? [{ label: "Önceki Durum", value: fromLabel }] : []),
        ],
        note: note || undefined,
        accent: isResolved ? "#16a34a" : "#f97316",
        ctaUrl: "/reports",
        ctaLabel: "Bildirimi Görüntüle",
      },
    }, {
      // Arızayı açan kullanıcı (şoför/kullanıcı rolü) kendi bildiriminin
      // gelişmelerinden 4 kanaldan haberdar olsun.
      extraUserIds: [report.reporter_id as string].filter(Boolean),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/reports/notify-status error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
