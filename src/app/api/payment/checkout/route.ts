import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe-server";
import type { PlanType } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json() as { plan: PlanType };

    if (!plan || !["pro", "fleet"].includes(plan)) {
      return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_IDS[plan as "pro" | "fleet"];
    if (!priceId) {
      return NextResponse.json(
        { error: "Ödeme sistemi henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    // Kullanıcı kimliği doğrula
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
      .select("company_id, full_name, companies(plan, stripe_customer_id)")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });

    const company = (
      Array.isArray(profile.companies) ? profile.companies[0] : profile.companies
    ) as { plan: string; stripe_customer_id: string | null } | null;

    if (company?.plan === plan) {
      return NextResponse.json({ error: "Zaten bu plana sahipsiniz" }, { status: 400 });
    }

    // Stripe Customer oluştur ya da mevcut olanı kullan
    let customerId = company?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.full_name ?? undefined,
        metadata: { company_id: profile.company_id, user_id: user.id },
      });
      customerId = customer.id;

      // company'ye kaydet
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await adminClient
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.company_id);
    }

    // Stripe Checkout Session — hosted payment form
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/api/payment/callback?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing`,
      subscription_data: {
        metadata: { company_id: profile.company_id, plan },
      },
      metadata: { company_id: profile.company_id, plan },
      locale: "tr",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: { name: "auto", address: "auto" },
      tax_id_collection: { enabled: true },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
