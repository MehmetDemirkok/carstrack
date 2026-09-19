export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, daysAgoIso, listAllAuthUsers } from "@/lib/admin/api";
import type {
  AdminCompanyHealth,
  AdminCompanyListResponse,
  AdminCompanyRow,
} from "@/lib/admin/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tüm tenant'ların listesi — kullanıcı/araç sayıları, son 30 gün aktivitesi,
 * son giriş zamanı ve sağlık durumu ile.
 *
 * Sağlık: healthy  = araç var + son 30 günde aktivite var
 *         partial  = araç var ama son 30 günde hareket yok
 *         empty    = hiç araç eklenmemiş
 *         dormant  = 30+ gündür hiç giriş yok
 */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const healthFilter = url.searchParams.get("health") ?? "all";
  const sort = url.searchParams.get("sort") ?? "created";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";

  const since30 = daysAgoIso(30);
  const now = Date.now();
  const d30 = now - 30 * DAY_MS;

  const [companiesRes, profilesRes, vehiclesRes, svcRes, taskRes, fuelRes, fineRes, authUsers] =
    await Promise.all([
      db.from("companies").select("id, name, created_at, timezone, email, phone"),
      db.from("profiles").select("id, company_id, full_name, role, created_at"),
      db.from("vehicles").select("id, company_id, created_at"),
      db.from("service_records").select("company_id").gte("created_at", since30),
      db.from("vehicle_tasks").select("company_id").gte("created_at", since30),
      db.from("fuel_records").select("company_id").gte("created_at", since30),
      db.from("traffic_fines").select("company_id").gte("created_at", since30),
      listAllAuthUsers(db),
    ]);

  if (companiesRes.error) throw new Error(`companies: ${companiesRes.error.message}`);

  const companies = companiesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const userCount = new Map<string, number>();
  const vehicleCount = new Map<string, number>();
  const activity = new Map<string, number>();
  const lastSignIn = new Map<string, number>();
  const owner = new Map<string, { email: string; name: string; createdAt: string }>();

  for (const p of profiles) {
    const cid = p.company_id as string;
    if (!cid) continue;
    userCount.set(cid, (userCount.get(cid) ?? 0) + 1);

    const au = authUsers.get(p.id as string);
    if (au?.lastSignInAt) {
      lastSignIn.set(cid, Math.max(lastSignIn.get(cid) ?? 0, new Date(au.lastSignInAt).getTime()));
    }
    // Şirket sahibi = en eski yönetici.
    if (p.role === "manager") {
      const current = owner.get(cid);
      const createdAt = p.created_at as string;
      if (!current || new Date(createdAt).getTime() < new Date(current.createdAt).getTime()) {
        owner.set(cid, {
          email: au?.email ?? "",
          name: (p.full_name as string) || "",
          createdAt,
        });
      }
    }
  }

  for (const v of vehiclesRes.data ?? []) {
    const cid = v.company_id as string;
    vehicleCount.set(cid, (vehicleCount.get(cid) ?? 0) + 1);
    if (v.created_at && new Date(v.created_at as string).getTime() >= d30) {
      activity.set(cid, (activity.get(cid) ?? 0) + 1);
    }
  }
  for (const rows of [svcRes.data ?? [], taskRes.data ?? [], fuelRes.data ?? [], fineRes.data ?? []]) {
    for (const r of rows) {
      const cid = r.company_id as string;
      activity.set(cid, (activity.get(cid) ?? 0) + 1);
    }
  }

  function healthOf(id: string, createdAt: string): AdminCompanyHealth {
    const last = lastSignIn.get(id);
    const isNew = new Date(createdAt).getTime() > d30;
    if (!isNew && (!last || last < d30)) return "dormant";
    if ((vehicleCount.get(id) ?? 0) === 0) return "empty";
    if ((activity.get(id) ?? 0) === 0) return "partial";
    return "healthy";
  }

  const all: AdminCompanyRow[] = companies.map((c) => {
    const id = c.id as string;
    const createdAt = c.created_at as string;
    const ownerInfo = owner.get(id);
    const last = lastSignIn.get(id);
    return {
      id,
      name: (c.name as string) || "İsimsiz Şirket",
      createdAt,
      timezone: (c.timezone as string) ?? null,
      email: (c.email as string) ?? null,
      phone: (c.phone as string) ?? null,
      userCount: userCount.get(id) ?? 0,
      vehicleCount: vehicleCount.get(id) ?? 0,
      activity30d: activity.get(id) ?? 0,
      lastSignInAt: last ? new Date(last).toISOString() : null,
      ownerEmail: ownerInfo?.email || null,
      ownerName: ownerInfo?.name || null,
      health: healthOf(id, createdAt),
    };
  });

  const counts: AdminCompanyListResponse["counts"] = {
    all: all.length,
    healthy: all.filter((c) => c.health === "healthy").length,
    partial: all.filter((c) => c.health === "partial").length,
    empty: all.filter((c) => c.health === "empty").length,
    dormant: all.filter((c) => c.health === "dormant").length,
  };

  let rows = all;
  if (q) {
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ownerEmail ?? "").toLowerCase().includes(q) ||
        (c.ownerName ?? "").toLowerCase().includes(q),
    );
  }
  if (healthFilter !== "all") rows = rows.filter((c) => c.health === healthFilter);

  const factor = dir === "asc" ? 1 : -1;
  rows = rows.slice().sort((a, b) => {
    switch (sort) {
      case "name":
        return factor * a.name.localeCompare(b.name, "tr");
      case "users":
        return factor * (a.userCount - b.userCount);
      case "vehicles":
        return factor * (a.vehicleCount - b.vehicleCount);
      case "activity":
        return factor * (a.activity30d - b.activity30d);
      case "lastSignIn": {
        const at = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
        const bt = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
        return factor * (at - bt);
      }
      default:
        return factor * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  });

  const payload: AdminCompanyListResponse = { companies: rows, total: rows.length, counts };
  return NextResponse.json(payload);
});
