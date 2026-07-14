import type { ServiceRecord, ServiceType, Vehicle, VehicleTask } from "./types";

// ─── Zaman aralığı ────────────────────────────────────────────
export type AnalyticsRange = "3m" | "6m" | "12m" | "all";

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "3m": "3 Ay",
  "6m": "6 Ay",
  "12m": "12 Ay",
  all: "Tümü",
};

const RANGE_MONTHS: Record<AnalyticsRange, number | null> = {
  "3m": 3,
  "6m": 6,
  "12m": 12,
  all: null,
};

// ─── Servis tipi meta ─────────────────────────────────────────
// Kategorik renkler sabit sırada — dataviz kuralı: asla döngüsel atama.
export const SERVICE_TYPE_META: Record<ServiceType, { label: string; color: string }> = {
  routine:    { label: "Periyodik Bakım", color: "var(--chart-1)" },
  repair:     { label: "Onarım",          color: "var(--chart-3)" },
  tire:       { label: "Lastik",          color: "var(--chart-2)" },
  inspection: { label: "Muayene",         color: "var(--chart-4)" },
  battery:    { label: "Akü",             color: "var(--chart-5)" },
  other:      { label: "Diğer",           color: "var(--muted-foreground)" },
};

const SERVICE_TYPE_ORDER: ServiceType[] = ["routine", "repair", "tire", "inspection", "battery", "other"];

const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// ─── Biçimlendiriciler ────────────────────────────────────────
export function formatTRY(n: number): string {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}

/** Eksen/rozet için kısa para birimi: 1.250 → ₺1,3B, 2.500.000 → ₺2,5Mn */
export function formatCompactTRY(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₺${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}Mn`;
  if (abs >= 1_000) return `₺${(n / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}B`;
  return `₺${Math.round(n)}`;
}

export function formatKm(n: number): string {
  return `${Math.round(n).toLocaleString("tr-TR")} km`;
}

// ─── Aralık yardımcıları ──────────────────────────────────────
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/**
 * Seçilen aralık için ay kovaları üretir (eskiden yeniye). "all" seçiliyse en
 * eski kayıttan bugüne, en fazla 18 ay; hiç kayıt yoksa son 6 ay.
 */
export function getMonthBuckets(
  range: AnalyticsRange,
  records: ServiceRecord[],
  now: Date = new Date(),
): { year: number; month: number; key: string; label: string }[] {
  const months = RANGE_MONTHS[range];
  let count: number;

  if (months !== null) {
    count = months;
  } else {
    const dates = records.map((r) => new Date(r.date).getTime()).filter((t) => !Number.isNaN(t));
    if (dates.length === 0) {
      count = 6;
    } else {
      const earliest = new Date(Math.min(...dates));
      const diff =
        (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1;
      count = Math.min(18, Math.max(6, diff));
    }
  }

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), key: monthKey(d), label: MONTH_SHORT[d.getMonth()] };
  });
}

/** Aralığın başlangıç zamanını döndürür (all → -Infinity). */
export function rangeStart(range: AnalyticsRange, now: Date = new Date()): number {
  const months = RANGE_MONTHS[range];
  if (months === null) return -Infinity;
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getTime();
}

export function filterRecordsByRange(
  records: ServiceRecord[],
  range: AnalyticsRange,
  now: Date = new Date(),
): ServiceRecord[] {
  const start = rangeStart(range, now);
  if (start === -Infinity) return records;
  return records.filter((r) => {
    const t = new Date(r.date).getTime();
    return !Number.isNaN(t) && t >= start;
  });
}

// ─── Aylık maliyet serisi (ödenen / ödenmeyen) ────────────────
export interface MonthlyCostPoint {
  key: string;
  label: string;
  paid: number;
  unpaid: number;
  total: number;
  count: number;
}

export function monthlyCostSeries(
  records: ServiceRecord[],
  range: AnalyticsRange,
  now: Date = new Date(),
): MonthlyCostPoint[] {
  const buckets = getMonthBuckets(range, records, now);
  const byKey = new Map<string, MonthlyCostPoint>();
  for (const b of buckets) {
    byKey.set(b.key, { key: b.key, label: b.label, paid: 0, unpaid: 0, total: 0, count: 0 });
  }
  for (const r of records) {
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    const point = byKey.get(monthKey(d));
    if (!point) continue;
    const cost = r.cost ?? 0;
    if (r.paymentStatus === "unpaid") point.unpaid += cost;
    else point.paid += cost;
    point.total += cost;
    point.count += 1;
  }
  return buckets.map((b) => byKey.get(b.key)!);
}

// ─── Servis tipine göre maliyet ───────────────────────────────
export interface TypeCostSlice {
  type: ServiceType;
  label: string;
  color: string;
  total: number;
  count: number;
}

export function costByType(records: ServiceRecord[]): TypeCostSlice[] {
  const totals = new Map<ServiceType, { total: number; count: number }>();
  for (const r of records) {
    const cur = totals.get(r.type) ?? { total: 0, count: 0 };
    cur.total += r.cost ?? 0;
    cur.count += 1;
    totals.set(r.type, cur);
  }
  return SERVICE_TYPE_ORDER.map((type) => {
    const meta = SERVICE_TYPE_META[type];
    const agg = totals.get(type) ?? { total: 0, count: 0 };
    return { type, label: meta.label, color: meta.color, total: agg.total, count: agg.count };
  }).filter((s) => s.count > 0);
}

// ─── Araç bazında maliyet ─────────────────────────────────────
export interface VehicleCostRow {
  vehicleId: string;
  plate: string;
  name: string;
  total: number;
  count: number;
  distance: number;
  costPerKm: number | null;
}

export function costByVehicle(
  records: ServiceRecord[],
  vehicles: Vehicle[],
  tasksInRange: VehicleTask[] = [],
): VehicleCostRow[] {
  const distByVehicle = new Map<string, number>();
  for (const t of tasksInRange) {
    if (t.distance && t.distance > 0) {
      distByVehicle.set(t.vehicleId, (distByVehicle.get(t.vehicleId) ?? 0) + t.distance);
    }
  }

  const rows = vehicles.map((v) => {
    const vRecords = records.filter((r) => r.vehicleId === v.id);
    const total = vRecords.reduce((s, r) => s + (r.cost ?? 0), 0);
    const distance = distByVehicle.get(v.id) ?? 0;
    return {
      vehicleId: v.id,
      plate: v.plate,
      name: `${v.brand} ${v.model}`.trim(),
      total,
      count: vRecords.length,
      distance,
      costPerKm: distance > 0 && total > 0 ? total / distance : null,
    };
  });

  return rows.filter((r) => r.total > 0 || r.distance > 0).sort((a, b) => b.total - a.total);
}

// ─── Mesafe (görevlerden) ─────────────────────────────────────
export function filterTasksByRange(
  tasks: VehicleTask[],
  range: AnalyticsRange,
  now: Date = new Date(),
): VehicleTask[] {
  const completed = tasks.filter((t) => t.status === "completed" && (t.distance ?? 0) > 0);
  const start = rangeStart(range, now);
  if (start === -Infinity) return completed;
  return completed.filter((t) => {
    const t0 = new Date(t.startTime).getTime();
    return !Number.isNaN(t0) && t0 >= start;
  });
}

export interface DistanceRow {
  vehicleId: string;
  plate: string;
  name: string;
  distance: number;
  trips: number;
}

export function distanceByVehicle(tasksInRange: VehicleTask[], vehicles: Vehicle[]): DistanceRow[] {
  const byVehicle = new Map<string, { distance: number; trips: number }>();
  for (const t of tasksInRange) {
    const cur = byVehicle.get(t.vehicleId) ?? { distance: 0, trips: 0 };
    cur.distance += t.distance ?? 0;
    cur.trips += 1;
    byVehicle.set(t.vehicleId, cur);
  }
  return vehicles
    .map((v) => {
      const agg = byVehicle.get(v.id) ?? { distance: 0, trips: 0 };
      return {
        vehicleId: v.id,
        plate: v.plate,
        name: `${v.brand} ${v.model}`.trim(),
        distance: agg.distance,
        trips: agg.trips,
      };
    })
    .filter((r) => r.distance > 0)
    .sort((a, b) => b.distance - a.distance);
}

// ─── Özet KPI'lar ─────────────────────────────────────────────
export interface AnalyticsSummary {
  totalCost: number;
  paidCost: number;
  unpaidCost: number;
  unpaidCount: number;
  recordCount: number;
  avgCostPerVehicle: number;
  totalDistance: number;
  costPerKm: number | null;
  /** Bir önceki eşit uzunluktaki dönemin toplam maliyeti (all → null). */
  prevTotalCost: number | null;
  /** Yüzde değişim (prev===0 veya all → null). */
  costTrendPct: number | null;
}

export function computeSummary(
  recordsInRange: ServiceRecord[],
  vehicles: Vehicle[],
  tasksInRange: VehicleTask[],
  allRecords: ServiceRecord[],
  range: AnalyticsRange,
  now: Date = new Date(),
): AnalyticsSummary {
  const paidCost = recordsInRange
    .filter((r) => r.paymentStatus !== "unpaid")
    .reduce((s, r) => s + (r.cost ?? 0), 0);
  const unpaid = recordsInRange.filter((r) => r.paymentStatus === "unpaid");
  const unpaidCost = unpaid.reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalCost = paidCost + unpaidCost;
  const totalDistance = tasksInRange.reduce((s, t) => s + (t.distance ?? 0), 0);

  // Önceki eşit dönem karşılaştırması (trend rozeti için)
  let prevTotalCost: number | null = null;
  let costTrendPct: number | null = null;
  const months = RANGE_MONTHS[range];
  if (months !== null) {
    const curStart = rangeStart(range, now);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - (months * 2 - 1), 1).getTime();
    prevTotalCost = allRecords
      .filter((r) => {
        const t = new Date(r.date).getTime();
        return !Number.isNaN(t) && t >= prevStart && t < curStart;
      })
      .reduce((s, r) => s + (r.cost ?? 0), 0);
    if (prevTotalCost > 0) {
      costTrendPct = ((totalCost - prevTotalCost) / prevTotalCost) * 100;
    }
  }

  return {
    totalCost,
    paidCost,
    unpaidCost,
    unpaidCount: unpaid.length,
    recordCount: recordsInRange.length,
    avgCostPerVehicle: vehicles.length > 0 ? totalCost / vehicles.length : 0,
    totalDistance,
    costPerKm: totalDistance > 0 && totalCost > 0 ? totalCost / totalDistance : null,
    prevTotalCost,
    costTrendPct,
  };
}

// ─── Belge yenileme takvimi ───────────────────────────────────
export type DocKind = "insurance" | "kasko" | "inspection" | "green-card";

export interface RenewalItem {
  vehicleId: string;
  plate: string;
  kind: DocKind;
  label: string;
  company: string;
  expiry: string;
  days: number;
}

const DOC_LABELS: Record<DocKind, string> = {
  insurance: "Trafik Sigortası",
  kasko: "Kasko",
  inspection: "Muayene",
  "green-card": "Yeşil Kart",
};

export function getRenewals(vehicles: Vehicle[], now: Date = new Date()): RenewalItem[] {
  const items: RenewalItem[] = [];
  const push = (v: Vehicle, kind: DocKind, expiry: string, company: string) => {
    if (!expiry) return;
    const t = new Date(expiry).getTime();
    if (Number.isNaN(t)) return;
    const days = Math.ceil((t - now.getTime()) / 86400000);
    items.push({ vehicleId: v.id, plate: v.plate, kind, label: DOC_LABELS[kind], company, expiry, days });
  };
  for (const v of vehicles) {
    push(v, "insurance", v.insuranceExpiry, v.insuranceCompany);
    push(v, "kasko", v.kaskoExpiry, v.kaskoCompany);
    push(v, "inspection", v.inspectionExpiry, "");
    push(v, "green-card", v.greenCardExpiry, v.greenCardCompany);
  }
  // Yalnızca yaklaşan / geçmiş 120 gün içindekiler, en acilden en uzağa
  return items.filter((i) => i.days <= 120).sort((a, b) => a.days - b.days);
}
