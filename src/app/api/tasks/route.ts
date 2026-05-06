import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function mapTask(row: Record<string, unknown>) {
  const vehicle = row.vehicles as { plate?: string; brand?: string; model?: string } | null;
  const profile = row.profiles as { full_name?: string; department?: string } | null;
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    startKm: row.start_km,
    endKm: row.end_km ?? undefined,
    distance: row.distance ?? undefined,
    description: (row.description as string) || "",
    status: row.status,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    createdAt: row.created_at,
    vehiclePlate: vehicle?.plate ?? undefined,
    vehicleName: vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() || undefined : undefined,
    driverName: profile?.full_name ?? undefined,
    driverDepartment: profile?.department || undefined,
  };
}

async function resolveCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const fromMeta = user.user_metadata?.company_id as string | undefined;
  if (fromMeta) return fromMeta;
  const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  return (data?.company_id as string) ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ tasks: [], error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await resolveCompanyId(supabase, user);
    if (!companyId) {
      return NextResponse.json({ tasks: [], error: "No company" }, { status: 404 });
    }

    const p = req.nextUrl.searchParams;
    const vehicleId = p.get("vehicleId");
    const driverId  = p.get("driverId");
    const dateFrom  = p.get("dateFrom");
    const dateTo    = p.get("dateTo");
    const status    = p.get("status");

    const department = p.get("department");

    let query = supabase
      .from("vehicle_tasks")
      .select("*, vehicles(plate, brand, model), profiles(full_name, department)")
      .eq("company_id", companyId)
      .order("start_time", { ascending: false });

    if (vehicleId) query = query.eq("vehicle_id", vehicleId);
    if (driverId)  query = query.eq("driver_id", driverId);
    if (dateFrom)  query = query.gte("start_time", dateFrom);
    if (dateTo)    query = query.lte("start_time", `${dateTo}T23:59:59`);
    if (status)    query = query.eq("status", status);

    // Department filter: resolve matching profile IDs first
    if (department) {
      const { data: deptMembers } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", companyId)
        .eq("department", department);

      if (!deptMembers || deptMembers.length === 0) {
        return NextResponse.json({ tasks: [] });
      }
      query = query.in("driver_id", deptMembers.map((m) => m.id));
    }

    const { data, error } = await query;
    if (error) {
      console.error("GET /api/tasks error:", error);
      return NextResponse.json({ tasks: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: (data ?? []).map((r) => mapTask(r as Record<string, unknown>)) });
  } catch (err) {
    console.error("GET /api/tasks unexpected error:", err);
    return NextResponse.json({ tasks: [], error: "Internal error" }, { status: 500 });
  }
}
