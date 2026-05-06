import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DRIVER_EMAIL    = "sofor@carstrack.app";
const DRIVER_PASSWORD = "Sofor1234!";
const DRIVER_FULL_NAME = "Ahmet Şoför";

function ts(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function buildTasks(
  companyId: string,
  driverId: string,
  vehicleMap: Record<string, string>
) {
  const v = (plate: string) =>
    vehicleMap[plate] ?? Object.values(vehicleMap)[0];

  return [
    // En yeni → en eski sırasıyla
    {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: v("34 ABK 001"),   // BMW 320i
      start_km: 45200,
      end_km: 45487,
      distance: 287,
      description: "İstanbul → Kartal teslimatı",
      status: "completed",
      start_time: ts(3, 8),
      end_time:   ts(3, 11),
    },
    {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: v("06 VWK 789"),   // VW Tiguan
      start_km: 87400,
      end_km: 87612,
      distance: 212,
      description: "Levent ofisi müşteri ziyareti",
      status: "completed",
      start_time: ts(5, 9),
      end_time:   ts(5, 11),
    },
    {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: v("35 TYK 234"),   // Toyota Corolla
      start_km: 28100,
      end_km: 28245,
      distance: 145,
      description: "Şehir içi ulaşım",
      status: "completed",
      start_time: ts(8, 14),
      end_time:   ts(8, 16),
    },
    {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: v("34 ABK 001"),   // BMW 320i
      start_km: 44900,
      end_km: 45200,
      distance: 300,
      description: "Havalimanı transferi — VIP misafir",
      status: "completed",
      start_time: ts(12, 6),
      end_time:   ts(12, 9),
    },
    {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: v("34 FRD 890"),   // Ford Transit
      start_km: 112600,
      end_km: 112800,
      distance: 200,
      description: "Depo teslimatı — İkitelli",
      status: "completed",
      start_time: ts(15, 8),
      end_time:   ts(15, 11),
    },
    {
      company_id: companyId,
      driver_id: driverId,
      vehicle_id: v("34 RNO 112"),   // Renault Megane
      start_km: 31315,
      end_km: 31500,
      distance: 185,
      description: "Yönetim toplantısı transferi",
      status: "completed",
      start_time: ts(20, 13),
      end_time:   ts(20, 16),
    },
  ];
}

export async function POST() {
  try {
    const admin = createAdminClient();

    // 1. Find the demo company (seeded by /api/demo/setup)
    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("invite_code", "DEMO0000")
      .single();

    if (!company) {
      return NextResponse.json(
        { error: "Demo şirketi bulunamadı. Önce yönetici demoyu başlatın." },
        { status: 404 }
      );
    }
    const companyId = company.id;

    // 2. Get vehicles of the demo company
    const { data: vehicles } = await admin
      .from("vehicles")
      .select("id, plate")
      .eq("company_id", companyId);

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json(
        { error: "Demo araçları bulunamadı. Önce yönetici demoyu başlatın." },
        { status: 404 }
      );
    }

    const vehicleMap: Record<string, string> = {};
    for (const v of vehicles) vehicleMap[v.plate] = v.id;

    // 3. Find or create driver user
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) throw listErr;

    let driverId: string;
    const existing = users.find((u) => u.email === DRIVER_EMAIL);

    if (existing) {
      driverId = existing.id;
      // Keep company_id metadata in sync
      await admin.auth.admin.updateUserById(driverId, {
        user_metadata: { company_id: companyId },
      });
    } else {
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: DRIVER_EMAIL,
        password: DRIVER_PASSWORD,
        email_confirm: true,
        user_metadata: { company_id: companyId },
      });
      if (authErr) throw authErr;
      driverId = authData.user.id;

      const { error: profileErr } = await admin.from("profiles").insert({
        id: driverId,
        company_id: companyId,
        role: "driver",
        full_name: DRIVER_FULL_NAME,
      });
      if (profileErr) throw profileErr;
    }

    // 4. Re-seed tasks (wipe existing so it's always fresh)
    await admin.from("vehicle_tasks").delete().eq("driver_id", driverId);

    const tasks = buildTasks(companyId, driverId, vehicleMap);
    const { error: taskErr } = await admin.from("vehicle_tasks").insert(tasks);
    if (taskErr) throw taskErr;

    return NextResponse.json({ email: DRIVER_EMAIL, password: DRIVER_PASSWORD });
  } catch (err: unknown) {
    console.error("Driver demo setup error:", err);
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
