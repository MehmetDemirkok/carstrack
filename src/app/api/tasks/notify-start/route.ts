import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendPushToManagers } from "@/lib/push";
import { sendEventEmailToManagers } from "@/lib/notify-email";

/**
 * Bir görev başladığında (araç göreve çıktığında) şirketteki Telegram'a bağlı
 * yönetici ve operatörlere bilgi mesajı gönderir.
 *
 * UI tarafında görev oluşturulduktan SONRA fire-and-forget olarak çağrılır;
 * başarısız olsa bile görev akışını etkilemez.
 *
 *   POST /api/tasks/notify-start  { taskId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { taskId?: unknown };
    if (!body.taskId || typeof body.taskId !== "string") {
      return NextResponse.json({ ok: false, error: "taskId gerekli" }, { status: 400 });
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

    // Görevi çek (sürücü + araç bilgisiyle)
    const { data: task, error: taskErr } = await admin
      .from("vehicle_tasks")
      .select("id, company_id, start_km, start_time, description, vehicles(plate, brand, model), profiles(full_name)")
      .eq("id", body.taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ ok: false, error: "Görev bulunamadı" }, { status: 404 });
    }
    // Yetki: görev çağıranın şirketine ait olmalı
    if ((task.company_id as string) !== companyId) {
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

    const vehicle = task.vehicles as { plate?: string; brand?: string; model?: string } | null;
    const driver = task.profiles as { full_name?: string } | null;
    const driverName = driver?.full_name || "Bir sürücü";
    const vehicleName = vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "araç";
    const plate = vehicle?.plate || "—";

    const when = new Date(task.start_time as string).toLocaleString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });

    const startKm = (task.start_km as number)?.toLocaleString("tr-TR") ?? "—";
    const desc = (task.description as string)?.trim();

    const msg =
      `🟢 <b>Görev Başladı</b>\n\n` +
      `👤 <b>${driverName}</b>, <b>${vehicleName}</b> (${plate}) ile göreve çıktı.\n` +
      `🕒 ${when}\n` +
      `📍 Başlangıç KM: <b>${startKm}</b>` +
      (desc ? `\n📝 ${desc}` : "");

    const settled = await Promise.allSettled(
      chatIds.map((chatId) => sendTelegramMessage(chatId, msg))
    );
    const notified = settled.filter((r) => r.status === "fulfilled").length;
    for (const r of settled) {
      if (r.status === "rejected") {
        console.error("[tasks/notify-start] telegram gönderim hatası:", r.reason);
      }
    }

    // Telefon (Web Push) bildirimi — Telegram'dan bağımsız, aynı kitleye
    const pushed = await sendPushToManagers(admin, companyId, {
      title: "🟢 Görev Başladı",
      body: `${driverName}, ${vehicleName} (${plate}) ile göreve çıktı. Başlangıç KM: ${startKm}`,
      url: "/dashboard",
      tag: `task-start-${task.id}`,
    }).catch((err) => {
      console.error("[tasks/notify-start] push gönderim hatası:", err);
      return 0;
    });

    // E-posta (Resend) — Telegram/push ile aynı kitleye, aynı olay
    const emailed = await sendEventEmailToManagers(admin, companyId, {
      subject: `CarsTrack — Görev Başladı (${plate})`,
      title: "Görev Başladı",
      emoji: "🟢",
      intro: `${driverName}, ${vehicleName} (${plate}) ile göreve çıktı.`,
      rows: [
        { label: "Sürücü", value: driverName },
        { label: "Araç", value: `${vehicleName} (${plate})` },
        { label: "Tarih", value: when },
        { label: "Başlangıç KM", value: startKm },
      ],
      note: desc || undefined,
      accent: "#16a34a",
      ctaUrl: "/dashboard",
      ctaLabel: "Görevleri Görüntüle",
    }).catch((err) => {
      console.error("[tasks/notify-start] e-posta gönderim hatası:", err);
      return 0;
    });

    return NextResponse.json({ ok: true, notified, pushed, emailed });
  } catch (err) {
    console.error("POST /api/tasks/notify-start error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
