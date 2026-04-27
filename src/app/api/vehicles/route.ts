import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ vehicles: [], error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ vehicles: [], error: "No company" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("company_id", resolvedCompanyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Vehicles list API error:", error);
      return NextResponse.json({ vehicles: [], error: error.message }, { status: 500 });
    }

    // Map to camelCase for frontend consistency
    const vehicles = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      plate: row.plate,
      brand: row.brand,
      model: row.model,
      year: row.year,
      color: (row.color as string) || "",
      image: (row.image as string) || "",
      mileage: (row.mileage as number) || 0,
      engineType: (row.engine_type as string) || "",
      engineVolume: (row.engine_volume as string) || "",
      power: (row.power as string) || "",
      fuelType: (row.fuel_type as string) || "Benzin",
      transmission: (row.transmission as string) || "Manuel",
      chassisNo: (row.chassis_no as string) || "",
      tireStatus: (row.tire_status as string) || "Yazlık",
      tireBrand: (row.tire_brand as string) || "",
      tireSize: (row.tire_size as string) || "",
      tireInstallDate: (row.tire_install_date as string) || "",
      tireMileage: (row.tire_mileage as number) || 0,
      batteryBrand: (row.battery_brand as string) || "",
      batteryCapacity: (row.battery_capacity as string) || "",
      batteryInstallDate: (row.battery_install_date as string) || "",
      insuranceCompany: (row.insurance_company as string) || "",
      insuranceExpiry: (row.insurance_expiry as string) || "",
      inspectionExpiry: (row.inspection_expiry as string) || "",
      lastServiceDate: (row.last_service_date as string) || "",
      lastServiceMileage: (row.last_service_mileage as number) || 0,
      nextServiceMileage: (row.next_service_mileage as number) || 0,
      maintenanceItems: (row.maintenance_items as unknown[]) || [],
      notes: (row.notes as string) || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ vehicles });
  } catch (err) {
    console.error("Vehicles list API unexpected error:", err);
    return NextResponse.json({ vehicles: [], error: "Internal error" }, { status: 500 });
  }
}
