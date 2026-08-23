import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTimeZone } from "@/lib/timezone";

/** Şirketin saat dilimini günceller — yalnızca manager. */
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

  let body: { timezone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const timezone = resolveTimeZone(body.timezone);
  if (typeof body.timezone !== "string" || timezone !== body.timezone.trim()) {
    return NextResponse.json({ error: "Geçersiz saat dilimi." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ timezone })
    .eq("id", profile.company_id);

  if (error) {
    const missingColumn = /timezone|schema cache|column/i.test(error.message ?? "");
    return NextResponse.json({
      error: missingColumn
        ? "Saat dilimi kolonu henüz veritabanında yok. Migration uygulanmalı."
        : "Saat dilimi kaydedilemedi.",
    }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    actor_name: (profile.full_name as string) || "Yönetici",
    action: "timezone_updated",
    entity_type: "company",
    entity_id: profile.company_id,
    meta: { timezone },
  }).then(({ error: auditErr }) => {
    if (auditErr) console.error("[companies/timezone] audit log hatası:", auditErr);
  });

  return NextResponse.json({ timezone });
}
