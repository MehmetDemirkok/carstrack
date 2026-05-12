// iyzico (iyzipay) server-side client — NEVER import in client components
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require("iyzipay");

export const iyzipay = new Iyzipay({
  apiKey:    process.env.IYZIPAY_API_KEY    ?? "sandbox-apikey",
  secretKey: process.env.IYZIPAY_SECRET_KEY ?? "sandbox-secretkey",
  uri:       process.env.IYZIPAY_BASE_URL   ?? "https://sandbox-api.iyzipay.com",
});

export const IYZICO_CHECKOUT_URL =
  (process.env.IYZIPAY_BASE_URL ?? "https://sandbox-api.iyzipay.com") +
  "/subscribe/checkoutform/auth/ecom";

// Promisified wrapper
export function initSubscriptionCheckout(request: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    iyzipay.subscriptionCheckoutForm.initialize(request, (err: Error | null, result: Record<string, unknown>) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function retrieveSubscriptionCheckout(token: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    iyzipay.subscriptionCheckoutForm.retrieve({ token }, (err: Error | null, result: Record<string, unknown>) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function cancelSubscription(subscriptionReferenceCode: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    iyzipay.subscriptionCancel.cancel(
      { subscriptionReferenceCode },
      (err: Error | null, result: Record<string, unknown>) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}
