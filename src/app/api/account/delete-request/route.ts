import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/sendEmail";
import { activeRows, isDeactivatedRow } from "@/lib/member-status";

/** Supabase'de "süresiz ban" pratikte çok uzun bir süre vermektir. */
const BAN_FOREVER = "876000h";

type SelfRow = {
  id: string;
  company_id: string | null;
  role: string;
  full_name: string | null;
  deactivated_at?: string | null;
};

type Eligibility = { allowed: true } | { allowed: false; reason: string; status: number };

/**
 * Hesap kapatılabilir mi? Ayarlar'daki dialog açılırken (GET) ve işlemin
 * kendisinde (POST) aynı kurallar uygulanır — kullanıcı şifresini girip
 * "SİL" yazdıktan sonra engelle karşılaşmasın.
 */
async function checkEligibility(admin: ReturnType<typeof createAdminClient>, self: SelfRow): Promise<Eligibility> {
  if (self.role === "manager" && self.company_id) {
    const { data: managers } = await admin
      .from("profiles")
      .select("*")
      .eq("company_id", self.company_id)
      .eq("role", "manager");
    const otherActive = activeRows(managers).filter((m) => (m as { id: string }).id !== self.id);
    if (otherActive.length === 0) {
      return {
        allowed: false,
        status: 400,
        reason: "Şirketinizin tek yöneticisisiniz. Hesabınızı silmeden önce Ekip sayfasından başka bir kullanıcıyı yönetici yapın ya da destek ekibiyle iletişime geçin.",
      };
    }
  }

  // Aktif seyahatteki sürücü kapanırsa görev sonsuza dek "aktif" kalır.
  const { count: activeTaskCount } = await admin
    .from("vehicle_tasks")
    .select("id", { count: "exact", head: true })
    .eq("driver_id", self.id)
    .eq("status", "active");
  if ((activeTaskCount ?? 0) > 0) {
    return {
      allowed: false,
      status: 409,
      reason: "Şu anda aktif bir seyahatiniz var. Hesabınızı silmeden önce Görevler sayfasından seyahati bitirin.",
    };
  }

  return { allowed: true };
}

async function loadSelf() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const admin = createAdminClient();
  // select("*"): deactivated_at sütunu (20261115b) yoksa sorgu düşmesin.
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return { error: NextResponse.json({ error: "Profil bulunamadı." }, { status: 404 }) } as const;

  return { user, admin, profile: profile as SelfRow } as const;
}

/** Hesap kapatılabilir mi? → { allowed, reason? } (Ayarlar dialogu açılırken). */
export async function GET() {
  const ctx = await loadSelf();
  if ("error" in ctx) return ctx.error;
  const result = await checkEligibility(ctx.admin, ctx.profile);
  return NextResponse.json(result.allowed ? { allowed: true } : { allowed: false, reason: result.reason });
}

/**
 * Hesap silme talebi. Kimlik doğrulaması (mevcut şifre) istemci tarafında
 * ayarlar sayfasında yapılır (bkz. handleDeleteAccount) — bu uç yalnızca
 * geçerli oturuma güvenir.
 *
 * Görev, ceza, servis geçmişi gibi kayıtlar başka tablolardan referans
 * aldığından (foreign key) burada anında `auth.users` silmiyoruz. Bunun
 * yerine ekipten çıkarmayla (PATCH /api/members/[id]) aynı pasifleştirme
 * uygulanır ve tam veri silme talebi destek ekibine iletilir:
 *   1. Auth hesabı kalıcı olarak askıya alınır (giriş kapanır)
 *   2. profiles.deactivated_at yazılır → RLS kapanır, cron'lar/bildirimler
 *      bu kişiyi alıcı saymaz, sürücü listelerinden düşer
 *   3. Araç atamaları ve push abonelikleri temizlenir
 * `deactivation_ban` false yazılır: yönetici üyeyi geri alsa bile hesap
 * silme banı kalkmaz (bkz. CLAUDE.md > Multi-tenancy).
 */
export async function POST() {
  const ctx = await loadSelf();
  if ("error" in ctx) return ctx.error;
  const { user, admin, profile } = ctx;

  const eligibility = await checkEligibility(admin, profile);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason }, { status: eligibility.status });
  }

  // 1) Girişi kalıcı olarak kapat — auth.users satırı ve ilişkili kayıtlar korunur.
  const { error: banError } = await admin.auth.admin.updateUserById(user.id, { ban_duration: BAN_FOREVER });
  if (banError) {
    console.error("POST /api/account/delete-request ban error:", banError);
    return NextResponse.json({ error: "Hesap kapatılamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }

  // 2) Pasifleştir (migration uygulanmamışsa sütun yoktur — ban yine geçerli).
  if ("deactivated_at" in profile && !isDeactivatedRow(profile)) {
    const { error: updErr } = await admin
      .from("profiles")
      .update({ deactivated_at: new Date().toISOString(), deactivated_by: user.id, deactivation_ban: false })
      .eq("id", user.id);
    if (updErr) console.error("[account/delete-request] pasifleştirme hatası:", updErr);
  }

  // 3) Atamaları ve push aboneliklerini temizle (başarısızlık işlemi geri almaz).
  const [{ error: asgErr }, { error: pushErr }] = await Promise.all([
    admin.from("vehicle_assignments").delete().eq("driver_id", user.id),
    admin.from("push_subscriptions").delete().eq("user_id", user.id),
  ]);
  if (asgErr) console.error("[account/delete-request] atama silme hatası:", asgErr);
  if (pushErr) console.error("[account/delete-request] push aboneliği silme hatası:", pushErr);

  const inbox =
    process.env.FEEDBACK_INBOX_EMAIL ||
    process.env.EMAIL_SUPPORT_ADDRESS ||
    process.env.RESEND_REPLY_TO ||
    "mehmetdemirkok@gmail.com";

  const senderName = profile.full_name || user.email || "Bir kullanıcı";

  await sendNotificationEmail(
    inbox,
    `CarsTrack — Hesap Silme Talebi (${senderName})`,
    {
      title: "Hesap Silme Talebi",
      emoji: "🗑️",
      intro: `${senderName} hesabının kalıcı olarak silinmesini talep etti. Giriş erişimi kapatıldı; verilerin kalıcı silinmesi elle onaylanmalı.`,
      rows: [
        { label: "Kullanıcı", value: senderName },
        { label: "E-posta", value: user.email ?? "—" },
        { label: "Rol", value: profile.role ?? "—" },
        { label: "Kullanıcı ID", value: user.id },
        { label: "Şirket ID", value: profile.company_id ?? "—" },
      ],
      severity: "critical",
    },
  ).catch((err) => console.error("POST /api/account/delete-request e-posta hatası:", err));

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_id: user.id,
    actor_name: senderName,
    action: "account_delete_requested",
    entity_type: "profile",
    entity_id: user.id,
  }).then(({ error: auditErr }) => {
    if (auditErr) console.error("[account/delete-request] audit log hatası:", auditErr);
  });

  return NextResponse.json({ ok: true });
}
