import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildVehicleIcs } from "@/lib/ics";

/** Araç belge bitiş tarihlerini (.ics) takvim dosyası olarak indirir. RLS ile korunur. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("id, brand, model, plate, insurance_expiry, kasko_expiry, green_card_expiry, inspection_expiry")
    .eq("id", id)
    .single();

  if (error || !vehicle) {
    return NextResponse.json({ error: "Araç bulunamadı." }, { status: 404 });
  }

  const ics = buildVehicleIcs({
    id: vehicle.id as string,
    brand: (vehicle.brand as string) || "",
    model: (vehicle.model as string) || "",
    plate: (vehicle.plate as string) || "",
    insuranceExpiry: (vehicle.insurance_expiry as string) || "",
    kaskoExpiry: (vehicle.kasko_expiry as string) || "",
    greenCardExpiry: (vehicle.green_card_expiry as string) || "",
    inspectionExpiry: (vehicle.inspection_expiry as string) || "",
  });

  const filename = `${(vehicle.plate as string) || "arac"}.ics`.replace(/[^\w.-]/g, "_");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
