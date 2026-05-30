import crypto from "crypto";

const API_KEY    = process.env.IYZICO_API_KEY    ?? "";
const API_SECRET = process.env.IYZICO_API_SECRET ?? "";
const BASE_URL   = process.env.IYZICO_BASE_URL   ?? "https://sandbox-api.iyzipay.com";

if (!API_KEY || !API_SECRET) {
  console.warn("iyzico credentials are not set — iyzico payment features will not work.");
}

export { API_KEY, API_SECRET, BASE_URL };

// conversationId: {planCode}{companyIdNoDashes}{randomHex6}
// planCode: P=pro, F=fleet — same scheme as PayTR merchantOid
export function buildConversationId(plan: "pro" | "fleet", companyId: string): string {
  const code    = plan === "pro" ? "P" : "F";
  const rawUuid = companyId.replace(/-/g, "");
  const random  = crypto.randomBytes(3).toString("hex");
  return `${code}${rawUuid}${random}`;
}

export function parseConversationId(id: string): { plan: "pro" | "fleet"; companyId: string } {
  const code    = id[0];
  const plan    = code === "P" ? "pro" : "fleet";
  const rawUuid = id.slice(1, 33);
  const companyId = rawUuid.replace(
    /(.{8})(.{4})(.{4})(.{4})(.{12})/,
    "$1-$2-$3-$4-$5"
  );
  return { plan, companyId };
}

// iyzico PKI string format: [key=value,key2=value2]
function toPki(obj: Record<string, unknown>): string {
  const parts = Object.keys(obj)
    .sort()
    .flatMap((key) => {
      const val = obj[key];
      if (val === null || val === undefined) return [];
      if (Array.isArray(val)) {
        const items = val.map((item) =>
          typeof item === "object" && item !== null
            ? toPki(item as Record<string, unknown>)
            : String(item)
        );
        return [`${key}=[${items.join(",")}]`];
      }
      if (typeof val === "object") {
        return [`${key}=${toPki(val as Record<string, unknown>)}`];
      }
      return [`${key}=${val}`];
    });
  return `[${parts.join(",")}]`;
}

function buildHeaders(body: Record<string, unknown>): Record<string, string> {
  const randomKey = crypto.randomBytes(16).toString("hex");
  const pki       = toPki(body);
  const hash      = crypto
    .createHash("sha256")
    .update(API_SECRET + randomKey + pki)
    .digest("base64");

  return {
    "Content-Type":         "application/json",
    Authorization:          `IYZWS ${API_KEY}:${hash}`,
    "x-iyzi-rnd":           randomKey,
    "x-iyzi-client-version": "carstrack-v1.0.0",
  };
}

export interface CheckoutFormRequest {
  conversationId: string;
  price: string;
  paidPrice: string;
  currency?: string;
  basketId: string;
  paymentGroup?: string;
  callbackUrl: string;
  enabledInstallments?: number[];
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  };
  shippingAddress: { contactName: string; city: string; country: string; address: string };
  billingAddress:  { contactName: string; city: string; country: string; address: string };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }>;
}

export interface CheckoutFormResponse {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  token?: string;
  checkoutFormContent?: string;
  tokenExpireTime?: number;
  paymentPageUrl?: string;
}

export async function initializeCheckoutForm(
  params: CheckoutFormRequest,
): Promise<CheckoutFormResponse> {
  const body: Record<string, unknown> = {
    locale:              "tr",
    conversationId:      params.conversationId,
    price:               params.price,
    paidPrice:           params.paidPrice,
    currency:            params.currency ?? "TRY",
    basketId:            params.basketId,
    paymentGroup:        params.paymentGroup ?? "SUBSCRIPTION",
    callbackUrl:         params.callbackUrl,
    enabledInstallments: params.enabledInstallments ?? [1],
    buyer:               params.buyer,
    shippingAddress:     params.shippingAddress,
    billingAddress:      params.billingAddress,
    basketItems:         params.basketItems,
  };

  const res = await fetch(`${BASE_URL}/payment/iyzipos/checkoutform/initialize`, {
    method:  "POST",
    headers: buildHeaders(body),
    body:    JSON.stringify(body),
  });

  return res.json() as Promise<CheckoutFormResponse>;
}

export interface RetrieveFormRequest {
  conversationId: string;
  token: string;
}

export interface RetrieveFormResponse {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  paymentStatus?: string;
  price?: string;
  paidPrice?: string;
  currency?: string;
  conversationId?: string;
  basketId?: string;
  paymentId?: string;
}

export async function retrieveCheckoutForm(
  params: RetrieveFormRequest,
): Promise<RetrieveFormResponse> {
  const body: Record<string, unknown> = {
    locale:         "tr",
    conversationId: params.conversationId,
    token:          params.token,
  };

  const res = await fetch(`${BASE_URL}/payment/iyzipos/checkoutform/auth/ecommerce/detail`, {
    method:  "POST",
    headers: buildHeaders(body),
    body:    JSON.stringify(body),
  });

  return res.json() as Promise<RetrieveFormResponse>;
}
