import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/emails";

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

    // generateLink() both verifies the user exists (422 = not found) and returns
    // the signed action_link that we embed in our Resend email. We never call
    // resetPasswordForEmail() — Supabase sends no email of its own.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
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

    const resetLink = linkData.properties.action_link;

    const { error: emailError } = await sendPasswordResetEmail(normalizedEmail, resetLink);

    if (emailError) {
      console.error("[forgot-password] resend error:", emailError);
      return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
    }

    return NextResponse.json({ found: true, sent: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
