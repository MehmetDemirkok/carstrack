import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInviteCode } from "@/lib/invite-code";

/** Şirketin davet kodunu yeniler (30 gün geçerlilik) — sadece manager. */
export async function POST() {
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
  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();

  const { error } = await admin
    .from("companies")
    .update({ invite_code: inviteCode, invite_code_expires_at: expiresAt })
    .eq("id", profile.company_id);

  if (error) return NextResponse.json({ error: "Davet kodu yenilenemedi." }, { status: 500 });

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    actor_name: (profile.full_name as string) || "Yönetici",
    action: "invite_code_regenerated",
    entity_type: "company",
    entity_id: profile.company_id,
  }).then(({ error: auditErr }) => { if (auditErr) console.error("[regenerate-invite-code] audit log hatası:", auditErr); });

  return NextResponse.json({ inviteCode, expiresAt });
}
