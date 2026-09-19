export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 60 sn her Vercel planında geçerlidir; bütçe bunun altında tutulur. */
export const maxDuration = 60;

import { NextResponse, after } from "next/server";
import { drainEmailQueue, kickEmailQueueDrain } from "@/lib/admin/queue";
import { withCronLogging } from "@/lib/cron/record";

/**
 * Kuyruktaki toplu duyuruları parça parça gönderir.
 *
 * Bir çalışmada bitiremediğini satırda bırakır ve iş kalmışsa kendisini yeniden
 * tetikler (zincir); böylece kuyruk dakikalar içinde boşalır. Vercel Hobby planı
 * cron'ları günde bir kereyle sınırladığı için (beş dakikalık cron ifadesi
 * deploy'u reddettiriyor) gönderimin sürekliliği bu zincire dayanır; `vercel.json`'daki
 * günlük çalışma yalnızca emniyet ağıdır. Zamanı gelmemiş (scheduled_at gelecekte
 * olan) işlere dokunulmaz — "yarın 09:00'da gönder" böyle çalışır.
 */
const BUDGET_MS = 40_000;

/**
 * Zincirin en fazla kaç halka süreceği.
 *
 * Her halka ~40 sn gönderim yapar, yani ~30 dk'lık kesintisiz kuyruk demektir.
 * Sonrasında kalan varsa günlük cron ya da `/admin/system`'deki elle tetikleme
 * devralır — sonsuz zincir ihtimalini kapatmak için sınır şart.
 */
const MAX_CHAIN = 40;

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chain = Number(new URL(req.url).searchParams.get("chain")) || 0;
  const result = await drainEmailQueue(BUDGET_MS);

  console.log(
    `[cron/email-queue-drain] halka:${chain} iş:${result.processedJobs} gönderildi:${result.sent} hata:${result.failed} kalan:${result.remaining}`,
  );

  // Zinciri yalnızca gerçekten iş yaptıysak sürdürüyoruz: hiçbir işi kapamadıysak
  // (hepsi başka bir çalışmanın kilidinde) devamını o çalışma getirir, yoksa
  // çakışan çalışmalar birbirini çoğaltırdı.
  const shouldChain = result.hasMore && result.processedJobs > 0 && chain < MAX_CHAIN;
  if (shouldChain) {
    // Yanıt gönderildikten sonra tetiklenir; istemci beklemez.
    after(() => kickEmailQueueDrain(chain + 1));
  }

  return NextResponse.json({ ok: true, chain, chained: shouldChain, ...result });
}

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
const loggedHandler = withCronLogging("email-queue-drain", handler);

/**
 * Zincir halkaları `cron_runs`'a YAZILMAZ: tek bir duyuru onlarca satır
 * üretir ve `/admin/system`'deki "son çalışma" sağlığını okunmaz hale getirirdi.
 * Kayda giren, işi başlatan çalışmadır (günlük cron veya elle tetikleme).
 */
export function GET(req: Request): Promise<Response> {
  return req.headers.get("x-queue-chain") === "1" ? handler(req) : loggedHandler(req);
}
