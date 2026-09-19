export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, listAllAuthUsers } from "@/lib/admin/api";
import type { AdminOverviewResponse } from "@/lib/admin/types";
import type { UserRole } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES_DAYS = 30;

/** YYYY-MM-DD (UTC) — grafik serisi anahtarı. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function countSince(rows: { created_at?: string | null }[], sinceMs: number): number {
  return rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= sinceMs).length;
}

function countBetween(
  rows: { created_at?: string | null }[],
  fromMs: number,
  toMs: number,
): number {
  return rows.filter((r) => {
    if (!r.created_at) return false;
    const t = new Date(r.created_at).getTime();
    return t >= fromMs && t < toMs;
  }).length;
}

/**
 * Panel ana ekranının tek sorgu noktası: toplamlar, büyüme, etkileşim,
 * 30 günlük seri, kırılımlar, aktivasyon hunisi ve dikkat listesi.
 */
export const GET = withAdmin(async (_req, { db }) => {
  const now = Date.now();
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  const d7 = now - 7 * DAY_MS;
  const d30 = now - 30 * DAY_MS;
  const d60 = now - 60 * DAY_MS;
  const iso60 = new Date(d60).toISOString();

  const [
    companiesRes,
    profilesRes,
    vehiclesRes,
    serviceRecentRes,
    taskRecentRes,
    fuelRecentRes,
    feedbackRes,
    authUsers,
  ] = await Promise.all([
    db.from("companies").select("id, name, created_at"),
    db.from("profiles").select("id, company_id, full_name, role, created_at"),
    db.from("vehicles").select("id, company_id, created_at, insurance_expiry, inspection_expiry"),
    db.from("service_records").select("company_id, created_at").gte("created_at", iso60),
    db.from("vehicle_tasks").select("company_id, created_at").gte("created_at", iso60),
    db.from("fuel_records").select("company_id, created_at").gte("created_at", iso60),
    db.from("feedback").select("id, company_id, user_id, type, status, message, created_at").order("created_at", { ascending: false }).limit(200),
    listAllAuthUsers(db),
  ]);

  if (companiesRes.error) throw new Error(`companies: ${companiesRes.error.message}`);
  if (profilesRes.error) throw new Error(`profiles: ${profilesRes.error.message}`);

  const companies = companiesRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const vehicles = vehiclesRes.data ?? [];
  const feedback = feedbackRes.data ?? [];

  const companyName = new Map(companies.map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]));
  const profileName = new Map(profiles.map((p) => [p.id as string, (p.full_name as string) || "İsimsiz"]));

  // ── Büyüme ────────────────────────────────────────────────────────────────
  const growth: AdminOverviewResponse["growth"] = {
    usersToday: countSince(profiles, todayStart),
    users7d: countSince(profiles, d7),
    users30d: countSince(profiles, d30),
    usersPrev30d: countBetween(profiles, d60, d30),
    companiesToday: countSince(companies, todayStart),
    companies7d: countSince(companies, d7),
    companies30d: countSince(companies, d30),
    companiesPrev30d: countBetween(companies, d60, d30),
    vehicles7d: countSince(vehicles, d7),
    vehicles30d: countSince(vehicles, d30),
  };

  // ── Etkileşim (auth.users.last_sign_in_at üzerinden) ──────────────────────
  let activeToday = 0;
  let active7d = 0;
  let active30d = 0;
  let neverSignedIn = 0;
  let unconfirmedEmail = 0;
  for (const p of profiles) {
    const au = authUsers.get(p.id as string);
    if (!au) continue;
    if (!au.emailConfirmedAt) unconfirmedEmail++;
    if (!au.lastSignInAt) {
      neverSignedIn++;
      continue;
    }
    const t = new Date(au.lastSignInAt).getTime();
    if (t >= todayStart) activeToday++;
    if (t >= d7) active7d++;
    if (t >= d30) active30d++;
  }

  // ── 30 günlük seri ────────────────────────────────────────────────────────
  const seriesMap = new Map<string, { users: number; companies: number; vehicles: number }>();
  for (let i = SERIES_DAYS - 1; i >= 0; i--) {
    seriesMap.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), {
      users: 0,
      companies: 0,
      vehicles: 0,
    });
  }
  for (const p of profiles) {
    const entry = seriesMap.get(dayKey(p.created_at as string));
    if (entry) entry.users++;
  }
  for (const c of companies) {
    const entry = seriesMap.get(dayKey(c.created_at as string));
    if (entry) entry.companies++;
  }
  for (const v of vehicles) {
    const entry = seriesMap.get(dayKey(v.created_at as string));
    if (entry) entry.vehicles++;
  }
  const series = [...seriesMap.entries()].map(([date, v]) => ({ date, ...v }));

  // ── Son 7 günde üretilen içerik ───────────────────────────────────────────
  // Ömür boyu toplam yerine bunu gösteriyoruz: "12.400 servis kaydı" hiçbir
  // karara girmiyordu, "bu hafta 3" giriyor. Veri zaten 60 günlük pencereden
  // geliyor, ek sorgu yok.
  const activity7d = {
    serviceRecords: countSince(serviceRecentRes.data ?? [], d7),
    tasks: countSince(taskRecentRes.data ?? [], d7),
    fuelRecords: countSince(fuelRecentRes.data ?? [], d7),
  };

  // ── Kırılımlar ────────────────────────────────────────────────────────────
  const roleCounts = new Map<UserRole, number>();
  for (const p of profiles) {
    const role = ((p.role as UserRole) || "user") as UserRole;
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  // ── Aktivasyon hunisi ─────────────────────────────────────────────────────
  const companiesWithVehicle = new Set(vehicles.map((v) => v.company_id as string));
  const companiesWithDates = new Set(
    vehicles
      .filter((v) => v.insurance_expiry || v.inspection_expiry)
      .map((v) => v.company_id as string),
  );
  const usersPerCompany = new Map<string, number>();
  for (const p of profiles) {
    const cid = p.company_id as string;
    usersPerCompany.set(cid, (usersPerCompany.get(cid) ?? 0) + 1);
  }
  const companiesWithTeam = new Set(
    [...usersPerCompany.entries()].filter(([, n]) => n > 1).map(([cid]) => cid),
  );
  const activeCompanyIds = new Set<string>();
  for (const rows of [serviceRecentRes.data ?? [], taskRecentRes.data ?? [], fuelRecentRes.data ?? []]) {
    for (const r of rows) {
      const t = r.created_at ? new Date(r.created_at as string).getTime() : 0;
      if (t >= d30) activeCompanyIds.add(r.company_id as string);
    }
  }

  const funnel = [
    { label: "Kayıt oldu", count: companies.length },
    { label: "Araç ekledi", count: companiesWithVehicle.size },
    { label: "Tarih/belge girdi", count: companiesWithDates.size },
    { label: "Ekip davet etti", count: companiesWithTeam.size },
    { label: "Son 30 gün aktif", count: activeCompanyIds.size },
  ];

  // Şirketin son giriş anı — hem kohort hem dikkat listesi bunu kullanır.
  const lastSignInByCompany = new Map<string, number>();
  for (const p of profiles) {
    const au = authUsers.get(p.id as string);
    if (!au?.lastSignInAt) continue;
    const cid = p.company_id as string;
    const t = new Date(au.lastSignInAt).getTime();
    lastSignInByCompany.set(cid, Math.max(lastSignInByCompany.get(cid) ?? 0, t));
  }

  // ── Kohort / tutundurma ───────────────────────────────────────────────────
  // Huni "kaç adım tamamlandı" sorusuna cevap veriyor ama zaman boyutu yok.
  // Burada şirketleri kaydoldukları HAFTAYA göre grupluyoruz ve o kohorttan
  // kaçının hâlâ aktif olduğunu sayıyoruz — ürünün tutup tutmadığını söyleyen
  // tek metrik bu. Ek sorgu yok: created_at + last_sign_in_at zaten elde.
  const COHORT_WEEKS = 8;
  const WEEK_MS = 7 * DAY_MS;

  /** Haftanın pazartesi 00:00'ı (UTC) — kohort anahtarı. */
  function weekStart(ms: number): number {
    const d = new Date(ms);
    d.setUTCHours(0, 0, 0, 0);
    // getUTCDay: 0=pazar → pazartesiye çekmek için 6 gün geri.
    const back = (d.getUTCDay() + 6) % 7;
    return d.getTime() - back * DAY_MS;
  }

  const cohortMap = new Map<
    number,
    { signedUp: number; activated: number; retained: number }
  >();
  const oldestCohort = weekStart(now - (COHORT_WEEKS - 1) * WEEK_MS);

  for (const c of companies) {
    const createdMs = new Date(c.created_at as string).getTime();
    if (!Number.isFinite(createdMs)) continue;
    const key = weekStart(createdMs);
    if (key < oldestCohort) continue;

    const entry = cohortMap.get(key) ?? { signedUp: 0, activated: 0, retained: 0 };
    entry.signedUp++;
    // Aktive = en az bir araç eklemiş.
    if (companiesWithVehicle.has(c.id as string)) entry.activated++;
    // Tutundu = kayıttan en az 7 gün SONRA giriş yapmış. Kayıt günündeki giriş
    // tutundurma değildir; sadece kaydolmuş olmaktır.
    const last = lastSignInByCompany.get(c.id as string);
    if (last && last - createdMs >= 7 * DAY_MS) entry.retained++;
    cohortMap.set(key, entry);
  }

  const cohorts = [...cohortMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, v]) => ({
      weekStart: new Date(week).toISOString().slice(0, 10),
      signedUp: v.signedUp,
      activated: v.activated,
      retained: v.retained,
    }));

  // ── Dikkat listesi ────────────────────────────────────────────────────────
  const emptyCompanies = companies
    .filter((c) => !companiesWithVehicle.has(c.id as string))
    .map((c) => ({
      id: c.id as string,
      name: (c.name as string) || "İsimsiz Şirket",
      createdAt: c.created_at as string,
      ageDays: Math.floor((now - new Date(c.created_at as string).getTime()) / DAY_MS),
    }))
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 8);

  const dormantCompanies = companies
    .filter((c) => {
      const last = lastSignInByCompany.get(c.id as string);
      const created = new Date(c.created_at as string).getTime();
      if (created > d30) return false; // yeni hesaba "uykuda" demeyiz
      return !last || last < d30;
    })
    .map((c) => {
      const last = lastSignInByCompany.get(c.id as string);
      return {
        id: c.id as string,
        name: (c.name as string) || "İsimsiz Şirket",
        lastSignInAt: last ? new Date(last).toISOString() : null,
        ageDays: Math.floor((now - new Date(c.created_at as string).getTime()) / DAY_MS),
      };
    })
    .sort((a, b) => {
      const at = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
      const bt = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
      return at - bt;
    })
    .slice(0, 8);

  // ── Son kayıtlar ──────────────────────────────────────────────────────────
  const recentUsers = profiles
    .slice()
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, 8)
    .map((p) => ({
      id: p.id as string,
      fullName: (p.full_name as string) || "İsimsiz",
      email: authUsers.get(p.id as string)?.email ?? "—",
      role: (p.role as UserRole) || "user",
      companyName: companyName.get(p.company_id as string) ?? "—",
      createdAt: p.created_at as string,
    }));

  const recentCompanies = companies
    .slice()
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, 8)
    .map((c) => ({
      id: c.id as string,
      name: (c.name as string) || "İsimsiz Şirket",
      createdAt: c.created_at as string,
      userCount: usersPerCompany.get(c.id as string) ?? 0,
    }));

  const recentFeedback = feedback.slice(0, 8).map((f) => ({
    id: f.id as string,
    type: (f.type as string) || "other",
    status: (f.status as string) || "new",
    message: ((f.message as string) || "").slice(0, 300),
    companyName: companyName.get(f.company_id as string) ?? "—",
    userName: profileName.get(f.user_id as string) ?? "—",
    createdAt: f.created_at as string,
  }));

  const payload: AdminOverviewResponse = {
    totals: {
      companies: companies.length,
      users: profiles.length,
      vehicles: vehicles.length,
    },
    activity7d,
    growth,
    engagement: { activeToday, active7d, active30d, neverSignedIn, unconfirmedEmail },
    series,
    roleBreakdown: [...roleCounts.entries()].map(([role, count]) => ({ role, count })),
    funnel,
    cohorts,
    recentUsers,
    recentCompanies,
    recentFeedback,
    attention: {
      emptyCompanies,
      dormantCompanies,
      openFeedback: feedback.filter((f) => f.status !== "resolved").length,
    },
  };

  return NextResponse.json(payload);
});
