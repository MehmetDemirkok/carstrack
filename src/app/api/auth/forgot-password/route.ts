import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Build redirectTo server-side from the request origin — never from client input —
    // to prevent open-redirect manipulation.
    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    const redirectTo = `${origin}/reset-password`;

    const admin = createAdminClient();

    // Securely verify the account exists using the service-role admin client.
    // generateLink() returns a 422 AuthApiError when no user matches the email,
    // which we translate to a clean { found: false } response.
    // The token produced here is immediately superseded by resetPasswordForEmail
    // below and is never exposed or sent anywhere.
    const { error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (linkError) {
      if (linkError.status === 422 || linkError.message.toLowerCase().includes("not found")) {
        return NextResponse.json({ found: false }, { status: 200 });
      }
      console.error("[forgot-password] generateLink error:", linkError.message);
      return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }

    // Account confirmed — trigger the recovery email through Supabase's configured
    // SMTP provider (Resend or built-in). Uses the anon key; no session required.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );

    if (resetError) {
      console.error("[forgot-password] resetPasswordForEmail error:", resetError.message);
      return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
    }

    return NextResponse.json({ found: true, sent: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
