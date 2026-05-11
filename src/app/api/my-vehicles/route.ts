import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // 1. Authenticate via server client (reads auth cookie)
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ vehicles: [] }, { status: 401 });
    }

    // 2. Verify the user is a driver and get their company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "driver") {
      return NextResponse.json({ vehicles: [] });
    }

    // 3. Use admin client to bypass RLS on vehicle_assignments
    const admin = createAdminClient();

    const { data: assignments } = await admin
      .from("vehicle_assignments")
      .select("vehicle_id")
      .eq("driver_id", user.id);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ vehicles: [] });
    }

    const vehicleIds = (assignments as { vehicle_id: string }[]).map((a) => a.vehicle_id);

    // 4. Fetch the vehicles — scope to company_id for safety
    const { data: rows, error: vErr } = await admin
      .from("vehicles")
      .select("*")
      .in("id", vehicleIds)
      .eq("company_id", profile.company_id as string)
      .order("created_at", { ascending: false });

    if (vErr || !rows) {
      return NextResponse.json({ vehicles: [] });
    }

    return NextResponse.json({ vehicles: rows });
  } catch (err) {
    console.error("GET /api/my-vehicles error:", err);
    return NextResponse.json({ vehicles: [] }, { status: 500 });
  }
}
