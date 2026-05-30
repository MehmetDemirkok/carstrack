// PayTR sunucudan sunucuya bildirim endpoint'i.
// PayTR Merchant Panel → Entegrasyon → Bildirim URL olarak ayarlayın:
//   https://carstrack.app/api/payment/webhook
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyNotification, parseMerchantOid } from "@/lib/paytr-server";

async function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const merchantOid = (form.get("merchant_oid") as string) ?? "";
  const status      = (form.get("status")       as string) ?? "";
  const totalAmount = (form.get("total_amount") as string) ?? "";
  const hash        = (form.get("hash")         as string) ?? "";

  if (!merchantOid || !status || !totalAmount || !hash) {
    return new NextResponse("PAYTR_FAIL", { status: 400 });
  }

  if (!verifyNotification({ merchantOid, status, totalAmount, hash })) {
    console.error("PayTR hash doğrulaması başarısız:", merchantOid);
    return new NextResponse("PAYTR_FAIL", { status: 400 });
  }

  const { plan, companyId } = parseMerchantOid(merchantOid);
  const db = await getDb();

  if (status === "success") {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.from("companies").update({
      plan,
      plan_expires_at:  periodEnd,
      stripe_sub_id:    merchantOid, // PayTR sipariş numarası
      plan_updated_at:  new Date().toISOString(),
    }).eq("id", companyId);

    await db.from("subscriptions").insert({
      company_id:    companyId,
      plan,
      status:        "active",
      amount_cents:  parseInt(totalAmount, 10),
      currency:      "TRY",
      stripe_sub_id: merchantOid,
      period_start:  new Date().toISOString(),
      period_end:    periodEnd,
    });
  } else {
    console.warn("PayTR ödeme başarısız:", merchantOid, status);
  }

  // PayTR "OK" yanıtı bekliyor; aksi hâlde bildirimi tekrar gönderir.
  return new NextResponse("OK", { status: 200 });
}
