import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

// Stripe success URL'den dönen session_id ile ödeme durumunu doğrula
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(`${APP_URL}/payment/success?status=error`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const plan    = session.metadata?.plan as PlanType | undefined;
    const planDef = plan ? PLANS[plan] : null;

    if (session.payment_status === "paid" && plan && planDef) {
      return NextResponse.redirect(
        `${APP_URL}/payment/success?status=ok&plan=${plan}&session_id=${sessionId}`
      );
    }

    return NextResponse.redirect(`${APP_URL}/payment/success?status=error&msg=payment_failed`);
  } catch (err) {
    console.error("Session verify error:", err);
    return NextResponse.redirect(`${APP_URL}/payment/success?status=error`);
  }
}
