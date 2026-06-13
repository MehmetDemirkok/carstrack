import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/emails";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// GÜVENLİK: Bu uç nokta her zaman aynı jenerik yanıtı döndürür. Hesabın var
// olup olmadığını açıklamayız (kullanıcı sayımı engellenir) ve rate limit ile
// e-posta bombardımanı/Resend kota istismarı sınırlanır.
const GENERIC_OK = { ok: true } as const;

export async function POST(req: Request) {
  try {
    // Rate limit: IP başına 5 istek / 15 dk
    const rl = rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(GENERIC_OK, {
        status: 200,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body as { email?: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Build redirectTo server-side. Prefer the explicit APP_URL env var (set in
    // Vercel dashboard), then the request origin, then localhost as last resort.
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      req.headers.get("origin") ??
      "http://localhost:3000";
    const redirectTo = `${origin}/auth/callback?next=/reset-password`;

    const admin = createAdminClient();

    // generateLink() both verifies the user exists (422 = not found) and returns
    // the signed action_link that we embed in our Resend email. We never call
    // resetPasswordForEmail() — Supabase sends no email of its own.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (linkError) {
      // Kullanıcı yoksa (422) bile jenerik başarı döndür — sayımı engelle.
      if (linkError.status === 422 || linkError.message.toLowerCase().includes("not found")) {
        return NextResponse.json(GENERIC_OK, { status: 200 });
      }
      console.error("[forgot-password] generateLink error:", linkError.message);
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    const resetLink = linkData.properties.action_link;

    const { error: emailError } = await sendPasswordResetEmail(normalizedEmail, resetLink);

    if (emailError) {
      // Hata logla ama istemciye yine jenerik yanıt ver.
      console.error("[forgot-password] resend error:", emailError);
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    return NextResponse.json(GENERIC_OK, { status: 200 });
  } catch (err: unknown) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json(GENERIC_OK, { status: 200 });
  }
}
