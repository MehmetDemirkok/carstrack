import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers } from "@/lib/notify";
import { sendWelcomeEmail } from "@/lib/email/sendEmail";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { generateInviteCode } from "@/lib/invite-code";

export async function POST(req: Request) {
  try {
    // GÜVENLİK: kayıt suistimalini sınırla — IP başına 5 deneme / saat
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json();
    const { mode, fullName, email, password, companyName, inviteCode, inviteToken } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Lütfen tüm alanları doldurun." }, { status: 400 });
    }

    // Girdi doğrulama (güvenlik): geçerli e-posta + minimum parola gücü
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Parola en az 8 karakter olmalıdır." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // ─── Mode: join (existing company via invite code) ────────
    if (mode === "join") {
      if (!inviteCode) {
        return NextResponse.json({ error: "Davet kodu gereklidir." }, { status: 400 });
      }

      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id, name, invite_code_expires_at")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (companyError || !company) {
        return NextResponse.json({ error: "Geçersiz davet kodu. Şirket yetkilinizden kontrol edin." }, { status: 400 });
      }

      if (
        company.invite_code_expires_at &&
        new Date(company.invite_code_expires_at as string).getTime() < Date.now()
      ) {
        return NextResponse.json(
          { error: "Bu davet kodunun süresi dolmuş. Şirket yetkilinizden yeni kod isteyin." },
          { status: 400 },
        );
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // GÜVENLİK: company_id YETKİLENDİRME için app_metadata'da tutulur
        // (yalnızca service-role yazabilir; RLS get_auth_company_id() bunu okur).
        // user_metadata yalnızca istemci tarafı hızlı yükleme içindir.
        app_metadata: { company_id: company.id },
        user_metadata: { company_id: company.id },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      const userId = authData.user!.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        company_id: company.id,
        role: "user",
        full_name: fullName,
      });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Profil oluşturulurken hata oluştu." }, { status: 500 });
      }

      // Yöneticilere "yeni sürücü katıldı" bildirimi — 4 kanaldan (akışı kesmez)
      await dispatchToManagers(supabaseAdmin, company.id as string, {
        type: "driver_new",
        severity: "info",
        title: "👋 Yeni Sürücü Katıldı",
        body: `${fullName} ekibe katıldı.`,
        telegram: `👋 <b>Yeni Sürücü Katıldı</b>\n\n👤 <b>${fullName}</b> ekibe katıldı.`,
        url: "/users",
        tag: `driver-new-${userId}`,
        meta: { driverId: userId },
        email: {
          subject: "CarsTrack — Yeni Sürücü Katıldı",
          title: "Yeni Sürücü Katıldı",
          emoji: "👋",
          intro: `${fullName} davet koduyla ekibinize katıldı.`,
          rows: [{ label: "Sürücü", value: fullName }],
          accent: "#0ea5e9",
          ctaUrl: "/users",
          ctaLabel: "Ekibi Görüntüle",
        },
      }).catch((e) => { console.error("[register] driver_new bildirim hatası:", e); return null; });

      // Yeni üyeye hoş geldin e-postası (akışı kesmez — başarısızlık yutulur)
      await sendWelcomeEmail(email, { recipientName: fullName }).catch((e) => {
        console.error("[register] welcome email hatası:", e);
        return null;
      });

      return NextResponse.json({ message: "Şirkete başarıyla katıldınız.", companyName: company.name }, { status: 200 });
    }

    // ─── Mode: invite (e-posta daveti ile katılım) ─────────────
    if (mode === "invite") {
      if (!inviteToken) {
        return NextResponse.json({ error: "Davet bağlantısı geçersiz." }, { status: 400 });
      }

      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("company_invites")
        .select("id, company_id, email, role, status, expires_at, companies(name)")
        .eq("token", inviteToken)
        .single();

      if (inviteError || !invite) {
        return NextResponse.json({ error: "Geçersiz davet bağlantısı." }, { status: 400 });
      }
      if (invite.status !== "pending") {
        return NextResponse.json({ error: "Bu davet artık geçerli değil." }, { status: 400 });
      }
      if (new Date(invite.expires_at as string).getTime() < Date.now()) {
        return NextResponse.json({ error: "Bu davetin süresi dolmuş." }, { status: 400 });
      }
      if ((invite.email as string).toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: "E-posta adresi davetle eşleşmiyor." }, { status: 400 });
      }

      const companyId = invite.company_id as string;
      const role = invite.role as "manager" | "operator" | "user";

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { company_id: companyId },
        user_metadata: { company_id: companyId },
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      const userId = authData.user!.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        company_id: companyId,
        role,
        full_name: fullName,
      });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Profil oluşturulurken hata oluştu." }, { status: 500 });
      }

      await supabaseAdmin
        .from("company_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      const invitedCompany = invite.companies as { name?: string } | null;

      // Yöneticilere "yeni üye katıldı" bildirimi — 4 kanaldan (akışı kesmez)
      await dispatchToManagers(supabaseAdmin, companyId, {
        type: "driver_new",
        severity: "info",
        title: "👋 Yeni Ekip Üyesi Katıldı",
        body: `${fullName} davetle ekibe katıldı.`,
        telegram: `👋 <b>Yeni Ekip Üyesi Katıldı</b>\n\n👤 <b>${fullName}</b> davetle ekibe katıldı.`,
        url: "/users",
        tag: `driver-new-${userId}`,
        meta: { driverId: userId },
        email: {
          subject: "CarsTrack — Yeni Ekip Üyesi Katıldı",
          title: "Yeni Ekip Üyesi Katıldı",
          emoji: "👋",
          intro: `${fullName} davetinizi kabul ederek ekibe katıldı.`,
          rows: [{ label: "Üye", value: fullName }],
          accent: "#0ea5e9",
          ctaUrl: "/users",
          ctaLabel: "Ekibi Görüntüle",
        },
      }).catch((e) => { console.error("[register] driver_new bildirim hatası:", e); return null; });

      // Yeni üyeye hoş geldin e-postası (akışı kesmez — başarısızlık yutulur)
      await sendWelcomeEmail(email, { recipientName: fullName }).catch((e) => {
        console.error("[register] welcome email hatası:", e);
        return null;
      });

      return NextResponse.json(
        { message: "Şirkete başarıyla katıldınız.", companyName: invitedCompany?.name ?? "" },
        { status: 200 },
      );
    }

    // ─── Mode: create (new company) ───────────────────────────
    if (!companyName) {
      return NextResponse.json({ error: "Şirket adı gereklidir." }, { status: 400 });
    }

    // 1. Create company first to get ID
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: companyName, invite_code: generateInviteCode() })
      .select("id")
      .single();

    if (companyError) {
      return NextResponse.json({ error: "Şirket oluşturulurken hata oluştu." }, { status: 500 });
    }

    // 2. Create user with company_id in metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // GÜVENLİK: company_id app_metadata'da (yetkilendirme kaynağı), user_metadata
      // yalnızca istemci hızlı yükleme için.
      app_metadata: { company_id: companyData.id },
      user_metadata: { company_id: companyData.id },
    });

    if (authError) {
      await supabaseAdmin.from("companies").delete().eq("id", companyData.id);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user!.id;

    // 3. Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      company_id: companyData.id,
      role: "manager",
      full_name: fullName,
    });

    if (profileError) {
      await supabaseAdmin.from("companies").delete().eq("id", companyData.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Profil oluşturulurken hata oluştu." }, { status: 500 });
    }

    // Yeni yöneticiye hoş geldin e-postası (akışı kesmez — başarısızlık yutulur)
    await sendWelcomeEmail(email, { recipientName: fullName }).catch((e) => {
      console.error("[register] welcome email hatası:", e);
      return null;
    });

    return NextResponse.json({ message: "Kayıt işlemi başarıyla tamamlandı." }, { status: 200 });
  } catch (err: unknown) {
    console.error("Register Error:", err);
    return NextResponse.json({ error: "Sunucu tarafında beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
