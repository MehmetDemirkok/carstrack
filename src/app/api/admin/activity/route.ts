export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, daysAgoIso, intParam, uniqueIds } from "@/lib/admin/api";
import type { AdminActivityRow } from "@/lib/admin/types";

/**
 * Birleşik etkinlik akışı:
 *  - `audit_logs`      → şirketlerin kendi içindeki işlemler (tenant)
 *  - `admin_audit_log` → bu panelden yapılan işlemler (admin)
 *
 * İki kaynak tek zaman çizelgesinde birleştirilir; `source` alanı hangisinin
 * hangisi olduğunu ayırt eder.
 */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const limit = intParam(url, "limit", 100, { min: 1, max: 500 });
  const source = url.searchParams.get("source") ?? "all";
  const companyFilter = url.searchParams.get("company") ?? "all";
  const actionFilter = url.searchParams.get("action") ?? "all";
  const days = intParam(url, "days", 0, { min: 0, max: 365 });
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const since = days > 0 ? daysAgoIso(days) : null;

  // Şirket filtresi tenant tarafına aittir; seçiliyse admin kayıtları elenir
  // (panel işlemleri bir şirkete ait değildir, kendi etiketlerini taşırlar).
  const wantTenant = source !== "admin";
  const wantAdmin = source !== "tenant" && companyFilter === "all";

  // Filtre varken daha geniş çekip bellekte daraltıyoruz: audit_logs'ta
  // entity_label/actor_name üzerinde arama PostgREST'te tek sorguya sığmıyor.
  const fetchLimit = q ? Math.min(500, limit * 5) : limit;

  let tenantQuery = db
    .from("audit_logs")
    .select("id, company_id, actor_name, action, entity_type, entity_label, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  if (companyFilter !== "all") tenantQuery = tenantQuery.eq("company_id", companyFilter);
  if (actionFilter !== "all") tenantQuery = tenantQuery.eq("action", actionFilter);
  if (since) tenantQuery = tenantQuery.gte("created_at", since);

  let adminQuery = db
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(fetchLimit);
  if (actionFilter !== "all") adminQuery = adminQuery.eq("action", actionFilter);
  if (since) adminQuery = adminQuery.gte("created_at", since);

  const [tenantRes, adminRes] = await Promise.all([
    wantTenant ? tenantQuery : Promise.resolve({ data: [], error: null }),
    wantAdmin ? adminQuery : Promise.resolve({ data: [], error: null }),
  ]);

  if (tenantRes.error) throw new Error(`audit_logs: ${tenantRes.error.message}`);
  // admin_audit_log migration'ı uygulanmadıysa akış yalnızca tenant tarafını gösterir.
  if (adminRes.error) console.warn(`[admin/activity] admin_audit_log okunamadı: ${adminRes.error.message}`);

  const tenantRows = tenantRes.data ?? [];
  const companyIds = uniqueIds(tenantRows.map((r) => r.company_id as string));
  const companiesRes = companyIds.length
    ? await db.from("companies").select("id, name").in("id", companyIds)
    : { data: [], error: null };
  const companyNames = new Map(
    (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]),
  );

  const merged: AdminActivityRow[] = [
    ...tenantRows.map((r) => ({
      id: r.id as string,
      source: "tenant" as const,
      action: r.action as string,
      actorName: (r.actor_name as string) || "—",
      entityType: (r.entity_type as string) || "",
      entityLabel: (r.entity_label as string) ?? null,
      companyName: companyNames.get(r.company_id as string) ?? "—",
      createdAt: r.created_at as string,
      meta: (r.meta as Record<string, unknown>) ?? {},
    })),
    ...(adminRes.data ?? []).map((r) => ({
      id: r.id as string,
      source: "admin" as const,
      action: r.action as string,
      actorName: (r.actor_email as string) || "admin",
      entityType: (r.target_type as string) || "",
      entityLabel: (r.target_label as string) ?? null,
      companyName: "— (admin paneli)",
      createdAt: r.created_at as string,
      meta: (r.meta as Record<string, unknown>) ?? {},
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = q
    ? merged.filter(
        (r) =>
          r.actorName.toLowerCase().includes(q) ||
          (r.entityLabel ?? "").toLowerCase().includes(q) ||
          r.companyName.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q),
      )
    : merged;

  // Filtre kutusunu doldurmak için: bu pencerede gerçekten geçen aksiyonlar.
  const actions = [...new Set(merged.map((r) => r.action))].sort();

  return NextResponse.json({ activity: filtered.slice(0, limit), actions });
});
