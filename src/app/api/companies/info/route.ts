import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Şirketin iletişim/fatura bilgilerini günceller — yalnızca manager. */
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

  let body: {
    name?: unknown; address?: unknown; phone?: unknown;
    email?: unknown; taxOffice?: unknown; taxNumber?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const fields: Record<string, unknown> = {
    name: body.name, address: body.address, phone: body.phone,
    email: body.email, taxOffice: body.taxOffice, taxNumber: body.taxNumber,
  };
  const dbColumn: Record<string, string> = {
    name: "name", address: "address", phone: "phone",
    email: "email", taxOffice: "tax_office", taxNumber: "tax_number",
  };

  const update: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (typeof value !== "string") {
      return NextResponse.json({ error: "Geçersiz alan değeri." }, { status: 400 });
    }
    const trimmed = value.trim();
    if (key === "name" && !trimmed) {
      return NextResponse.json({ error: "Şirket adı boş olamaz." }, { status: 400 });
    }
    update[dbColumn[key]] = trimmed || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update(update)
    .eq("id", profile.company_id);

  if (error) {
    return NextResponse.json({ error: "Şirket bilgileri kaydedilemedi." }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    actor_name: (profile.full_name as string) || "Yönetici",
    action: "company_info_updated",
    entity_type: "company",
    entity_id: profile.company_id,
    meta: update,
  }).then(({ error: auditErr }) => {
    if (auditErr) console.error("[companies/info] audit log hatası:", auditErr);
  });

  return NextResponse.json({ success: true });
}
