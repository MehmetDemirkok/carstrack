import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { buildMerchantOid, createPaytrToken, MERCHANT_ID } from "@/lib/paytr-server";
import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export async function POST(req: NextRequest) {
  try {
    // Ödeme sistemi henüz aktif değil
    if (process.env.NEXT_PUBLIC_PAYMENT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Ödeme sistemi yakında aktif olacak. Şu an tüm özellikler ücretsiz kullanılabilir." },
        { status: 503 }
      );
    }

    const { plan } = await req.json() as { plan: PlanType };

    if (!plan || !["pro", "fleet"].includes(plan)) {
      return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
    }

    if (!MERCHANT_ID) {
      return NextResponse.json(
        { error: "Ödeme sistemi henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, full_name, companies(plan)")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });

    const company = (
      Array.isArray(profile.companies) ? profile.companies[0] : profile.companies
    ) as { plan: string } | null;

    if (company?.plan === plan) {
      return NextResponse.json({ error: "Zaten bu plana sahipsiniz" }, { status: 400 });
    }

    const planDef = PLANS[plan];
    const merchantOid = buildMerchantOid(plan as "pro" | "fleet", profile.company_id);

    const headerStore = await headers();
    const forwarded   = headerStore.get("x-forwarded-for");
    const userIp      = forwarded?.split(",")[0]?.trim() ?? "127.0.0.1";

    const token = await createPaytrToken({
      merchantOid,
      userIp,
      email:              user.email ?? "",
      paymentAmountKurus: planDef.price * 100,
      userName:           profile.full_name ?? user.email ?? "",
      userAddress:        "Türkiye",
      userPhone:          "05000000000",
      userBasket:         [[`CarsTrack ${planDef.name} Plan`, (planDef.price * 100).toString(), 1]],
      okUrl:   `${APP_URL}/api/payment/callback?status=ok&oid=${merchantOid}`,
      failUrl: `${APP_URL}/api/payment/callback?status=fail`,
      testMode: process.env.PAYTR_TEST_MODE === "1",
    });

    return NextResponse.json({
      checkoutUrl: `https://www.paytr.com/odeme/guvenli/${token}`,
    });
  } catch (err) {
    console.error("PayTR checkout error:", err);
    return NextResponse.json({ error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
