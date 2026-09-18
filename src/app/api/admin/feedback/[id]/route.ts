export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";

const VALID_STATUS = ["new", "seen", "resolved"] as const;

/** Geri bildirim durumunu günceller (yeni / görüldü / çözüldü). */
export const PATCH = withAdmin<{ id: string }>(async (req, ctx) => {
  const body = (await req.json()) as { status?: string };
  const status = body.status ?? "";

  if (!VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const { error } = await ctx.db
    .from("feedback")
    .update({ status })
    .eq("id", ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction(ctx, {
    action: "feedback_status_changed",
    targetType: "feedback",
    targetId: ctx.params.id,
    meta: { status },
  });

  return NextResponse.json({ ok: true });
});
