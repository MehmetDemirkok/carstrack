import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers } from "@/lib/notify";

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
      .select("id, company_id, start_km, start_time, description, vehicle_id, vehicles(plate, brand, model), profiles(full_name)")
      .eq("id", body.taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ ok: false, error: "Görev bulunamadı" }, { status: 404 });
    }
    // Yetki: görev çağıranın şirketine ait olmalı
    if ((task.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

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

    const telegramMsg =
      `🟢 <b>Görev Başladı</b>\n\n` +
      `👤 <b>${driverName}</b>, <b>${vehicleName}</b> (${plate}) ile göreve çıktı.\n` +
      `🕒 ${when}\n` +
      `📍 Başlangıç KM: <b>${startKm}</b>` +
      (desc ? `\n📝 ${desc}` : "");

    const result = await dispatchToManagers(admin, companyId, {
      type: "task_start",
      severity: "info",
      title: "🟢 Görev Başladı",
      body: `${driverName}, ${vehicleName} (${plate}) ile göreve çıktı. Başlangıç KM: ${startKm}`,
      telegram: telegramMsg,
      url: "/dashboard",
      tag: `task-start-${task.id}`,
      vehicleId: (task.vehicle_id as string) || undefined,
      vehiclePlate: plate,
      email: {
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
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/tasks/notify-start error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
