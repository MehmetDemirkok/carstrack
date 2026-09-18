export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";
import { resolveRecipients, SEGMENT_LABELS } from "@/lib/admin/recipients";
import type { AdminEmailSegment } from "@/lib/admin/types";

/** Tek insert'te gönderilecek bildirim sayısı. */
const CHUNK = 500;

/**
 * Uygulama içi (zil) duyuru gönderir. E-postadan farklı olarak bildirim
 * tercihine BAKMAZ — uygulama içi zil her zaman çalar (bkz. notify.ts) — bu
 * yüzden alıcı çözümlemesi `ignoreOptOut: true` ile yapılır.
 */
export const POST = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as {
    segment: AdminEmailSegment;
    companyId?: string | null;
    userIds?: string[];
    title: string;
    message: string;
    url?: string;
    severity?: "info" | "warning" | "critical";
  };

  const title = (body.title ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık boş olamaz" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });

  const { recipients } = await resolveRecipients(ctx, {
    segment: body.segment,
    companyId: body.companyId ?? null,
    userIds: body.userIds ?? [],
    ignoreOptOut: true,
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Bu segmentte alıcı yok" }, { status: 400 });
  }

  // notifications.company_id NOT NULL — her alıcının kendi şirketi gerekli.
  const { data: profiles, error: profileError } = await ctx.db
    .from("profiles")
    .select("id, company_id")
    .in("id", recipients.map((r) => r.userId));

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  const rows = (profiles ?? [])
    .filter((p) => p.company_id)
    .map((p) => ({
      company_id: p.company_id as string,
      user_id: p.id as string,
      type: "admin_announcement",
      title,
      body: message,
      url: body.url?.trim() || null,
      severity: body.severity ?? "info",
      meta: { source: "admin-panel" },
    }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await ctx.db.from("notifications").insert(rows.slice(i, i + CHUNK));
    if (error) return NextResponse.json({ error: error.message, inserted }, { status: 400 });
    inserted += Math.min(CHUNK, rows.length - i);
  }

  await logAdminAction(ctx, {
    action: "notification_broadcast_sent",
    targetType: "system",
    targetLabel: title,
    meta: { segment: body.segment, count: inserted },
  });

  console.info(
    `[admin/notify] uygulama içi duyuru — segment:${body.segment} alıcı:${inserted}`,
  );

  return NextResponse.json({
    ok: true,
    inserted,
    segmentLabel: SEGMENT_LABELS[body.segment],
  });
});
