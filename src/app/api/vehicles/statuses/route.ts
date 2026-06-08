import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Şirketteki araçların anlık durumunu döndürür: hangi araçlar şu an
 * aktif bir görevde ("Görevde"), hangileri boşta ("Müsait").
 *
 * Sürücüler RLS nedeniyle başka sürücülerin görevlerini göremediğinden,
 * "araç meşgul mü?" sorusunu güvenle yanıtlamak için admin client kullanılır.
 * Yalnızca araç durumu için gereken minimum bilgi (vehicleId, sürücü adı,
 * başlangıç zamanı) döndürülür — görev detayları sızdırılmaz.
 *
 *   GET /api/vehicles/statuses
 *   → { activeVehicleIds: string[], active: [{ vehicleId, driverId, driverName, since }] }
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ activeVehicleIds: [], active: [] }, { status: 401 });
    }

    // Kullanıcının şirketini belirle
    const fromMeta = user.user_metadata?.company_id as string | undefined;
    let companyId = fromMeta ?? null;
    if (!companyId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      companyId = (profile?.company_id as string) ?? null;
    }
    if (!companyId) {
      return NextResponse.json({ activeVehicleIds: [], active: [] }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: tasks, error } = await admin
      .from("vehicle_tasks")
      .select("vehicle_id, driver_id, start_time, profiles(full_name)")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (error) {
      console.error("GET /api/vehicles/statuses error:", error);
      return NextResponse.json({ activeVehicleIds: [], active: [] }, { status: 500 });
    }

    const active = (tasks ?? []).map((t: Record<string, unknown>) => {
      const prof = t.profiles as { full_name?: string } | null;
      return {
        vehicleId: t.vehicle_id as string,
        driverId: t.driver_id as string,
        driverName: prof?.full_name ?? undefined,
        since: t.start_time as string,
      };
    });

    const activeVehicleIds = Array.from(new Set(active.map((a) => a.vehicleId)));
    return NextResponse.json({ activeVehicleIds, active });
  } catch (err) {
    console.error("GET /api/vehicles/statuses unexpected error:", err);
    return NextResponse.json({ activeVehicleIds: [], active: [] }, { status: 500 });
  }
}
