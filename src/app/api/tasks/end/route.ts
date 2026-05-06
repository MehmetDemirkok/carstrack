import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { taskId?: unknown; endKm?: unknown };

    if (!body.taskId || typeof body.taskId !== "string") {
      return NextResponse.json({ error: "taskId gerekli" }, { status: 400 });
    }
    const endKm = Number(body.endKm);
    if (!Number.isInteger(endKm) || endKm < 0) {
      return NextResponse.json({ error: "Geçersiz bitiş KM" }, { status: 400 });
    }

    // Fetch task (RLS ensures only the owner or manager can access it)
    const { data: task, error: fetchErr } = await supabase
      .from("vehicle_tasks")
      .select("id, start_km, vehicle_id, driver_id, status")
      .eq("id", body.taskId)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    }
    if (task.status !== "active") {
      return NextResponse.json({ error: "Bu görev zaten tamamlandı" }, { status: 409 });
    }
    if (endKm < (task.start_km as number)) {
      return NextResponse.json({
        error: `Bitiş KM, başlangıç KM'den (${task.start_km}) küçük olamaz`,
      }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("vehicle_tasks")
      .update({
        end_km: endKm,
        distance: endKm - (task.start_km as number),
        status: "completed",
        end_time: new Date().toISOString(),
      })
      .eq("id", body.taskId)
      .select("*, vehicles(plate, brand, model), profiles(full_name)")
      .single();

    if (error) {
      console.error("POST /api/tasks/end error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aracın KM bilgisini görevden gelen bitiş KM ile güncelle.
    // Sadece bitiş KM mevcut kayıtlı KM'den büyükse güncellenir.
    try {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("mileage")
        .eq("id", task.vehicle_id as string)
        .single();

      if (vehicle && endKm > (vehicle.mileage as number)) {
        await supabase
          .from("vehicles")
          .update({ mileage: endKm })
          .eq("id", task.vehicle_id as string);
      }
    } catch (kmErr) {
      // KM güncellemesi başarısız olsa bile görev tamamlanmış sayılır
      console.error("POST /api/tasks/end vehicle mileage update failed:", kmErr);
    }

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("POST /api/tasks/end unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
