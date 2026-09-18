export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Toplu gönderim hız sınırı yüzünden uzun sürebilir. */
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";
import { resolveRecipients, SEGMENT_LABELS } from "@/lib/admin/recipients";
import { sendAdminBroadcastEmail } from "@/lib/email/sendEmail";
import { getAppUrl } from "@/lib/email/emailTypes";
import type { AdminEmailSegment, AdminEmailSendResponse } from "@/lib/admin/types";

/**
 * Resend hız sınırı saniyede 2 istektir. Her parti arasında bekleyerek
 * 429'a girmeden ilerleriz — 500 alıcı ≈ 4 dakika, maxDuration bunu kaldırır.
 */
const BATCH_SIZE = 2;
const BATCH_DELAY_MS = 1100;
/** Log satırında saklanacak azami adres sayısı (tablo şişmesin). */
const MAX_LOGGED_RECIPIENTS = 200;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Alıcının ilk adı — "Merhaba Mehmet," selamlaması için. */
function firstName(fullName: string): string | undefined {
  const first = fullName.trim().split(/\s+/)[0];
  return first || undefined;
}

export const POST = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as {
    segment: AdminEmailSegment;
    companyId?: string | null;
    userIds?: string[];
    ignoreOptOut?: boolean;
    subject: string;
    title: string;
    message: string;
    ctaUrl?: string;
    ctaLabel?: string;
    signature?: string;
    /** true ise yalnızca admin'in kendisine tek deneme maili gider. */
    test?: boolean;
  };

  const subject = (body.subject ?? "").trim();
  const title = (body.title ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!title) return NextResponse.json({ error: "Başlık boş olamaz" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });

  const appUrl = getAppUrl();
  const isTest = body.test === true;

  const common = {
    subject: subject || title,
    title,
    body: message,
    ctaUrl: body.ctaUrl?.trim() || undefined,
    ctaLabel: body.ctaLabel?.trim() || undefined,
    signature: body.signature?.trim() || undefined,
    appUrl,
  };

  // ── Test gönderimi: yalnızca admin'in kendi adresine ──────────────────────
  if (isTest) {
    const result = await sendAdminBroadcastEmail({
      ...common,
      to: ctx.admin.email,
      recipientName: firstName(ctx.admin.email.split("@")[0]),
    });

    await logSend(ctx, {
      segment: body.segment,
      segmentLabel: `TEST → ${ctx.admin.email}`,
      subject: common.subject,
      message,
      recipients: [ctx.admin.email],
      recipientCount: 1,
      sentCount: result.success ? 1 : 0,
      failedCount: result.success ? 0 : 1,
      isTest: true,
      error: result.error ?? null,
    });

    const payload: AdminEmailSendResponse = {
      ok: result.success,
      sent: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
      skipped: result.skipped === true,
      errors: result.error ? [result.error] : [],
    };
    return NextResponse.json(payload);
  }

  // ── Gerçek gönderim ───────────────────────────────────────────────────────
  const { recipients } = await resolveRecipients(ctx, {
    segment: body.segment,
    companyId: body.companyId ?? null,
    userIds: body.userIds ?? [],
    ignoreOptOut: body.ignoreOptOut === true,
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Bu segmentte alıcı yok" }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = false;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((r) =>
        sendAdminBroadcastEmail({
          ...common,
          to: r.email,
          recipientName: firstName(r.fullName),
        }),
      ),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.skipped) {
        skipped = true;
        continue;
      }
      if (result.success) {
        sent++;
      } else {
        failed++;
        if (errors.length < 10) errors.push(`${batch[j].email}: ${result.error ?? "bilinmeyen hata"}`);
      }
    }

    if (i + BATCH_SIZE < recipients.length) await wait(BATCH_DELAY_MS);
  }

  const segmentLabel =
    body.segment === "company"
      ? `${SEGMENT_LABELS.company}: ${recipients[0]?.companyName ?? body.companyId ?? "—"}`
      : SEGMENT_LABELS[body.segment];

  await logSend(ctx, {
    segment: body.segment,
    segmentLabel,
    subject: common.subject,
    message,
    recipients: recipients.slice(0, MAX_LOGGED_RECIPIENTS).map((r) => r.email),
    recipientCount: recipients.length,
    sentCount: sent,
    failedCount: failed,
    isTest: false,
    error: errors[0] ?? null,
  });

  await logAdminAction(ctx, {
    action: "email_broadcast_sent",
    targetType: "email",
    targetLabel: common.subject,
    meta: { segment: body.segment, recipientCount: recipients.length, sent, failed },
  });

  console.info(
    `[admin/email] duyuru gönderildi — segment:${body.segment} alıcı:${recipients.length} ok:${sent} hata:${failed}`,
  );

  const payload: AdminEmailSendResponse = {
    ok: failed === 0,
    sent,
    failed,
    skipped,
    errors,
  };
  return NextResponse.json(payload);
});

interface LogEntry {
  segment: AdminEmailSegment;
  segmentLabel: string;
  subject: string;
  message: string;
  recipients: string[];
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  isTest: boolean;
  error: string | null;
}

/** Gönderim geçmişini yazar — tablo yoksa sessizce geçer (bkz. logAdminAction). */
async function logSend(
  ctx: Parameters<typeof logAdminAction>[0],
  entry: LogEntry,
): Promise<void> {
  try {
    const { error } = await ctx.db.from("admin_email_log").insert({
      actor_email: ctx.admin.email,
      segment: entry.segment,
      segment_label: entry.segmentLabel,
      subject: entry.subject,
      body: entry.message.slice(0, 20000),
      recipients: entry.recipients,
      recipient_count: entry.recipientCount,
      sent_count: entry.sentCount,
      failed_count: entry.failedCount,
      is_test: entry.isTest,
      error: entry.error,
    });
    if (error) console.warn(`[admin/email] gönderim kaydı yazılamadı: ${error.message}`);
  } catch (err) {
    console.warn("[admin/email] gönderim kaydı yazılamadı:", err);
  }
}
