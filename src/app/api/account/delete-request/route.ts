import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/sendEmail";

/**
 * Hesap silme talebi. Kimlik doğrulaması (mevcut şifre) istemci tarafında
 * ayarlar sayfasında yapılır (bkz. handleDeleteAccount) — bu uç yalnızca
 * geçerli oturuma güvenir.
 *
 * Görev, ceza, servis geçmişi gibi kayıtlar başka tablolardan referans
 * aldığından (foreign key) burada anında `auth.users` silmiyoruz — bunun
 * yerine hesabı kalıcı olarak "ban" ederek girişi kapatıyoruz ve tam veri
 * silme talebini destek ekibine e-posta ile iletip elle işleme alınmasını
 * sağlıyoruz.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profil bulunamadı." }, { status: 404 });

  const admin = createAdminClient();

  // Şirketin tek yöneticisiyse hesabı kapatmayı engelle — şirket sahipsiz kalmasın.
  if (profile.role === "manager") {
    const { data: managers } = await admin
      .from("profiles")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("role", "manager");
    if ((managers?.length ?? 0) <= 1) {
      return NextResponse.json({
        error: "Şirketinizin tek yöneticisisiniz. Hesabınızı silmeden önce başka bir kullanıcıyı yönetici yapın ya da destek ekibiyle iletişime geçin.",
      }, { status: 400 });
    }
  }

  // Girişi kalıcı olarak kapat (~100 yıl ban) — auth.users satırı ve ilişkili
  // kayıtlar korunur, yalnızca oturum açma engellenir.
  const { error: banError } = await admin.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
  if (banError) {
    console.error("POST /api/account/delete-request ban error:", banError);
    return NextResponse.json({ error: "Hesap kapatılamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }

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
