import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe-server";
import type Stripe from "stripe";

const PLAN_BY_PRICE: Record<string, string> = {};

function buildPlanMap() {
  if (process.env.STRIPE_PRO_PRICE_ID)   PLAN_BY_PRICE[process.env.STRIPE_PRO_PRICE_ID]   = "pro";
  if (process.env.STRIPE_FLEET_PRICE_ID) PLAN_BY_PRICE[process.env.STRIPE_FLEET_PRICE_ID] = "fleet";
}

buildPlanMap();

function planFromSubscription(sub: Stripe.Subscription): string {
  const priceId = sub.items.data[0]?.price.id ?? "";
  return PLAN_BY_PRICE[priceId] ?? "free";
}

async function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = await getDb();

  switch (event.type) {

    case "checkout.session.completed": {
      const session   = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const companyId = session.metadata?.company_id;
      const plan      = session.metadata?.plan;
      const subId     = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

      if (!companyId || !plan || !subId) break;

      // Stripe subscription detaylarını al
      const sub       = await stripe.subscriptions.retrieve(subId);
      const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();
      const periodStart = new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000).toISOString();

      await db.from("companies").update({
        plan,
        plan_expires_at:     periodEnd,
        stripe_sub_id:       subId,
        stripe_customer_id:  typeof session.customer === "string" ? session.customer : session.customer?.id,
        plan_updated_at:     new Date().toISOString(),
      }).eq("id", companyId);

      await db.from("subscriptions").insert({
        company_id:    companyId,
        plan,
        status:        "active",
        amount_cents:  session.amount_total ?? 0,
        currency:      "TRY",
        stripe_sub_id: subId,
        period_start:  periodStart,
        period_end:    periodEnd,
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice     = event.data.object as Stripe.Invoice;
      // invoice.subscription may be string ID or expanded object
      const subId       = typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
        ? (invoice as unknown as { subscription: string }).subscription
        : ((invoice as unknown as { subscription?: { id: string } }).subscription?.id ?? null);

      if (!subId) break;
      // Skip the first payment — handled by checkout.session.completed
      if ((invoice as unknown as { billing_reason?: string }).billing_reason === "subscription_create") break;

      const sub       = await stripe.subscriptions.retrieve(subId);
      const plan      = planFromSubscription(sub);
      const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();

      await db.from("companies").update({
        plan,
        plan_expires_at:  periodEnd,
        plan_updated_at:  new Date().toISOString(),
      }).eq("stripe_sub_id", subId);

      await db.from("subscriptions").update({
        period_end:  periodEnd,
        status:      "active",
        updated_at:  new Date().toISOString(),
      }).eq("stripe_sub_id", subId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn("Payment failed for subscription:", (invoice as unknown as { subscription?: string }).subscription);
      break;
    }

    case "customer.subscription.updated": {
      const sub     = event.data.object as Stripe.Subscription;
      const plan    = planFromSubscription(sub);
      const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();

      await db.from("companies").update({
        plan,
        plan_expires_at:  periodEnd,
        plan_updated_at:  new Date().toISOString(),
      }).eq("stripe_sub_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await db.from("companies").update({
        plan:            "free",
        plan_expires_at: null,
        stripe_sub_id:   null,
        plan_updated_at: new Date().toISOString(),
      }).eq("stripe_sub_id", sub.id);

      await db.from("subscriptions").update({
        status:       "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }).eq("stripe_sub_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
