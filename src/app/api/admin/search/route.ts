export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, listAllAuthUsers } from "@/lib/admin/api";
import type { UserRole } from "@/lib/types";

const LIMIT = 6;

/**
 * Panel üstündeki global arama: kullanıcı (ad/e-posta), şirket (ad) ve
 * araç (plaka) tek sorguda taranır.
 */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  if (q.length < 2) {
    return NextResponse.json({ users: [], companies: [], vehicles: [] });
  }

  const [profilesRes, companiesRes, vehiclesRes, authUsers] = await Promise.all([
    db.from("profiles").select("id, company_id, full_name, role").ilike("full_name", `%${q}%`).limit(LIMIT),
    db.from("companies").select("id, name").ilike("name", `%${q}%`).limit(LIMIT),
    db.from("vehicles").select("id, company_id, plate, brand, model").ilike("plate", `%${q}%`).limit(LIMIT),
    listAllAuthUsers(db),
  ]);

  // E-posta `auth.users`'ta olduğu için ad araması sonuçlarına e-posta
  // eşleşmelerini ayrıca ekliyoruz.
  const byName = profilesRes.data ?? [];
  const nameHits = new Set(byName.map((p) => p.id as string));
  const emailHitIds = [...authUsers.values()]
    .filter((u) => u.email.toLowerCase().includes(q) && !nameHits.has(u.id))
    .slice(0, LIMIT)
    .map((u) => u.id);

  const emailHitsRes = emailHitIds.length
    ? await db.from("profiles").select("id, company_id, full_name, role").in("id", emailHitIds)
    : { data: [], error: null };

  const allCompanyIds = [
    ...new Set([
      ...byName.map((p) => p.company_id as string),
      ...(emailHitsRes.data ?? []).map((p) => p.company_id as string),
      ...(vehiclesRes.data ?? []).map((v) => v.company_id as string),
    ]),
  ].filter(Boolean);

  const namesRes = allCompanyIds.length
    ? await db.from("companies").select("id, name").in("id", allCompanyIds)
    : { data: [], error: null };
  const companyNames = new Map(
    (namesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]),
  );

  const users = [...byName, ...(emailHitsRes.data ?? [])].slice(0, LIMIT).map((p) => ({
    id: p.id as string,
    fullName: (p.full_name as string) || "İsimsiz",
    email: authUsers.get(p.id as string)?.email ?? "—",
    role: ((p.role as UserRole) || "user") as UserRole,
    companyName: companyNames.get(p.company_id as string) ?? "—",
  }));

  return NextResponse.json({
    users,
    companies: (companiesRes.data ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string) || "İsimsiz Şirket",
    })),
    vehicles: (vehiclesRes.data ?? []).map((v) => ({
      id: v.id as string,
      plate: (v.plate as string) || "—",
      label: `${v.brand ?? ""} ${v.model ?? ""}`.trim(),
      companyId: v.company_id as string,
      companyName: companyNames.get(v.company_id as string) ?? "—",
    })),
  });
});
