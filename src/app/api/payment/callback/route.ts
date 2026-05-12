import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { retrieveSubscriptionCheckout } from "@/lib/iyzico";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

// iyzico ödeme sonrası buraya POST atar
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null);
    const token = body?.get("token") as string | null
      ?? new URL(req.url).searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/payment/success?status=error&msg=token_missing`);
    }

    const result = await retrieveSubscriptionCheckout(token);

    if (result.status !== "success") {
      console.error("iyzico callback failure:", result);
      return NextResponse.redirect(
        `${APP_URL}/payment/success?status=error&msg=${encodeURIComponent((result.errorMessage as string) ?? "payment_failed")}`
      );
    }

    // Hangi plan satın alındı? subscriptionStatus ve customerReferenceCode var
    const subscriptionRef   = result.subscriptionReferenceCode as string;
    const customerRef       = result.customerReferenceCode as string;
    const pricingPlanRef    = result.pricingPlanReferenceCode as string;

    // Plan eşleştir
    const proRef   = process.env.IYZIPAY_PRO_PLAN_REF;
    const fleetRef = process.env.IYZIPAY_FLEET_PLAN_REF;
    const plan = pricingPlanRef === fleetRef ? "fleet" : pricingPlanRef === proRef ? "pro" : null;

    if (!plan) {
      console.error("Unknown pricing plan ref:", pricingPlanRef);
      return NextResponse.redirect(`${APP_URL}/payment/success?status=error&msg=unknown_plan`);
    }

    // Admin client ile company'yi güncelle
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Token'dan company_id bul — iyzico buyer.id = user.id
    const buyerId = result.buyer ? (result.buyer as { id: string }).id : null;
    if (!buyerId) {
      return NextResponse.redirect(`${APP_URL}/payment/success?status=error&msg=no_buyer`);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", buyerId)
      .single();

    if (!profile?.company_id) {
      return NextResponse.redirect(`${APP_URL}/payment/success?status=error&msg=no_company`);
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Company planını güncelle
    await supabase
      .from("companies")
      .update({
        plan,
        plan_expires_at:  periodEnd.toISOString(),
        iyzico_sub_ref:   subscriptionRef,
        iyzico_cust_ref:  customerRef,
        plan_updated_at:  new Date().toISOString(),
      })
      .eq("id", profile.company_id);

    // Subscriptions geçmişine kaydet
    await supabase.from("subscriptions").insert({
      company_id:       profile.company_id,
      plan,
      status:           "active",
      amount_cents:     plan === "pro" ? 29900 : 79900,
      currency:         "TRY",
      iyzico_sub_ref:   subscriptionRef,
      period_start:     new Date().toISOString(),
      period_end:       periodEnd.toISOString(),
    });

    return NextResponse.redirect(`${APP_URL}/payment/success?status=ok&plan=${plan}`);
  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(`${APP_URL}/payment/success?status=error&msg=server_error`);
  }
}

// iyzico bazen GET de yapabilir
export async function GET(req: NextRequest) {
  return POST(req);
}
