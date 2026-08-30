import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Kayıt sayfasının (?invite=<token>) davet bilgisini önceden göstermesi için
 * herkese açık bir doğrulama uç noktası. Oturum gerektirmez (henüz hesabı yok).
 */
export async function GET(req: NextRequest) {
  // GÜVENLİK: oturumsuz, herkese açık uç nokta — token deneme/tarama sınırlanır.
  const rl = rateLimit(`invite-validate:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz bekleyin." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

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
