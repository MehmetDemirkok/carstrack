export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, getAuthUser, logAdminAction } from "@/lib/admin/api";
import { getAppUrl } from "@/lib/email/emailTypes";
import { sendPasswordResetEmail } from "@/lib/email/sendEmail";

type LinkType = "recovery" | "magiclink";

/**
 * Destek amaçlı bağlantı üretir:
 *  - `recovery`  → şifre sıfırlama bağlantısı (kullanıcıya e-postayla da gönderilebilir)
 *  - `magiclink` → tek seferlik giriş bağlantısı
 *
 * DİKKAT: magic link bağlantısı o kullanıcının oturumunu açar. Yalnızca
 * kullanıcının kendi talebi üzerine destek vermek için kullanılmalıdır ve
 * her üretim `admin_audit_log`'a yazılır.
 */
export const POST = withAdmin<{ id: string }>(async (req, ctx) => {
  const { db, params } = ctx;
  const body = (await req.json().catch(() => ({}))) as {
    type?: LinkType;
    send?: boolean;
  };
  const type: LinkType = body.type === "magiclink" ? "magiclink" : "recovery";

  const authUser = await getAuthUser(db, params.id);
  if (!authUser?.email) {
    return NextResponse.json({ error: "Kullanıcının e-posta adresi yok" }, { status: 404 });
  }

  const appUrl = getAppUrl();
  const { data, error } = await db.auth.admin.generateLink({
    type,
    email: authUser.email,
    options: {
      redirectTo: type === "recovery" ? `${appUrl}/reset-password` : `${appUrl}/dashboard`,
    },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? "Bağlantı üretilemedi" },
      { status: 400 },
    );
  }

  const link = data.properties.action_link;
  let emailed = false;

  // Şifre sıfırlamada bağlantıyı doğrudan kullanıcıya göndermek istenebilir.
  if (type === "recovery" && body.send === true) {
    const { data: prof } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", params.id)
      .maybeSingle();

    const result = await sendPasswordResetEmail(authUser.email, {
      recipientName: (prof?.full_name as string) || undefined,
      resetUrl: link,
      expiresInHours: 1,
      appUrl,
    });
    emailed = result.success;
  }

  await logAdminAction(ctx, {
    action: type === "recovery" ? "user_password_reset_link" : "user_magic_link",
    targetType: "user",
    targetId: params.id,
    targetLabel: authUser.email,
    meta: { type, emailed },
  });

  return NextResponse.json({ ok: true, link, emailed, email: authUser.email });
});
