export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, intParam, listAllAuthUsers, uniqueIds } from "@/lib/admin/api";
import type { AdminFeedbackRow } from "@/lib/admin/types";

/** Tüm şirketlerden gelen geri bildirimler — tek akışta. */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const type = url.searchParams.get("type") ?? "all";
  const limit = intParam(url, "limit", 100, { min: 1, max: 500 });

  let query = db
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") query = query.eq("status", status);
  if (type !== "all") query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw new Error(`feedback: ${error.message}`);

  const rows = data ?? [];
  const companyIds = uniqueIds(rows.map((r) => r.company_id as string));
  const userIds = uniqueIds(rows.map((r) => r.user_id as string));

  const [companiesRes, profilesRes, authUsers] = await Promise.all([
    companyIds.length
      ? db.from("companies").select("id, name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? db.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    listAllAuthUsers(db),
  ]);

  const companyNames = new Map(
    (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]),
  );
  const profileNames = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, (p.full_name as string) || "İsimsiz"]),
  );

  const feedback: AdminFeedbackRow[] = rows.map((r) => ({
    id: r.id as string,
    type: ((r.type as string) || "other") as AdminFeedbackRow["type"],
    status: ((r.status as string) || "new") as AdminFeedbackRow["status"],
    message: (r.message as string) || "",
    pageUrl: (r.page_url as string) || "",
    userAgent: (r.user_agent as string) || "",
    createdAt: r.created_at as string,
    companyId: r.company_id as string,
    companyName: companyNames.get(r.company_id as string) ?? "—",
    userId: r.user_id as string,
    userName: profileNames.get(r.user_id as string) ?? "—",
    userEmail: authUsers.get(r.user_id as string)?.email ?? "—",
  }));

  return NextResponse.json({
    feedback,
    counts: {
      all: feedback.length,
      new: feedback.filter((f) => f.status === "new").length,
      seen: feedback.filter((f) => f.status === "seen").length,
      resolved: feedback.filter((f) => f.status === "resolved").length,
    },
  });
});
