export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { withAdmin, daysAgoIso, intParam, isBanned, listAllAuthUsers, uniqueIds } from "@/lib/admin/api";
import type { UserRole } from "@/lib/types";

/** Excel'in Türkçe yerelinde CSV'yi doğru ayırması için noktalı virgül. */
const SEP = ";";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(SEP), ...rows.map((r) => r.map(csvCell).join(SEP))];
  // BOM: Excel'in UTF-8'i tanıması ve Türkçe karakterlerin bozulmaması için.
  return "﻿" + lines.join("\r\n");
}

function isoToTr(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
}

/** Kullanıcı, şirket, geri bildirim veya etkinlik listesini CSV olarak indirir. */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "users";
  const stamp = new Date().toISOString().slice(0, 10);

  /** Ortak yanıt sarmalayıcı — indirme adı ve UTF-8 başlıkları. */
  function csvResponse(csv: string, name: string): Response {
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="carstrack-${name}-${stamp}.csv"`,
      },
    });
  }

  // ── Geri bildirimler ──────────────────────────────────────────────────────
  if (kind === "feedback") {
    const { data: rows } = await db
      .from("feedback")
      .select("id, company_id, user_id, type, status, message, page_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    const list = rows ?? [];
    const companyIds = uniqueIds(list.map((r) => r.company_id as string));
    const userIds = uniqueIds(list.map((r) => r.user_id as string));

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
      (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || ""]),
    );
    const profileNames = new Map(
      (profilesRes.data ?? []).map((p) => [p.id as string, (p.full_name as string) || ""]),
    );

    const csv = toCsv(
      ["Tarih", "Tür", "Durum", "Şirket", "Kullanıcı", "E-posta", "Sayfa", "Mesaj"],
      list.map((r) => [
        isoToTr(r.created_at as string),
        (r.type as string) || "other",
        (r.status as string) || "new",
        companyNames.get(r.company_id as string) ?? "",
        profileNames.get(r.user_id as string) ?? "",
        authUsers.get(r.user_id as string)?.email ?? "",
        (r.page_url as string) || "",
        ((r.message as string) || "").replace(/\s+/g, " "),
      ]),
    );

    return csvResponse(csv, "geri-bildirim");
  }

  // ── Etkinlik ──────────────────────────────────────────────────────────────
  // Filtreler /admin/activity ile aynı adları taşır, böylece ekranda görülen
  // liste ile inen dosya örtüşür.
  if (kind === "activity") {
    const source = url.searchParams.get("source") ?? "all";
    const companyFilter = url.searchParams.get("company") ?? "all";
    const actionFilter = url.searchParams.get("action") ?? "all";
    const days = intParam(url, "days", 0, { min: 0, max: 365 });
    const since = days > 0 ? daysAgoIso(days) : null;

    let tenantQuery = db
      .from("audit_logs")
      .select("id, company_id, actor_name, action, entity_type, entity_label, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (companyFilter !== "all") tenantQuery = tenantQuery.eq("company_id", companyFilter);
    if (actionFilter !== "all") tenantQuery = tenantQuery.eq("action", actionFilter);
    if (since) tenantQuery = tenantQuery.gte("created_at", since);

    let adminQuery = db
      .from("admin_audit_log")
      .select("id, actor_email, action, target_type, target_label, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (actionFilter !== "all") adminQuery = adminQuery.eq("action", actionFilter);
    if (since) adminQuery = adminQuery.gte("created_at", since);

    const [tenantRes, adminRes] = await Promise.all([
      source === "admin" ? Promise.resolve({ data: [], error: null }) : tenantQuery,
      source === "tenant" || companyFilter !== "all"
        ? Promise.resolve({ data: [], error: null })
        : adminQuery,
    ]);

    const tenantRows = tenantRes.data ?? [];
    const companyIds = uniqueIds(tenantRows.map((r) => r.company_id as string));
    const companiesRes = companyIds.length
      ? await db.from("companies").select("id, name").in("id", companyIds)
      : { data: [], error: null };
    const companyNames = new Map(
      (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || ""]),
    );

    const merged = [
      ...tenantRows.map((r) => ({
        createdAt: r.created_at as string,
        source: "Şirket",
        actor: (r.actor_name as string) || "",
        action: (r.action as string) || "",
        entityType: (r.entity_type as string) || "",
        entityLabel: (r.entity_label as string) || "",
        company: companyNames.get(r.company_id as string) ?? "",
      })),
      ...(adminRes.data ?? []).map((r) => ({
        createdAt: r.created_at as string,
        source: "Admin",
        actor: (r.actor_email as string) || "",
        action: (r.action as string) || "",
        entityType: (r.target_type as string) || "",
        entityLabel: (r.target_label as string) || "",
        company: "",
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const csv = toCsv(
      ["Tarih", "Kaynak", "Kişi", "İşlem", "Tür", "Kayıt", "Şirket"],
      merged.map((r) => [
        isoToTr(r.createdAt),
        r.source,
        r.actor,
        r.action,
        r.entityType,
        r.entityLabel,
        r.company,
      ]),
    );

    return csvResponse(csv, "etkinlik");
  }

  if (kind === "companies") {
    const [companiesRes, profilesRes, vehiclesRes] = await Promise.all([
      db.from("companies").select("id, name, created_at, email, phone, timezone"),
      db.from("profiles").select("company_id"),
      db.from("vehicles").select("company_id"),
    ]);

    const userCount = new Map<string, number>();
    for (const p of profilesRes.data ?? []) {
      const cid = p.company_id as string;
      userCount.set(cid, (userCount.get(cid) ?? 0) + 1);
    }
    const vehicleCount = new Map<string, number>();
    for (const v of vehiclesRes.data ?? []) {
      const cid = v.company_id as string;
      vehicleCount.set(cid, (vehicleCount.get(cid) ?? 0) + 1);
    }

    const csv = toCsv(
      ["Şirket", "Kullanıcı", "Araç", "E-posta", "Telefon", "Saat dilimi", "Kayıt tarihi"],
      (companiesRes.data ?? [])
        .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
        .map((c) => [
          c.name,
          userCount.get(c.id as string) ?? 0,
          vehicleCount.get(c.id as string) ?? 0,
          c.email ?? "",
          c.phone ?? "",
          c.timezone ?? "",
          isoToTr(c.created_at as string),
        ]),
    );

    return csvResponse(csv, "sirketler");
  }

  const [profilesRes, companiesRes, authUsers] = await Promise.all([
    db.from("profiles").select("id, company_id, full_name, role, department, created_at, notify_by_email"),
    db.from("companies").select("id, name"),
    listAllAuthUsers(db),
  ]);

  const companies = new Map(
    (companiesRes.data ?? []).map((c) => [
      c.id as string,
      { name: (c.name as string) || "" },
    ]),
  );

  const csv = toCsv(
    [
      "Ad Soyad",
      "E-posta",
      "Rol",
      "Şirket",
      "Departman",
      "Kayıt tarihi",
      "Son giriş",
      "E-posta doğrulandı",
      "Askıda",
      "E-posta bildirimi",
    ],
    (profilesRes.data ?? [])
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
      .map((p) => {
        const au = authUsers.get(p.id as string);
        const company = companies.get(p.company_id as string);
        return [
          p.full_name ?? "",
          au?.email ?? "",
          ((p.role as UserRole) || "user"),
          company?.name ?? "",
          p.department ?? "",
          isoToTr(p.created_at as string),
          isoToTr(au?.lastSignInAt ?? null),
          au?.emailConfirmedAt ? "Evet" : "Hayır",
          au && isBanned(au) ? "Evet" : "Hayır",
          p.notify_by_email === false ? "Kapalı" : "Açık",
        ];
      }),
  );

  return csvResponse(csv, "kullanicilar");
});
