import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { initSubscriptionCheckout, IYZICO_CHECKOUT_URL } from "@/lib/iyzico";
import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      plan: PlanType;
      phone: string;
      address: string;
      city: string;
      identityNumber: string;
    };

    const { plan, phone, address, city, identityNumber } = body;

    if (!plan || !["pro", "fleet"].includes(plan)) {
      return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
    }

    const planDef = PLANS[plan];
    if (!planDef.iyzicoRef) {
      return NextResponse.json(
        { error: "Ödeme sistemi henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    // Kullanıcı bilgilerini al
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
      .select("id, full_name, company_id, companies(plan)")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });

    // Zaten bu plana sahipse engelle
    const companyData = (Array.isArray(profile.companies) ? profile.companies[0] : profile.companies) as { plan: string } | null;
    const currentPlan = companyData?.plan ?? "free";
    if (currentPlan === plan) {
      return NextResponse.json({ error: "Zaten bu plana sahipsiniz" }, { status: 400 });
    }

    const nameParts = (profile.full_name ?? "Kullanıcı").split(" ");
    const firstName = nameParts[0] ?? "Kullanıcı";
    const lastName  = nameParts.slice(1).join(" ") || firstName;
    const conversationId = uuidv4();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "85.34.78.112";

    const request = {
      locale: "tr",
      conversationId,
      callbackUrl: `${APP_URL}/api/payment/callback`,
      pricingPlanReferenceCode: planDef.iyzicoRef,
      subscriptionInitialStatus: "ACTIVE",
      buyer: {
        id: user.id,
        name: firstName,
        surname: lastName,
        identityNumber: identityNumber || "11111111111",
        email: user.email,
        gsmNumber: phone.startsWith("+") ? phone : `+90${phone.replace(/^0/, "")}`,
        registrationDate: new Date(user.created_at).toISOString().replace("T", " ").slice(0, 19),
        lastLoginDate: new Date().toISOString().replace("T", " ").slice(0, 19),
        registrationAddress: address || "Türkiye",
        city: city || "Istanbul",
        country: "Turkey",
        zipCode: "34000",
        ip,
      },
    };

    const result = await initSubscriptionCheckout(request);

    if (result.status !== "success") {
      console.error("iyzico checkout error:", result);
      return NextResponse.json(
        { error: (result.errorMessage as string) ?? "Ödeme başlatılamadı" },
        { status: 400 }
      );
    }

    // Token ile iyzico hosted checkout URL'i döndür
    const checkoutUrl = `${IYZICO_CHECKOUT_URL}?token=${result.token}`;
    return NextResponse.json({ checkoutUrl, token: result.token });
  } catch (err) {
    console.error("Payment checkout error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
