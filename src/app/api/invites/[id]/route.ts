import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Bekleyen bir daveti iptal eder — sadece manager, sadece kendi şirketinin daveti. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const admin = createAdminClient();
  const { data: invite, error: fetchErr } = await admin
    .from("company_invites")
    .select("id, company_id, email")
    .eq("id", id)
    .single();

  if (fetchErr || !invite || (invite.company_id as string) !== (profile.company_id as string)) {
    return NextResponse.json({ error: "Davet bulunamadı." }, { status: 404 });
  }

  const { error } = await admin.from("company_invites").update({ status: "revoked" }).eq("id", id);
  if (error) return NextResponse.json({ error: "Davet iptal edilemedi." }, { status: 500 });

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    actor_name: (profile.full_name as string) || "Yönetici",
    action: "invite_revoked",
    entity_type: "company_invite",
    entity_id: invite.id,
    entity_label: invite.email,
  }).then(({ error: auditErr }) => { if (auditErr) console.error("[invites] audit log hatası:", auditErr); });

  return NextResponse.json({ ok: true });
}
