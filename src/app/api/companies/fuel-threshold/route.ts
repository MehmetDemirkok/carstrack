import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Şirketin yakıt anomali eşik yüzdesini günceller — yalnızca manager. */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  let body: { thresholdPct?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const thresholdPct = Number(body.thresholdPct);
  if (!Number.isFinite(thresholdPct) || thresholdPct < 1 || thresholdPct > 100) {
    return NextResponse.json({ error: "Eşik %1 ile %100 arasında olmalı." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ fuel_anomaly_threshold_pct: thresholdPct })
    .eq("id", profile.company_id);

  if (error) {
    return NextResponse.json({ error: "Eşik kaydedilemedi." }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    actor_name: (profile.full_name as string) || "Yönetici",
    action: "fuel_threshold_updated",
    entity_type: "company",
    entity_id: profile.company_id,
    meta: { thresholdPct },
  }).then(({ error: auditErr }) => {
    if (auditErr) console.error("[companies/fuel-threshold] audit log hatası:", auditErr);
  });

  return NextResponse.json({ thresholdPct });
}
