import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cancelSubscription } from "@/lib/iyzico";

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
      .select("company_id, role, companies(iyzico_sub_ref, plan)")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "manager") {
      return NextResponse.json({ error: "Sadece yöneticiler aboneliği iptal edebilir" }, { status: 403 });
    }

    const company = (Array.isArray(profile.companies) ? profile.companies[0] : profile.companies) as { iyzico_sub_ref: string | null; plan: string } | null;
    if (!company?.iyzico_sub_ref) {
      return NextResponse.json({ error: "Aktif abonelik bulunamadı" }, { status: 404 });
    }

    const result = await cancelSubscription(company.iyzico_sub_ref);
    if (result.status !== "success") {
      return NextResponse.json({ error: (result.errorMessage as string) ?? "İptal başarısız" }, { status: 400 });
    }

    // Admin client ile güncelle
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminClient
      .from("companies")
      .update({ plan: "free", plan_expires_at: null, iyzico_sub_ref: null, plan_updated_at: new Date().toISOString() })
      .eq("id", profile.company_id);

    await adminClient
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("iyzico_sub_ref", company.iyzico_sub_ref);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
