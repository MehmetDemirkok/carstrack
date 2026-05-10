import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DRIVER_EMAIL     = "sofor@carstrack.app";
const DRIVER_PASSWORD  = "Sofor1234!";
const DRIVER_FULL_NAME = "Ahmet Şoför";

function ts(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function buildTasks(companyId: string, driverId: string, vehicleMap: Record<string, string>) {
  const v = (plate: string) => vehicleMap[plate] ?? Object.values(vehicleMap)[0];

  return [
    // 1. Bugün — aktif görev (henüz bitmemiş)
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 ABK 001"),  // BMW 320i
      start_km: 45200, end_km: null, distance: null,
      description: "Atatürk Havalimanı VIP karşılama transferi",
      status: "active",
      start_time: ts(0, 8, 30), end_time: null,
    },
    // 2. Dün — tamamlandı
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 RNO 112"),  // Renault Megane
      start_km: 31200, end_km: 31500, distance: 300,
      description: "Yönetim toplantısı transferi — Maslak Ofis",
      status: "completed",
      start_time: ts(1, 9, 0), end_time: ts(1, 12, 30),
    },
    // 3. 3 gün önce — tamamlandı
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 ABK 001"),  // BMW 320i
      start_km: 44900, end_km: 45200, distance: 300,
      description: "Havalimanı VIP transferi — misafir ekibi",
      status: "completed",
      start_time: ts(3, 6, 45), end_time: ts(3, 9, 15),
    },
    // 4. 5 gün önce — tamamlandı, uzun mesafe
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("06 VWK 789"),  // VW Tiguan
      start_km: 87400, end_km: 87612, distance: 212,
      description: "Levent ofisi müşteri ziyareti",
      status: "completed",
      start_time: ts(5, 9, 0), end_time: ts(5, 11, 30),
    },
    // 5. 8 gün önce — kısa şehir içi
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("35 TYK 234"),  // Toyota Corolla
      start_km: 27960, end_km: 28100, distance: 140,
      description: "Şehir içi evrak teslimatı — Beşiktaş noterlik",
      status: "completed",
      start_time: ts(8, 14, 0), end_time: ts(8, 15, 45),
    },
    // 6. 12 gün önce — lojistik
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 FRD 890"),  // Ford Transit
      start_km: 112600, end_km: 112800, distance: 200,
      description: "Depo teslimatı — İkitelli Lojistik Merkezi",
      status: "completed",
      start_time: ts(12, 8, 0), end_time: ts(12, 11, 0),
    },
    // 7. 18 gün önce — servis götürme
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("35 SKD 778"),  // Škoda Octavia
      start_km: 51800, end_km: 52100, distance: 300,
      description: "Araç servise götürme ve teslim alma — Škoda İzmir",
      status: "completed",
      start_time: ts(18, 10, 0), end_time: ts(18, 14, 30),
    },
    // 8. 25 gün önce — uzun şehirlerarası
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 FRD 890"),  // Ford Transit
      start_km: 111800, end_km: 112600, distance: 800,
      description: "Şehirlerarası kargo nakliyesi — İstanbul → Ankara",
      status: "completed",
      start_time: ts(25, 7, 0), end_time: ts(25, 15, 0),
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
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;

    let driverId: string;
    const existing = users.find((u) => u.email === DRIVER_EMAIL);

    if (existing) {
      driverId = existing.id;
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

    // 4. Always re-seed tasks (wipe existing)
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
