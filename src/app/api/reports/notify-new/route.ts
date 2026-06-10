import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendPushToManagers } from "@/lib/push";
import { sendEventEmailToManagers } from "@/lib/notify-email";

const CATEGORY_LABELS: Record<string, string> = {
  engine: "Motor", brake: "Fren", tire: "Lastik", electrical: "Elektrik",
  fluid: "Sıvı / Yağ", warning_light: "Uyarı Işığı", body: "Kaporta", other: "Diğer",
};
const SEVERITY_LABELS: Record<string, string> = {
  low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik",
};
const SEVERITY_ICONS: Record<string, string> = {
  low: "⚪", medium: "🟡", high: "🟠", critical: "🔴",
};

/**
 * Bir sürücü yeni arıza/durum bildirimi oluşturduğunda şirketteki Telegram'a
 * bağlı yönetici ve operatörlere bilgi mesajı gönderir.
 *
 * UI tarafında bildirim oluşturulduktan SONRA fire-and-forget olarak çağrılır;
 * başarısız olsa bile bildirim akışını etkilemez.
 *
 *   POST /api/reports/notify-new  { reportId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { reportId?: unknown };
    if (!body.reportId || typeof body.reportId !== "string") {
      return NextResponse.json({ ok: false, error: "reportId gerekli" }, { status: 400 });
    }

    // Çağıranın şirketini belirle
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

    // Bildirimi çek (sürücü + araç bilgisiyle)
    const { data: report, error: reportErr } = await admin
      .from("vehicle_reports")
      .select("id, company_id, title, description, category, severity, created_at, photo_paths, vehicles(plate, brand, model), profiles!vehicle_reports_reporter_id_fkey(full_name)")
      .eq("id", body.reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ ok: false, error: "Bildirim bulunamadı" }, { status: 404 });
    }
    // Yetki: bildirim çağıranın şirketine ait olmalı
    if ((report.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Telegram'a bağlı yönetici/operatörleri bul
    const { data: managers } = await admin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("company_id", companyId)
      .in("role", ["manager", "operator"])
      .not("telegram_chat_id", "is", null);

    const chatIds = (managers ?? [])
      .map((m) => m.telegram_chat_id as string | null)
      .filter((c): c is string => !!c);

    const vehicle = report.vehicles as { plate?: string; brand?: string; model?: string } | null;
    const reporter = report.profiles as { full_name?: string } | null;
    const reporterName = reporter?.full_name || "Bir sürücü";
    const vehicleName = vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "araç";
    const plate = vehicle?.plate || "—";

    const when = new Date(report.created_at as string).toLocaleString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });

    const category = CATEGORY_LABELS[report.category as string] || "Diğer";
    const severity = SEVERITY_LABELS[report.severity as string] || "Orta";
    const sevIcon = SEVERITY_ICONS[report.severity as string] || "🟡";
    const title = (report.title as string)?.trim() || "Arıza bildirimi";
    const desc = (report.description as string)?.trim();
    const photoCount = Array.isArray(report.photo_paths) ? (report.photo_paths as unknown[]).length : 0;

    const msg =
      `🔧 <b>Yeni Arıza Bildirimi</b>\n\n` +
      `👤 <b>${reporterName}</b>, <b>${vehicleName}</b> (${plate}) için bir arıza bildirdi.\n` +
      `📌 <b>${title}</b>\n` +
      `🏷️ Kategori: <b>${category}</b>\n` +
      `${sevIcon} Önem: <b>${severity}</b>\n` +
      `🕒 ${when}` +
      (desc ? `\n📝 ${desc}` : "") +
      (photoCount > 0 ? `\n📷 ${photoCount} fotoğraf eklendi (uygulamada görüntüleyin)` : "");

    const settled = await Promise.allSettled(
      chatIds.map((chatId) => sendTelegramMessage(chatId, msg))
    );
    const notified = settled.filter((r) => r.status === "fulfilled").length;
    for (const r of settled) {
      if (r.status === "rejected") {
        console.error("[reports/notify-new] telegram gönderim hatası:", r.reason);
      }
    }

    // Telefon (Web Push) bildirimi — Telegram'dan bağımsız, aynı kitleye
    const pushed = await sendPushToManagers(admin, companyId, {
      title: "🔧 Yeni Arıza Bildirimi",
      body: `${reporterName}, ${vehicleName} (${plate}) için arıza bildirdi: ${title} (${severity})`,
      url: "/dashboard",
      tag: `report-${report.id}`,
    }).catch((err) => {
      console.error("[reports/notify-new] push gönderim hatası:", err);
      return 0;
    });

    // E-posta (Resend) — Telegram/push ile aynı kitleye, aynı olay
    const emailed = await sendEventEmailToManagers(admin, companyId, {
      subject: `CarsTrack — Yeni Arıza Bildirimi (${plate})`,
      title: "Yeni Arıza Bildirimi",
      emoji: "🔧",
      intro: `${reporterName}, ${vehicleName} (${plate}) için bir arıza bildirdi.`,
      rows: [
        { label: "Bildiren", value: reporterName },
        { label: "Araç", value: `${vehicleName} (${plate})` },
        { label: "Başlık", value: title },
        { label: "Kategori", value: category },
        { label: "Önem", value: severity },
        { label: "Tarih", value: when },
        ...(photoCount > 0 ? [{ label: "Fotoğraf", value: `${photoCount} adet (uygulamada)` }] : []),
      ],
      note: desc || undefined,
      accent: report.severity === "critical" ? "#dc2626" : "#f97316",
      ctaUrl: "/dashboard",
      ctaLabel: "Bildirimi Görüntüle",
    }).catch((err) => {
      console.error("[reports/notify-new] e-posta gönderim hatası:", err);
      return 0;
    });

    return NextResponse.json({ ok: true, notified, pushed, emailed });
  } catch (err) {
    console.error("POST /api/reports/notify-new error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
