import { NextRequest, NextResponse } from "next/server";
import { isTelegramConfigured, getMe, getWebhookInfo } from "@/lib/telegram";

/**
 * Telegram entegrasyonu teşhis endpoint'i.
 * CRON_SECRET ile korunur. Botun token'ı geçerli mi, webhook doğru kurulmuş mu,
 * Telegram tarafında son bir hata var mı görmek için kullanılır.
 *
 *   GET /api/telegram/diagnose?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  // Sırrı tercihen Authorization başlığından oku (query string log sızıntısı).
  const authHeader = req.headers.get("authorization");
  const headerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = headerSecret ?? new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      hint: "TELEGRAM_BOT_TOKEN ortam değişkeni tanımlı değil. Vercel/ortam ayarlarına ekleyin.",
    });
  }

  const result: Record<string, unknown> = { ok: true, configured: true };

  try {
    result.getMe = await getMe();
  } catch (err) {
    result.ok = false;
    result.getMeError = String(err);
  }

  try {
    result.webhook = await getWebhookInfo();
  } catch (err) {
    result.ok = false;
    result.webhookError = String(err);
  }

  return NextResponse.json(result);
}
