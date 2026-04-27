import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ records: [], error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's company_id
    const companyId = user.user_metadata?.company_id;
    let resolvedCompanyId = companyId;

    if (!resolvedCompanyId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      resolvedCompanyId = profile?.company_id;
    }

    if (!resolvedCompanyId) {
      return NextResponse.json({ records: [], error: "No company" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("service_records")
      .select("*")
      .eq("company_id", resolvedCompanyId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Records API error:", error);
      return NextResponse.json({ records: [], error: error.message }, { status: 500 });
    }

    // Map to camelCase for frontend consistency
    const records = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      date: row.date,
      type: row.type,
      title: row.title,
      mileage: row.mileage,
      serviceCenter: (row.service_center as string) || "",
      notes: (row.notes as string) || "",
      createdAt: row.created_at,
    }));

    return NextResponse.json({ records });
  } catch (err) {
    console.error("Records API unexpected error:", err);
    return NextResponse.json({ records: [], error: "Internal error" }, { status: 500 });
  }
}
