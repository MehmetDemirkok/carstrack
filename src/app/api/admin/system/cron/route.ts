export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";
import { CRON_JOBS } from "@/lib/admin/crons";

/** İsteğin geldiği origin — Vercel önizleme/prod ayrımı olmadan doğru host. */
function originOf(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin;
}

/**
 * Bir cron işini elle tetikler.
 *
 * Cron uçları `CRON_SECRET` bearer bekler; bu route o gizli anahtarı sunucu
 * tarafında ekleyerek çağırır — anahtar tarayıcıya asla gitmez. Yalnızca
 * `vercel.json`'da tanımlı yollar çağrılabilir (SSRF'e kapalı allow-list).
 */
export const POST = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as { path?: string; dry?: boolean };
  const path = body.path ?? "";

  const job = CRON_JOBS.find((c) => c.path === path);
  if (!job) {
    return NextResponse.json({ error: "Tanımsız cron işi" }, { status: 400 });
  }
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET tanımlı değil — cron uçları çağrılamaz." },
      { status: 400 },
    );
  }

  const url = new URL(job.path, originOf(req));
  if (body.dry) url.searchParams.set("dry", "1");

  const started = Date.now();
  let status = 0;
  let responseBody: unknown = null;

  try {
    const res = await fetch(url.toString(), {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
        // withCronLogging bunu görüp çalışmayı "manual" olarak kaydeder.
        "x-admin-manual-run": "1",
      },
      cache: "no-store",
    });
    status = res.status;
    responseBody = await res.json().catch(async () => (await res.text()).slice(0, 500));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron çağrısı başarısız" },
      { status: 502 },
    );
  }

  const durationMs = Date.now() - started;

  await logAdminAction(ctx, {
    action: "cron_triggered",
    targetType: "system",
    targetId: job.path,
    targetLabel: job.label,
    meta: { status, durationMs, dry: body.dry === true },
  });

  console.info(`[admin/system/cron] ${job.path} → ${status} (${durationMs}ms)`);

  return NextResponse.json({ ok: status >= 200 && status < 300, status, durationMs, body: responseBody });
});
