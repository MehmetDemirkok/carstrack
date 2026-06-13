import { NextRequest, NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  // GÜVENLİK: Sırrı tercihen Authorization başlığından oku (query string
  // erişim loglarına/Referer'a sızabilir). Geriye dönük uyum için ?secret= de
  // kabul edilir ama önerilmez.
  const authHeader = req.headers.get("authorization");
  const headerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = headerSecret ?? new URL(req.url).searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL ortam değişkeni tanımlı değil" },
      { status: 500 }
    );
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  try {
    await setWebhook(webhookUrl);
    return NextResponse.json({ ok: true, webhookUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
