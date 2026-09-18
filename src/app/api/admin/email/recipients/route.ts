export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/api";
import { resolveRecipients } from "@/lib/admin/recipients";
import type { AdminEmailRecipientsResponse, AdminEmailSegment } from "@/lib/admin/types";

/** Seçilen segmentin kaç kişiye ve tam olarak kimlere gideceğini döner. */
export const POST = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as {
    segment: AdminEmailSegment;
    companyId?: string | null;
    userIds?: string[];
    ignoreOptOut?: boolean;
  };

  const { recipients, optedOut } = await resolveRecipients(ctx, {
    segment: body.segment,
    companyId: body.companyId ?? null,
    userIds: body.userIds ?? [],
    ignoreOptOut: body.ignoreOptOut === true,
  });

  const payload: AdminEmailRecipientsResponse = {
    recipients,
    total: recipients.length,
    optedOut,
  };
  return NextResponse.json(payload);
});
