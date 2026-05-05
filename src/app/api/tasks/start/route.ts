import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function resolveCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const fromMeta = user.user_metadata?.company_id as string | undefined;
  if (fromMeta) return fromMeta;
  const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  return (data?.company_id as string) ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = await resolveCompanyId(supabase, user);
    if (!companyId) {
      return NextResponse.json({ error: "No company" }, { status: 404 });
    }

    const body = await req.json() as { vehicleId?: unknown; startKm?: unknown; description?: unknown };

    if (!body.vehicleId || typeof body.vehicleId !== "string") {
      return NextResponse.json({ error: "vehicleId gerekli" }, { status: 400 });
    }
    const startKm = Number(body.startKm);
    if (!Number.isInteger(startKm) || startKm < 0) {
      return NextResponse.json({ error: "Geçersiz başlangıç KM" }, { status: 400 });
    }

    // Check for existing active task
    const { data: existing } = await supabase
      .from("vehicle_tasks")
      .select("id")
      .eq("driver_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Zaten aktif bir göreviniz var" }, { status: 409 });
    }

    const { data: inserted, error } = await supabase
      .from("vehicle_tasks")
      .insert({
        company_id: companyId,
        vehicle_id: body.vehicleId,
        driver_id: user.id,
        start_km: startKm,
        description: typeof body.description === "string" ? body.description.trim() : "",
        status: "active",
        start_time: new Date().toISOString(),
      })
      .select("*, vehicles(plate, brand, model), profiles(full_name)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Zaten aktif bir göreviniz var" }, { status: 409 });
      }
      console.error("POST /api/tasks/start error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks/start unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
