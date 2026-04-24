import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyName, fullName, email, password } = body;

    if (!companyName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Lütfen tüm alanları doldurun." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Kullanıcıyı auth.users tablosuna ekle
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Kullanıcının anında giriş yapabilmesi için e-postayı onaylı kabul ediyoruz
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Kullanıcı oluşturulamadı." },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 2. Şirketi oluştur
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: companyName })
      .select("id")
      .single();

    if (companyError) {
      // Hata durumunda oluşturulan auth kullanıcısını sil (Rollback)
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Şirket oluşturulurken bir hata meydana geldi." },
        { status: 500 }
      );
    }

    const companyId = companyData.id;

    // 3. Profili oluştur (Yeni kayıt olan ilk kişi olduğu için rolü 'manager' yapıyoruz)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        company_id: companyId,
        role: "manager",
        full_name: fullName,
      });

    if (profileError) {
      // Hata durumunda rollback
      await supabaseAdmin.from("companies").delete().eq("id", companyId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Profil oluşturulurken bir hata meydana geldi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Kayıt işlemi başarıyla tamamlandı." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Register Error:", err);
    return NextResponse.json(
      { error: "Sunucu tarafında beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
