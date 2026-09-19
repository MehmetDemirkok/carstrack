export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 60 sn her Vercel planında geçerlidir; bütçe bunun altında tutulur. */
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { drainEmailQueue } from "@/lib/admin/queue";
import { withCronLogging } from "@/lib/cron/record";

/**
 * Kuyruktaki toplu duyuruları parça parça gönderir.
 *
 * Her 5 dakikada bir çalışır; bir çalışmada bitiremediğini satırda bırakır ve
 * bir sonraki çalışma kaldığı yerden devam eder. Zamanı gelmemiş (scheduled_at
 * gelecekte olan) işlere dokunmaz — "yarın 09:00'da gönder" böyle çalışır.
 */
const BUDGET_MS = 45_000;

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainEmailQueue(BUDGET_MS);

  console.log(
    `[cron/email-queue-drain] iş:${result.processedJobs} gönderildi:${result.sent} hata:${result.failed} kalan:${result.remaining}`,
  );

  return NextResponse.json({ ok: true, ...result });
}

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
export const GET = withCronLogging("email-queue-drain", handler);
