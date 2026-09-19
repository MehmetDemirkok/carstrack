export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, intParam, logAdminAction, uniqueIds } from "@/lib/admin/api";
import type { AdminInviteRow, AdminInviteListResponse } from "@/lib/admin/types";
import type { UserRole } from "@/lib/types";

/**
 * Tüm tenant'ların davetleri.
 *
 * `status` sütunu 'pending' kalsa bile `expires_at` geçmişse davet fiilen
 * ölüdür — bu ayrımı sorgu değil, burada hesaplanan `expired` alanı taşır
 * (kabul akışı da aynı şekilde tarihe bakar).
 */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? "open";
  const companyFilter = url.searchParams.get("company") ?? "all";
  const limit = intParam(url, "limit", 200, { min: 1, max: 500 });

  let query = db
    .from("company_invites")
    .select("id, company_id, email, role, status, invited_by, created_at, expires_at, accepted_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (companyFilter !== "all") query = query.eq("company_id", companyFilter);

  const { data, error } = await query;
  if (error) throw new Error(`company_invites: ${error.message}`);

  const rows = data ?? [];
  const companyIds = uniqueIds(rows.map((r) => r.company_id as string));
  const inviterIds = uniqueIds(rows.map((r) => r.invited_by as string));

  const [companiesRes, invitersRes] = await Promise.all([
    companyIds.length
      ? db.from("companies").select("id, name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
    inviterIds.length
      ? db.from("profiles").select("id, full_name").in("id", inviterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const companyNames = new Map(
    (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]),
  );
  const inviterNames = new Map(
    (invitersRes.data ?? []).map((p) => [p.id as string, (p.full_name as string) || "İsimsiz"]),
  );

  const now = Date.now();
  const all: AdminInviteRow[] = rows.map((r) => {
    const expiresAt = r.expires_at as string;
    const status = (r.status as string) || "pending";
    const expired = status === "pending" && new Date(expiresAt).getTime() < now;
    return {
      id: r.id as string,
      email: (r.email as string) || "—",
      role: ((r.role as UserRole) || "user") as UserRole,
      status,
      expired,
      companyId: (r.company_id as string) ?? null,
      companyName: companyNames.get(r.company_id as string) ?? "—",
      invitedByName: inviterNames.get(r.invited_by as string) ?? "—",
      createdAt: r.created_at as string,
      expiresAt,
      acceptedAt: (r.accepted_at as string) ?? null,
    };
  });

  const counts: AdminInviteListResponse["counts"] = {
    all: all.length,
    pending: all.filter((i) => i.status === "pending" && !i.expired).length,
    expired: all.filter((i) => i.expired).length,
    accepted: all.filter((i) => i.status === "accepted").length,
    revoked: all.filter((i) => i.status === "revoked").length,
  };

  let invites = all;
  switch (statusFilter) {
    case "open":
      invites = all.filter((i) => i.status === "pending" && !i.expired);
      break;
    case "expired":
      invites = all.filter((i) => i.expired);
      break;
    case "accepted":
      invites = all.filter((i) => i.status === "accepted");
      break;
    case "revoked":
      invites = all.filter((i) => i.status === "revoked");
      break;
  }

  const payload: AdminInviteListResponse = { invites, counts };
  return NextResponse.json(payload);
});

/**
 * Daveti iptal eder.
 *
 * Satır silinmez, `status = 'revoked'` yapılır: token'ın neden çalışmadığını
 * sonradan açıklayabilmek için kaydın kalması gerekiyor.
 */
export const PATCH = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as { id?: string };
  const id = body.id ?? "";
  if (!id) return NextResponse.json({ error: "Davet id gerekli" }, { status: 400 });

  const { data: invite } = await ctx.db
    .from("company_invites")
    .select("email, status, company_id")
    .eq("id", id)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Davet bulunamadı" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "Yalnızca bekleyen davetler iptal edilebilir." },
      { status: 400 },
    );
  }

  const { error } = await ctx.db
    .from("company_invites")
    .update({ status: "revoked" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction(ctx, {
    action: "invite_revoked_by_admin",
    targetType: "company",
    targetId: (invite.company_id as string) ?? null,
    targetLabel: (invite.email as string) ?? id,
    meta: { inviteId: id },
  });

  return NextResponse.json({ ok: true });
});
