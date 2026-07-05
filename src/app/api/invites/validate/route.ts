import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Kayıt sayfasının (?invite=<token>) davet bilgisini önceden göstermesi için
 * herkese açık bir doğrulama uç noktası. Oturum gerektirmez (henüz hesabı yok).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token gerekli." }, { status: 400 });

  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("company_invites")
    .select("email, role, status, expires_at, companies(name)")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Geçersiz davet bağlantısı." }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Bu davet artık geçerli değil." }, { status: 410 });
  }
  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: "Bu davetin süresi dolmuş." }, { status: 410 });
  }

  const company = invite.companies as { name?: string } | null;
  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    companyName: company?.name ?? "CarsTrack",
  });
}
