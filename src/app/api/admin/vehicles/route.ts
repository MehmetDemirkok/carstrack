export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, intParam, uniqueIds } from "@/lib/admin/api";
import type { AdminVehicleListResponse, AdminVehicleRow } from "@/lib/admin/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tüm tenant'lardaki araçların listesi.
 *
 * `image*` alanları BİLEREK seçilmiyor: base64 data-URI tutuyorlar ve tek
 * satır birkaç yüz KB olabiliyor (bkz. db-backup'taki HEAVY_TABLE_PAGE_SIZE).
 * Ağırlık bilgisi gerekiyorsa `admin_vehicle_weights` view'ı üzerinden gelir.
 */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const companyFilter = url.searchParams.get("company") ?? "all";
  const statusFilter = url.searchParams.get("status") ?? "all";
  const sort = url.searchParams.get("sort") ?? "created";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  const page = intParam(url, "page", 1, { min: 1 });
  const pageSize = intParam(url, "pageSize", 25, { min: 5, max: 200 });

  const [vehiclesRes, companiesRes, assignmentsRes] = await Promise.all([
    db
      .from("vehicles")
      .select(
        "id, company_id, plate, brand, model, year, mileage, insurance_expiry, inspection_expiry, kasko_expiry, created_at",
      ),
    db.from("companies").select("id, name"),
    db.from("vehicle_assignments").select("vehicle_id, driver_id"),
  ]);

  if (vehiclesRes.error) throw new Error(`vehicles: ${vehiclesRes.error.message}`);

  const companyNames = new Map(
    (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]),
  );

  // Araç → sürücü adı. Atama listesi araç başına birden çok satır taşıyabilir.
  const driverIds = uniqueIds((assignmentsRes.data ?? []).map((a) => a.driver_id as string));
  const driversRes = driverIds.length
    ? await db.from("profiles").select("id, full_name").in("id", driverIds)
    : { data: [], error: null };
  const driverNames = new Map(
    (driversRes.data ?? []).map((p) => [p.id as string, (p.full_name as string) || "İsimsiz"]),
  );
  const driversByVehicle = new Map<string, string[]>();
  for (const a of assignmentsRes.data ?? []) {
    const vid = a.vehicle_id as string;
    const name = driverNames.get(a.driver_id as string);
    if (!vid || !name) continue;
    const list = driversByVehicle.get(vid);
    if (list) list.push(name);
    else driversByVehicle.set(vid, [name]);
  }

  const now = Date.now();
  /** Gün cinsinden kalan süre — tarih yoksa null. */
  function daysLeft(value: unknown): number | null {
    if (!value || typeof value !== "string") return null;
    const t = new Date(value).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.floor((t - now) / DAY_MS);
  }

  const all: AdminVehicleRow[] = (vehiclesRes.data ?? []).map((v) => {
    const insuranceDays = daysLeft(v.insurance_expiry);
    const inspectionDays = daysLeft(v.inspection_expiry);
    return {
      id: v.id as string,
      plate: (v.plate as string) || "—",
      brand: (v.brand as string) || "",
      model: (v.model as string) || "",
      year: (v.year as number) ?? null,
      mileage: (v.mileage as number) ?? 0,
      companyId: (v.company_id as string) ?? null,
      companyName: companyNames.get(v.company_id as string) ?? "—",
      drivers: driversByVehicle.get(v.id as string) ?? [],
      insuranceExpiry: (v.insurance_expiry as string) ?? null,
      inspectionExpiry: (v.inspection_expiry as string) ?? null,
      kaskoExpiry: (v.kasko_expiry as string) ?? null,
      insuranceDays,
      inspectionDays,
      createdAt: v.created_at as string,
    };
  });

  /** Sigorta veya muayenesi geçmiş / 30 gün içinde dolacak mı? */
  const isExpired = (v: AdminVehicleRow) =>
    (v.insuranceDays !== null && v.insuranceDays < 0) ||
    (v.inspectionDays !== null && v.inspectionDays < 0);
  const isExpiring = (v: AdminVehicleRow) =>
    !isExpired(v) &&
    ((v.insuranceDays !== null && v.insuranceDays <= 30) ||
      (v.inspectionDays !== null && v.inspectionDays <= 30));
  const isMissingDates = (v: AdminVehicleRow) => !v.insuranceExpiry && !v.inspectionExpiry;

  const counts: AdminVehicleListResponse["counts"] = {
    all: all.length,
    expired: all.filter(isExpired).length,
    expiring: all.filter(isExpiring).length,
    missingDates: all.filter(isMissingDates).length,
    unassigned: all.filter((v) => v.drivers.length === 0).length,
  };

  let rows = all;

  if (q) {
    rows = rows.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.companyName.toLowerCase().includes(q) ||
        v.drivers.some((d) => d.toLowerCase().includes(q)),
    );
  }
  if (companyFilter !== "all") rows = rows.filter((v) => v.companyId === companyFilter);

  switch (statusFilter) {
    case "expired":
      rows = rows.filter(isExpired);
      break;
    case "expiring":
      rows = rows.filter(isExpiring);
      break;
    case "missing":
      rows = rows.filter(isMissingDates);
      break;
    case "unassigned":
      rows = rows.filter((v) => v.drivers.length === 0);
      break;
  }

  const factor = dir === "asc" ? 1 : -1;
  /** Tarihi olmayan araç sıralamanın sonuna gider — "en yakın dolacak" listesini bozmasın. */
  const nullLast = (value: number | null) => (value === null ? Number.MAX_SAFE_INTEGER : value);

  rows = rows.slice().sort((a, b) => {
    switch (sort) {
      case "plate":
        return factor * a.plate.localeCompare(b.plate, "tr");
      case "company":
        return factor * a.companyName.localeCompare(b.companyName, "tr");
      case "mileage":
        return factor * (a.mileage - b.mileage);
      case "insurance":
        return factor * (nullLast(a.insuranceDays) - nullLast(b.insuranceDays));
      case "inspection":
        return factor * (nullLast(a.inspectionDays) - nullLast(b.inspectionDays));
      default:
        return factor * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const payload: AdminVehicleListResponse = {
    vehicles: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    counts,
  };

  return NextResponse.json(payload);
});
