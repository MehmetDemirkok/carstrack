export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, intParam } from "@/lib/admin/api";
import type { AdminEmailLogRow, AdminEmailSegment } from "@/lib/admin/types";

/** Panelden gönderilen duyuruların geçmişi. */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const limit = intParam(url, "limit", 50, { min: 1, max: 200 });

  const { data, error } = await db
    .from("admin_email_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Migration henüz uygulanmadıysa panel boş liste görsün, hata vermesin.
  if (error) {
    console.warn(`[admin/email/log] okunamadı: ${error.message}`);
    return NextResponse.json({ rows: [], available: false });
  }

  const rows: AdminEmailLogRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    actorEmail: (r.actor_email as string) || "—",
    segment: ((r.segment as AdminEmailSegment) || "all") as AdminEmailSegment,
    segmentLabel: (r.segment_label as string) || "",
    subject: (r.subject as string) || "",
    recipientCount: (r.recipient_count as number) ?? 0,
    sentCount: (r.sent_count as number) ?? 0,
    failedCount: (r.failed_count as number) ?? 0,
    isTest: r.is_test === true,
    error: (r.error as string) ?? null,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ rows, available: true });
});
