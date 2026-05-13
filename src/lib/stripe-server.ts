import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set — payment features will not work.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-04-22.dahlia",
});

export const STRIPE_PRICE_IDS = {
  pro:   process.env.STRIPE_PRO_PRICE_ID   ?? "",
  fleet: process.env.STRIPE_FLEET_PRICE_ID ?? "",
} as const;
