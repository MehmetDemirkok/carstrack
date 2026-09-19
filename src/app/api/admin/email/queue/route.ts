export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse, after } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";
import { kickEmailQueueDrain } from "@/lib/admin/queue";
import { resolveRecipients, SEGMENT_LABELS } from "@/lib/admin/recipients";
import type { AdminEmailSegment, AdminEmailQueueRow } from "@/lib/admin/types";

function isMissingTable(message: string): boolean {
  return message.includes("admin_email_queue") && /does not exist|schema cache/i.test(message);
}

/** Kuyruktaki ve yakın geçmişteki duyurular. */
export const GET = withAdmin(async (_req, { db }) => {
  const { data, error } = await db
    .from("admin_email_queue")
    .select(
      "id, actor_email, status, scheduled_at, segment, segment_label, subject, title, total_count, sent_count, failed_count, error, created_at, finished_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTable(error.message)) {
      console.warn("[admin/email/queue] tablo yok — migration uygulanmamış olabilir.");
      return NextResponse.json({ queue: [], unavailable: true });
    }
    throw new Error(`admin_email_queue: ${error.message}`);
  }

  const queue: AdminEmailQueueRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    actorEmail: r.actor_email as string,
    status: r.status as AdminEmailQueueRow["status"],
    scheduledAt: r.scheduled_at as string,
    segment: r.segment as AdminEmailSegment,
    segmentLabel: (r.segment_label as string) || "",
    subject: (r.subject as string) || "",
    title: (r.title as string) || "",
    totalCount: (r.total_count as number) ?? 0,
    sentCount: (r.sent_count as number) ?? 0,
    failedCount: (r.failed_count as number) ?? 0,
    error: (r.error as string) ?? null,
    createdAt: r.created_at as string,
    finishedAt: (r.finished_at as string) ?? null,
  }));

  return NextResponse.json({ queue, unavailable: false });
});

/**
 * Duyuruyu kuyruğa alır (hemen veya ileri bir tarihe).
 *
 * Alıcı listesi BURADA çözülür ve satıra yazılır: segment sonradan değişse bile
 * (yeni kayıt, rol değişikliği) duyuru kuyruğa alındığı andaki kitleye gider.
 */
export const POST = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as {
    segment: AdminEmailSegment;
    companyId?: string | null;
    userIds?: string[];
    ignoreOptOut?: boolean;
    subject?: string;
    title: string;
    message: string;
    ctaUrl?: string;
    ctaLabel?: string;
    signature?: string;
    /** ISO tarih — boşsa hemen sıraya girer. */
    scheduledAt?: string | null;
  };

  const title = (body.title ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!title) return NextResponse.json({ error: "Başlık boş olamaz" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });

  let scheduledAt = new Date();
  if (body.scheduledAt) {
    const parsed = new Date(body.scheduledAt);
    if (!Number.isFinite(parsed.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }
    scheduledAt = parsed;
  }

  const { recipients } = await resolveRecipients(ctx, {
    segment: body.segment,
    companyId: body.companyId ?? null,
    userIds: body.userIds ?? [],
    ignoreOptOut: body.ignoreOptOut === true,
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Bu segmentte alıcı yok" }, { status: 400 });
  }

  const segmentLabel =
    body.segment === "company"
      ? `${SEGMENT_LABELS.company}: ${recipients[0]?.companyName ?? body.companyId ?? "—"}`
      : SEGMENT_LABELS[body.segment];

  const { data, error } = await ctx.db
    .from("admin_email_queue")
    .insert({
      actor_email: ctx.admin.email,
      status: "pending",
      scheduled_at: scheduledAt.toISOString(),
      segment: body.segment,
      segment_label: segmentLabel,
      subject: (body.subject ?? "").trim() || title,
      title,
      body: message,
      cta_url: body.ctaUrl?.trim() || null,
      cta_label: body.ctaLabel?.trim() || null,
      signature: body.signature?.trim() || null,
      pending_ids: recipients.map((r) => r.userId),
      total_count: recipients.length,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) {
      return NextResponse.json(
        { error: "admin_email_queue tablosu yok — 20260919_admin_panel_v2.sql migration'ını çalıştır." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(ctx, {
    action: "email_scheduled",
    targetType: "email",
    targetId: (data?.id as string) ?? null,
    targetLabel: title,
    meta: {
      segment: body.segment,
      recipientCount: recipients.length,
      scheduledAt: scheduledAt.toISOString(),
    },
  });

  // Hemen gönderilecekse kuyruğu şimdi başlat: Hobby planında cron günde bir kez
  // çalışıyor, dolayısıyla gönderimi başlatan bu tetikleme. İleri tarihli duyuruyu
  // günlük cron alır.
  if (scheduledAt.getTime() <= Date.now()) {
    after(() => kickEmailQueueDrain());
  }

  return NextResponse.json({
    ok: true,
    id: data?.id ?? null,
    recipientCount: recipients.length,
    scheduledAt: scheduledAt.toISOString(),
  });
});

/** Kuyruktaki duyuruyu iptal eder — gönderilmiş alıcılar geri alınamaz. */
export const PATCH = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as { id?: string };
  const id = body.id ?? "";
  if (!id) return NextResponse.json({ error: "Kuyruk id gerekli" }, { status: 400 });

  const { data: job } = await ctx.db
    .from("admin_email_queue")
    .select("status, title, sent_count")
    .eq("id", id)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  if (job.status === "done" || job.status === "cancelled") {
    return NextResponse.json({ error: "Bu duyuru zaten tamamlanmış." }, { status: 400 });
  }

  const { error } = await ctx.db
    .from("admin_email_queue")
    .update({ status: "cancelled", pending_ids: [], finished_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction(ctx, {
    action: "email_queue_cancelled",
    targetType: "email",
    targetId: id,
    targetLabel: (job.title as string) ?? id,
    meta: { alreadySent: (job.sent_count as number) ?? 0 },
  });

  return NextResponse.json({ ok: true, alreadySent: (job.sent_count as number) ?? 0 });
});
