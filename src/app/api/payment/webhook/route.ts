import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// iyzico subscription webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const eventType = body.eventType as string;
    const subscriptionRef = body.subscriptionReferenceCode as string;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (eventType === "SUBSCRIPTION_ORDER_SUCCESS") {
      // Yenileme başarılı — plan_expires_at güncelle
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase
        .from("companies")
        .update({ plan_expires_at: periodEnd.toISOString(), plan_updated_at: new Date().toISOString() })
        .eq("iyzico_sub_ref", subscriptionRef);

      // Subscriptions tablosunu güncelle
      await supabase
        .from("subscriptions")
        .update({ period_end: periodEnd.toISOString(), updated_at: new Date().toISOString() })
        .eq("iyzico_sub_ref", subscriptionRef);
    }

    if (eventType === "SUBSCRIPTION_ORDER_FAILURE") {
      // Yenileme başarısız — şimdilik logla, 3 denemeden sonra iyzico iptal edecek
      console.warn("Subscription renewal failed:", subscriptionRef);
    }

    if (eventType === "SUBSCRIPTION_CANCELED" || eventType === "SUBSCRIPTION_CANCEL") {
      // İptal — planı free'ye düşür
      await supabase
        .from("companies")
        .update({ plan: "free", plan_expires_at: null, iyzico_sub_ref: null, plan_updated_at: new Date().toISOString() })
        .eq("iyzico_sub_ref", subscriptionRef);

      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("iyzico_sub_ref", subscriptionRef);
    }

    if (eventType === "SUBSCRIPTION_UPGRADED" || eventType === "SUBSCRIPTION_DOWNGRADED") {
      // Plan değişikliği — pricingPlanReferenceCode'dan yeni planı belirle
      const newPlanRef  = body.pricingPlanReferenceCode as string;
      const proRef      = process.env.IYZIPAY_PRO_PLAN_REF;
      const fleetRef    = process.env.IYZIPAY_FLEET_PLAN_REF;
      const newPlan     = newPlanRef === fleetRef ? "fleet" : newPlanRef === proRef ? "pro" : "free";

      await supabase
        .from("companies")
        .update({ plan: newPlan, plan_updated_at: new Date().toISOString() })
        .eq("iyzico_sub_ref", subscriptionRef);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
