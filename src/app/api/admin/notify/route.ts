export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";
import { resolveRecipients, SEGMENT_LABELS } from "@/lib/admin/recipients";
import { dispatchAnnouncement } from "@/lib/notify";
import { isPushConfigured } from "@/lib/push";
import type { AdminEmailSegment } from "@/lib/admin/types";

/**
 * Uygulama içi (zil) + Web Push duyuru gönderir. E-postadan farklı olarak
 * bildirim tercihine BAKMAZ — zil her zaman çalar, push da aynı kitleye gider
 * (bkz. notify.ts) — bu yüzden alıcı çözümlemesi `ignoreOptOut: true` ile
 * yapılır. E-posta bu uçta gönderilmez; "ikisi birden" seçilirse ayrı uçtan
 * (`/api/admin/email/send`) gider.
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

  const targets = (profiles ?? [])
    .filter((p) => p.company_id)
    .map((p) => ({ userId: p.id as string, companyId: p.company_id as string }));

  if (targets.length === 0) {
    return NextResponse.json({ error: "Alıcıların şirketi çözülemedi" }, { status: 400 });
  }

  const result = await dispatchAnnouncement(ctx.db, targets, {
    type: "admin_announcement",
    severity: body.severity ?? "info",
    title,
    body: message,
    url: body.url?.trim() || undefined,
    meta: { source: "admin-panel" },
  });

  await logAdminAction(ctx, {
    action: "notification_broadcast_sent",
    targetType: "system",
    targetLabel: title,
    meta: { segment: body.segment, count: result.inApp, push: result.push },
  });

  console.info(
    `[admin/notify] duyuru — segment:${body.segment} zil:${result.inApp} push:${result.push}`,
  );

  return NextResponse.json({
    ok: true,
    inserted: result.inApp,
    push: result.push,
    pushConfigured: isPushConfigured(),
    segmentLabel: SEGMENT_LABELS[body.segment],
  });
});
