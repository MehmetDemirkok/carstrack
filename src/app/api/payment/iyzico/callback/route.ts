// iyzico callback endpoint.
// iyzico → Merchant Panel → Entegrasyon → Callback URL:
//   https://carstrack.app/api/payment/iyzico/callback
//
// iyzico, ödeme sonrası kullanıcının tarayıcısını bu adrese POST eder.
// token ile ödeme detayı sorgulanır; başarılıysa plan güncellenir.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { retrieveCheckoutForm, parseConversationId } from "@/lib/iyzico-server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const form  = await req.formData();
    const token = (form.get("token") as string | null) ?? "";

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/payment/success?status=error`);
    }

    // iyzico token retrieve için conversationId gerekiyor — token'dan çözemeyiz,
    // bu yüzden boş bir conversationId ile istiyoruz (iyzico kendi conversationId'sini dönüyor).
    const detail = await retrieveCheckoutForm({ conversationId: "", token });

    const conversationId = detail.conversationId ?? "";
    const isPaid =
      detail.status === "success" &&
      (detail.paymentStatus === "SUCCESS" || detail.paymentStatus === "INIT_SUCCEED");

    if (isPaid && conversationId) {
      try {
        const { plan, companyId } = parseConversationId(conversationId);
        const db = getDb();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await db.from("companies").update({
          plan,
          plan_expires_at: periodEnd,
          stripe_sub_id:   detail.paymentId ?? token,
          plan_updated_at: new Date().toISOString(),
        }).eq("id", companyId);

        await db.from("subscriptions").insert({
          company_id:    companyId,
          plan,
          status:        "active",
          amount_cents:  Math.round(parseFloat(detail.paidPrice ?? "0") * 100),
          currency:      "TRY",
          stripe_sub_id: detail.paymentId ?? token,
          period_start:  new Date().toISOString(),
          period_end:    periodEnd,
        });

        return NextResponse.redirect(`${APP_URL}/payment/success?status=ok&plan=${plan}`);
      } catch (parseErr) {
        console.error("iyzico callback: conversationId parse hatası:", conversationId, parseErr);
        return NextResponse.redirect(`${APP_URL}/payment/success?status=ok`);
      }
    }

    console.warn("iyzico ödeme başarısız veya beklemede:", detail.status, detail.paymentStatus, conversationId);
    return NextResponse.redirect(`${APP_URL}/payment/success?status=error`);
  } catch (err) {
    console.error("iyzico callback error:", err);
    return NextResponse.redirect(`${APP_URL}/payment/success?status=error`);
  }
}
