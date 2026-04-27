import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, fullName, email, password, companyName, inviteCode } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Lütfen tüm alanları doldurun." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // ─── Mode: join (existing company via invite code) ────────
    if (mode === "join") {
      if (!inviteCode) {
        return NextResponse.json({ error: "Davet kodu gereklidir." }, { status: 400 });
      }

      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id, name")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (companyError || !company) {
        return NextResponse.json({ error: "Geçersiz davet kodu. Yöneticinizden kontrol edin." }, { status: 400 });
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { company_id: company.id } // Store for non-recursive RLS
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      const userId = authData.user!.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        company_id: company.id,
        role: "driver",
        full_name: fullName,
      });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: "Profil oluşturulurken hata oluştu." }, { status: 500 });
      }

      return NextResponse.json({ message: "Şirkete başarıyla katıldınız.", companyName: company.name }, { status: 200 });
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
      user_metadata: { company_id: companyData.id }
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

    return NextResponse.json({ message: "Kayıt işlemi başarıyla tamamlandı." }, { status: 200 });
  } catch (err: unknown) {
    console.error("Register Error:", err);
    return NextResponse.json({ error: "Sunucu tarafında beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
