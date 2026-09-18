export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, intParam, isBanned, listAllAuthUsers } from "@/lib/admin/api";
import type { AdminUserListResponse, AdminUserRow } from "@/lib/admin/types";
import type { PlanType, UserRole } from "@/lib/types";
import { isDriverRole } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tüm tenant'lardaki kullanıcıların listesi.
 *
 * ÖLÇEK NOTU: filtreleme/sıralama bilinçli olarak bellekte yapılıyor. E-posta
 * ve "son giriş" alanları `auth.users` tablosunda, geri kalan her şey
 * `profiles` tablosunda — PostgREST bu ikisini join edemediği için hangi
 * yaklaşımda olursa olsun iki liste birleştirilmek zorunda. On binlerce
 * kullanıcıya çıkılırsa burası bir SQL view'a taşınmalı.
 */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const roleFilter = url.searchParams.get("role") ?? "all";
  const companyFilter = url.searchParams.get("company") ?? "all";
  const statusFilter = url.searchParams.get("status") ?? "all";
  const sort = url.searchParams.get("sort") ?? "created";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const page = intParam(url, "page", 1, { min: 1 });
  const pageSize = intParam(url, "pageSize", 25, { min: 5, max: 200 });

  const [profilesRes, companiesRes, assignmentsRes, tasksRes, authUsers] = await Promise.all([
    db.from("profiles").select("id, company_id, full_name, role, department, created_at, notify_by_email"),
    db.from("companies").select("id, name, plan"),
    db.from("vehicle_assignments").select("driver_id"),
    db.from("vehicle_tasks").select("driver_id"),
    listAllAuthUsers(db),
  ]);

  if (profilesRes.error) throw new Error(`profiles: ${profilesRes.error.message}`);

  const companies = new Map(
    (companiesRes.data ?? []).map((c) => [
      c.id as string,
      { name: (c.name as string) || "İsimsiz Şirket", plan: ((c.plan as PlanType) || "free") as PlanType },
    ]),
  );

  const vehicleCounts = new Map<string, number>();
  for (const a of assignmentsRes.data ?? []) {
    const id = a.driver_id as string | null;
    if (id) vehicleCounts.set(id, (vehicleCounts.get(id) ?? 0) + 1);
  }
  const taskCounts = new Map<string, number>();
  for (const t of tasksRes.data ?? []) {
    const id = t.driver_id as string | null;
    if (id) taskCounts.set(id, (taskCounts.get(id) ?? 0) + 1);
  }

  const all: AdminUserRow[] = (profilesRes.data ?? []).map((p) => {
    const au = authUsers.get(p.id as string);
    const company = companies.get(p.company_id as string);
    return {
      id: p.id as string,
      email: au?.email ?? "—",
      fullName: (p.full_name as string) || "İsimsiz",
      role: ((p.role as UserRole) || "user") as UserRole,
      department: (p.department as string) || "",
      companyId: (p.company_id as string) ?? null,
      companyName: company?.name ?? "—",
      companyPlan: company?.plan ?? "free",
      createdAt: p.created_at as string,
      lastSignInAt: au?.lastSignInAt ?? null,
      emailConfirmed: Boolean(au?.emailConfirmedAt),
      banned: au ? isBanned(au) : false,
      vehicleCount: vehicleCounts.get(p.id as string) ?? 0,
      taskCount: taskCounts.get(p.id as string) ?? 0,
      notifyByEmail: p.notify_by_email !== false,
    };
  });

  const now = Date.now();
  const counts: AdminUserListResponse["counts"] = {
    all: all.length,
    managers: all.filter((u) => u.role === "manager").length,
    operators: all.filter((u) => u.role === "operator").length,
    drivers: all.filter((u) => isDriverRole(u.role)).length,
    banned: all.filter((u) => u.banned).length,
    neverSignedIn: all.filter((u) => !u.lastSignInAt).length,
  };

  let rows = all;

  if (q) {
    rows = rows.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.companyName.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q),
    );
  }
  if (roleFilter !== "all") {
    rows = roleFilter === "driver"
      ? rows.filter((u) => isDriverRole(u.role))
      : rows.filter((u) => u.role === roleFilter);
  }
  if (companyFilter !== "all") {
    rows = rows.filter((u) => u.companyId === companyFilter);
  }
  switch (statusFilter) {
    case "banned":
      rows = rows.filter((u) => u.banned);
      break;
    case "never":
      rows = rows.filter((u) => !u.lastSignInAt);
      break;
    case "unconfirmed":
      rows = rows.filter((u) => !u.emailConfirmed);
      break;
    case "active7d":
      rows = rows.filter((u) => u.lastSignInAt && now - new Date(u.lastSignInAt).getTime() <= 7 * DAY_MS);
      break;
    case "dormant30d":
      rows = rows.filter(
        (u) => !u.lastSignInAt || now - new Date(u.lastSignInAt).getTime() > 30 * DAY_MS,
      );
      break;
  }

  const factor = dir === "asc" ? 1 : -1;
  rows = rows.slice().sort((a, b) => {
    switch (sort) {
      case "name":
        return factor * a.fullName.localeCompare(b.fullName, "tr");
      case "company":
        return factor * a.companyName.localeCompare(b.companyName, "tr");
      case "lastSignIn": {
        const at = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
        const bt = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
        return factor * (at - bt);
      }
      case "vehicles":
        return factor * (a.vehicleCount - b.vehicleCount);
      default:
        return (
          factor * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const payload: AdminUserListResponse = {
    users: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    counts,
  };

  return NextResponse.json(payload);
});
