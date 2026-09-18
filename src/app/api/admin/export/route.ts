export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { withAdmin, isBanned, listAllAuthUsers } from "@/lib/admin/api";
import type { PlanType, UserRole } from "@/lib/types";

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

/** Kullanıcı veya şirket listesini CSV olarak indirir. */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "users";
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "companies") {
    const [companiesRes, profilesRes, vehiclesRes] = await Promise.all([
      db.from("companies").select("id, name, plan, created_at, email, phone, timezone"),
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
      ["Şirket", "Plan", "Kullanıcı", "Araç", "E-posta", "Telefon", "Saat dilimi", "Kayıt tarihi"],
      (companiesRes.data ?? [])
        .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
        .map((c) => [
          c.name,
          ((c.plan as PlanType) || "free"),
          userCount.get(c.id as string) ?? 0,
          vehicleCount.get(c.id as string) ?? 0,
          c.email ?? "",
          c.phone ?? "",
          c.timezone ?? "",
          isoToTr(c.created_at as string),
        ]),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="carstrack-sirketler-${stamp}.csv"`,
      },
    });
  }

  const [profilesRes, companiesRes, authUsers] = await Promise.all([
    db.from("profiles").select("id, company_id, full_name, role, department, created_at, notify_by_email"),
    db.from("companies").select("id, name, plan"),
    listAllAuthUsers(db),
  ]);

  const companies = new Map(
    (companiesRes.data ?? []).map((c) => [
      c.id as string,
      { name: (c.name as string) || "", plan: ((c.plan as PlanType) || "free") as PlanType },
    ]),
  );

  const csv = toCsv(
    [
      "Ad Soyad",
      "E-posta",
      "Rol",
      "Şirket",
      "Plan",
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
          company?.plan ?? "",
          p.department ?? "",
          isoToTr(p.created_at as string),
          isoToTr(au?.lastSignInAt ?? null),
          au?.emailConfirmedAt ? "Evet" : "Hayır",
          au && isBanned(au) ? "Evet" : "Hayır",
          p.notify_by_email === false ? "Kapalı" : "Açık",
        ];
      }),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="carstrack-kullanicilar-${stamp}.csv"`,
    },
  });
});
