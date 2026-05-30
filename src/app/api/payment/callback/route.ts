import { NextRequest, NextResponse } from "next/server";
import { parseMerchantOid } from "@/lib/paytr-server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

// PayTR, ödeme sonrası kullanıcıyı bu URL'e yönlendirir (GET).
// ok_url  → ?status=ok&oid={merchantOid}
// fail_url → ?status=fail
export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const oid    = searchParams.get("oid") ?? "";

  if (status === "ok" && oid) {
    try {
      const { plan } = parseMerchantOid(oid);
      return NextResponse.redirect(`${APP_URL}/payment/success?status=ok&plan=${plan}`);
    } catch {
      // geçersiz oid — genel başarı sayfasına yönlendir
    }
  }

  return NextResponse.redirect(`${APP_URL}/payment/success?status=error`);
}
