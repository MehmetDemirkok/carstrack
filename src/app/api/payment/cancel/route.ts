import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe-server";

export async function POST(req: NextRequest) {
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
      .select("company_id, role, companies(stripe_sub_id, plan)")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "manager") {
      return NextResponse.json({ error: "Sadece şirket yetkilileri aboneliği iptal edebilir" }, { status: 403 });
    }

    const company = (
      Array.isArray(profile.companies) ? profile.companies[0] : profile.companies
    ) as { stripe_sub_id: string | null; plan: string } | null;

    if (!company?.stripe_sub_id) {
      return NextResponse.json({ error: "Aktif abonelik bulunamadı" }, { status: 404 });
    }

    // Dönem sonunda iptal — kullanıcı kalan günleri kullanabilir
    await stripe.subscriptions.update(company.stripe_sub_id, {
      cancel_at_period_end: true,
    });

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await db.from("subscriptions").update({
      status:      "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq("stripe_sub_id", company.stripe_sub_id);

    return NextResponse.json({ success: true, message: "Aboneliğiniz dönem sonunda iptal edilecek." });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json({ error: "İptal işlemi başarısız" }, { status: 500 });
  }
}
