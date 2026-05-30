import crypto from "crypto";

const MERCHANT_ID   = process.env.PAYTR_MERCHANT_ID   ?? "";
const MERCHANT_KEY  = process.env.PAYTR_MERCHANT_KEY  ?? "";
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT ?? "";

if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
  console.warn("PayTR credentials are not set — payment features will not work.");
}

export { MERCHANT_ID, MERCHANT_KEY, MERCHANT_SALT };

// merchantOid: {planCode}{companyIdNoDashes}{randomHex6}
// planCode: P=pro, F=fleet — allows plan extraction on notification without extra DB lookups
export function buildMerchantOid(plan: "pro" | "fleet", companyId: string): string {
  const code    = plan === "pro" ? "P" : "F";
  const rawUuid = companyId.replace(/-/g, "");
  const random  = crypto.randomBytes(3).toString("hex");
  return `${code}${rawUuid}${random}`;
}

export function parseMerchantOid(merchantOid: string): { plan: "pro" | "fleet"; companyId: string } {
  const code    = merchantOid[0];
  const plan    = code === "P" ? "pro" : "fleet";
  const rawUuid = merchantOid.slice(1, 33);
  const companyId = rawUuid.replace(
    /(.{8})(.{4})(.{4})(.{4})(.{12})/,
    "$1-$2-$3-$4-$5"
  );
  return { plan, companyId };
}

interface TokenParams {
  merchantOid: string;
  userIp: string;
  email: string;
  paymentAmountKurus: number;
  userName: string;
  userAddress: string;
  userPhone: string;
  userBasket: Array<[string, string, number]>; // [name, price, qty]
  okUrl: string;
  failUrl: string;
  currency?: string;
  testMode?: boolean;
  noInstallment?: boolean;
  maxInstallment?: number;
  lang?: string;
}

export async function createPaytrToken(params: TokenParams): Promise<string> {
  const {
    merchantOid,
    userIp,
    email,
    paymentAmountKurus,
    userName,
    userAddress,
    userPhone,
    userBasket,
    okUrl,
    failUrl,
    currency       = "TL",
    testMode       = false,
    noInstallment  = true,
    maxInstallment = 0,
    lang           = "tr",
  } = params;

  const userBasketEncoded = Buffer.from(JSON.stringify(userBasket)).toString("base64");
  const testModeStr       = testMode ? "1" : "0";
  const noInstStr         = noInstallment ? "1" : "0";
  const maxInstStr        = maxInstallment.toString();

  const hashInput =
    MERCHANT_ID +
    userIp +
    merchantOid +
    email +
    paymentAmountKurus.toString() +
    userBasketEncoded +
    noInstStr +
    maxInstStr +
    currency +
    testModeStr;

  const paytrToken = crypto
    .createHmac("sha256", MERCHANT_KEY)
    .update(hashInput + MERCHANT_SALT)
    .digest("base64");

  const formData = new URLSearchParams({
    merchant_id:      MERCHANT_ID,
    user_ip:          userIp,
    merchant_oid:     merchantOid,
    email,
    payment_amount:   paymentAmountKurus.toString(),
    paytr_token:      paytrToken,
    user_basket:      userBasketEncoded,
    debug_on:         "0",
    no_installment:   noInstStr,
    max_installment:  maxInstStr,
    user_name:        userName,
    user_address:     userAddress,
    user_phone:       userPhone,
    merchant_ok_url:  okUrl,
    merchant_fail_url: failUrl,
    timeout_limit:    "30",
    currency,
    test_mode:        testModeStr,
    lang,
  });

  const res  = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    body:   formData,
  });
  const data = await res.json() as { status: string; token?: string; reason?: string };

  if (data.status !== "success" || !data.token) {
    throw new Error(data.reason ?? "PayTR token alınamadı");
  }

  return data.token;
}

export function verifyNotification(params: {
  merchantOid: string;
  status: string;
  totalAmount: string;
  hash: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", MERCHANT_KEY)
    .update(params.merchantOid + MERCHANT_SALT + params.status + params.totalAmount)
    .digest("base64");
  return expected === params.hash;
}
