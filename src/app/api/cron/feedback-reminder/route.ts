export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchAnnouncement, type AnnouncementRecipient } from "@/lib/notify";
import { withCronLogging } from "@/lib/cron/record";

/**
 * HAFTALIK GERİ BİLDİRİM İSTEĞİ
 * ============================================================================
 * Kullanıcılardan ürünü geliştirmemize yardımcı olacak geri bildirim ister.
 * Uygulama içi zil + Web Push olarak gider (e-posta gönderilmez; haftalık
 * e-posta gürültü olurdu). Bildirim tıklanınca /feedback formu açılır.
 *
 * Kullanıcı bu hatırlatmayı son MIN_INTERVAL_DAYS gün içinde aldıysa tekrar
 * gönderilmez — cron yeniden çalışsa (retry) bile mükerrer bildirim olmaz.
 */

/** Aynı kullanıcıya bu aralıktan sık hatırlatma gönderilmez. Haftalık cron için 6 gün. */
const MIN_INTERVAL_DAYS = 6;
/** Dedup ve ayırt etme için meta.source değeri. */
const SOURCE = "feedback-reminder";
const DAY_MS = 86_400_000;

const TITLE = "CarsTrack'i birlikte geliştirelim";
const BODY =
  "Görüşleriniz bizim için değerli. Uygulamada en çok kullandığınız özellikler, zorlandığınız noktalar ve yeni fikirlerinizi bizimle paylaşır mısınız? Kısa bir geri bildirim bile yol haritamızı doğrudan etkiler.";
const LINK = "/feedback";

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  // notifications.company_id zorunlu — yalnızca bir şirkete bağlı kullanıcılar.
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, company_id")
    .not("company_id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Son MIN_INTERVAL_DAYS gün içinde bu hatırlatmayı alanları ele.
  const cutoff = new Date(Date.now() - MIN_INTERVAL_DAYS * DAY_MS).toISOString();
  const { data: recent } = await admin
    .from("notifications")
    .select("user_id")
    .eq("type", "admin_announcement")
    .eq("meta->>source", SOURCE)
    .gte("created_at", cutoff);
  const recentIds = new Set((recent ?? []).map((r) => r.user_id as string));

  const seen = new Set<string>();
  const targets: AnnouncementRecipient[] = [];
  for (const p of profiles ?? []) {
    const id = p.id as string;
    if (!p.company_id || seen.has(id) || recentIds.has(id)) continue;
    seen.add(id);
    targets.push({ userId: id, companyId: p.company_id as string });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      candidates: targets.length,
      skippedRecent: recentIds.size,
    });
  }

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, targets: 0, skippedRecent: recentIds.size });
  }

  const result = await dispatchAnnouncement(admin, targets, {
    type: "admin_announcement",
    severity: "info",
    title: TITLE,
    body: BODY,
    url: LINK,
    meta: { source: SOURCE },
  });

  console.info(
    `[cron/feedback-reminder] hedef=${targets.length} zil=${result.inApp} push=${result.push} atlanan=${recentIds.size}`,
  );

  return NextResponse.json({
    ok: true,
    targets: targets.length,
    inApp: result.inApp,
    push: result.push,
    skippedRecent: recentIds.size,
  });
}

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
export const GET = withCronLogging("feedback-reminder", handler);
