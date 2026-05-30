import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { buildConversationId, initializeCheckoutForm, API_KEY } from "@/lib/iyzico-server";
import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export async function POST(req: NextRequest) {
  try {
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

    if (!API_KEY) {
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

    const planDef        = PLANS[plan];
    const conversationId = buildConversationId(plan as "pro" | "fleet", profile.company_id);

    const headerStore = await headers();
    const forwarded   = headerStore.get("x-forwarded-for");
    const userIp      = forwarded?.split(",")[0]?.trim() ?? "85.34.0.0";

    const priceStr = planDef.price.toFixed(2);

    const [firstName, ...rest] = (profile.full_name ?? user.email ?? "CarsTrack User").split(" ");
    const lastName = rest.join(" ") || "User";

    const result = await initializeCheckoutForm({
      conversationId,
      price:    priceStr,
      paidPrice: priceStr,
      currency: "TRY",
      basketId: conversationId,
      callbackUrl: `${APP_URL}/api/payment/iyzico/callback`,
      enabledInstallments: [1],
      buyer: {
        id:                  user.id,
        name:                firstName,
        surname:             lastName,
        gsmNumber:           "+905350000000",
        email:               user.email ?? "",
        identityNumber:      "74300864791",
        registrationAddress: "Türkiye",
        ip:                  userIp,
        city:                "Istanbul",
        country:             "Turkey",
      },
      shippingAddress: {
        contactName: profile.full_name ?? "Kullanıcı",
        city:        "Istanbul",
        country:     "Turkey",
        address:     "Türkiye",
      },
      billingAddress: {
        contactName: profile.full_name ?? "Kullanıcı",
        city:        "Istanbul",
        country:     "Turkey",
        address:     "Türkiye",
      },
      basketItems: [
        {
          id:        conversationId,
          name:      `CarsTrack ${planDef.name} Plan`,
          category1: "Yazılım",
          itemType:  "VIRTUAL",
          price:     priceStr,
        },
      ],
    });

    if (result.status !== "success" || !result.paymentPageUrl) {
      console.error("iyzico checkout form error:", result);
      return NextResponse.json(
        { error: result.errorMessage ?? "Ödeme başlatılamadı. Lütfen tekrar deneyin." },
        { status: 502 }
      );
    }

    return NextResponse.json({ paymentPageUrl: result.paymentPageUrl });
  } catch (err) {
    console.error("iyzico checkout error:", err);
    return NextResponse.json({ error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
