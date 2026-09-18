export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { withAdmin } from "@/lib/admin/api";
import { AdminBroadcastEmail } from "@/emails/templates/AdminBroadcast";
import { getAppUrl } from "@/lib/email/emailTypes";

/**
 * Duyurunun gerçek HTML çıktısını döner — panel bunu bir iframe'de gösterir.
 * Gönderimle BİREBİR aynı şablondan üretilir, ayrı bir "önizleme" kopyası yok.
 */
export const POST = withAdmin(async (req) => {
  const body = (await req.json()) as {
    title?: string;
    body?: string;
    ctaUrl?: string;
    ctaLabel?: string;
    signature?: string;
    recipientName?: string;
  };

  const html = await render(
    AdminBroadcastEmail({
      recipientName: body.recipientName || "Mehmet",
      title: body.title || "Başlık",
      body: body.body || "",
      ctaUrl: body.ctaUrl || undefined,
      ctaLabel: body.ctaLabel || undefined,
      signature: body.signature || undefined,
      appUrl: getAppUrl(),
    }),
  );

  return NextResponse.json({ html });
});
