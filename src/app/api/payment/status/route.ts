import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, companies(plan, plan_expires_at, iyzico_sub_ref)")
      .eq("id", user.id)
      .single();

    const company = (Array.isArray(profile?.companies) ? profile?.companies[0] : profile?.companies) as {
      plan: string; plan_expires_at: string | null; iyzico_sub_ref: string | null;
    } | null;

    return NextResponse.json({
      plan:          company?.plan ?? "free",
      planExpiresAt: company?.plan_expires_at ?? null,
      hasSubscription: !!company?.iyzico_sub_ref,
    });
  } catch (err) {
    console.error("Payment status error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
