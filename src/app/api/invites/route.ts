import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInviteToken } from "@/lib/invite-code";
import { sendNotificationEmail } from "@/lib/email/sendEmail";
import { getAppUrl } from "@/lib/email/emailTypes";

const ROLE_LABELS: Record<string, string> = {
  manager: "Şirket Yetkilisi",
  operator: "Operatör",
  user: "Kullanıcı",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireManager() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    return { error: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }) } as const;
  }

  return {
    user,
    companyId: profile.company_id as string,
    actorName: (profile.full_name as string) || "Yönetici",
  } as const;
}

/** Şirketin bekleyen (status='pending') davetlerini listeler — sadece manager. */
export async function GET() {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_invites")
    .select("id, email, role, status, created_at, expires_at")
    .eq("company_id", auth.companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Davetler alınamadı." }, { status: 500 });
  return NextResponse.json({ invites: data ?? [] });
}

/** Yeni e-posta daveti oluşturur/yeniler ve gönderir — sadece manager. */
export async function POST(req: NextRequest) {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body?.role === "string" ? body.role : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }
  if (!["manager", "operator", "user"].includes(role)) {
    return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 });
  }

  const admin = createAdminClient();
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();

  // Aynı e-posta için bekleyen bir davet varsa yenile (rol/token/süre güncellenir),
  // yoksa yeni satır ekle.
  const { data: existing } = await admin
    .from("company_invites")
    .select("id")
    .eq("company_id", auth.companyId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  let inviteId: string;
  if (existing) {
    inviteId = existing.id as string;
    const { error } = await admin
      .from("company_invites")
      .update({ role, token, expires_at: expiresAt, invited_by: auth.user.id, created_at: new Date().toISOString() })
      .eq("id", inviteId);
    if (error) return NextResponse.json({ error: "Davet güncellenemedi." }, { status: 500 });
  } else {
    const { data: inserted, error } = await admin
      .from("company_invites")
      .insert({ company_id: auth.companyId, email, role, token, expires_at: expiresAt, invited_by: auth.user.id })
      .select("id")
      .single();
    if (error || !inserted) return NextResponse.json({ error: "Davet oluşturulamadı." }, { status: 500 });
    inviteId = inserted.id as string;
  }

  const { data: company } = await admin.from("companies").select("name").eq("id", auth.companyId).single();
  const companyName = (company?.name as string) || "CarsTrack";
  const roleLabel = ROLE_LABELS[role] ?? role;
  const inviteUrl = `${getAppUrl()}/register?invite=${token}`;

  await sendNotificationEmail(email, `${companyName} sizi CarsTrack'e davet etti`, {
    recipientName: undefined,
    title: "Ekibe Davet Edildiniz",
    emoji: "✉️",
    intro: `${auth.actorName}, sizi "${companyName}" şirketine "${roleLabel}" rolüyle davet etti.`,
    rows: [
      { label: "Şirket", value: companyName },
      { label: "Rol", value: roleLabel },
    ],
    note: "Bu bağlantı 7 gün geçerlidir.",
    severity: "info",
    ctaUrl: inviteUrl,
    ctaLabel: "Daveti Kabul Et",
  }).catch((e) => { console.error("[invites] e-posta gönderim hatası:", e); return null; });

  await admin.from("audit_logs").insert({
    company_id: auth.companyId,
    actor_id: auth.user.id,
    actor_name: auth.actorName,
    action: "invite_sent",
    entity_type: "company_invite",
    entity_id: inviteId,
    entity_label: email,
  }).then(({ error }) => { if (error) console.error("[invites] audit log hatası:", error); });

  return NextResponse.json({ ok: true });
}
