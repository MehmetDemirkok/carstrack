import type { FleetAlert, FuelRecord, FuelVehicleLatest, FuelVehicleStats, FuelPurchaseType, FuelPaymentMethod } from "./types";

export const FUEL_TYPES: FuelPurchaseType[] = ["motorin", "benzin", "lpg", "elektrik"];
export const FUEL_TYPE_LABELS: Record<FuelPurchaseType, string> = {
  motorin: "Motorin",
  benzin: "Benzin",
  lpg: "LPG",
  elektrik: "Elektrik",
};

export const PAYMENT_METHODS: FuelPaymentMethod[] = ["nakit", "kredi_karti", "yakit_karti", "fatura", "diger"];
export const PAYMENT_METHOD_LABELS: Record<FuelPaymentMethod, string> = {
  nakit: "Nakit",
  kredi_karti: "Kredi Kartı",
  yakit_karti: "Yakıt Kartı",
  fatura: "Fatura",
  diger: "Diğer",
};

/** Anormal tüketim eşiği ayarlanamadığında kullanılan varsayılan (%). Hard-code edilmez — companies.fuel_anomaly_threshold_pct ile geçersiz kılınabilir. */
export const DEFAULT_FUEL_ANOMALY_THRESHOLD_PCT = 15;

// ─── Formatlama ─────────────────────────────────────────────────

export function formatTRY(n: number): string {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}

/** Kuruş hassasiyetli — litre fiyatı gibi küçük ama anlamlı ondalıklar için. */
export function formatTRY2(n: number): string {
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatLiters(n: number): string {
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L`;
}

export function formatConsumption(n?: number | null): string {
  if (n === undefined || n === null) return "—";
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L/100km`;
}

export function formatCostPerKm(n?: number | null): string {
  if (n === undefined || n === null) return "—";
  return `${formatTRY2(n)}/KM`;
}

export function formatKm(n: number): string {
  return `${Math.round(n).toLocaleString("tr-TR")} KM`;
}

// ─── Değişim göstergesi (önceki aya göre) ────────────────────────

export interface ChangeIndicator {
  pct: number | null;
  direction: "up" | "down" | "flat";
  /** true ise bu değişim olumlu (yeşil), false ise olumsuz (kırmızı). */
  favorable: boolean;
}

/**
 * Bu ay / geçen ay karşılaştırması. Yakıt KPI'larının tamamında (maliyet,
 * tüketim, litre fiyatı, KM maliyeti) düşüş olumlu, artış olumsuzdur —
 * `higherIsBetter` yalnızca ileride tersi bir metrik eklenirse kullanılır.
 */
export function computeChange(current: number, previous: number, higherIsBetter = false): ChangeIndicator {
  if (!previous || previous <= 0) {
    if (!current || current <= 0) return { pct: null, direction: "flat", favorable: true };
    return { pct: null, direction: "up", favorable: higherIsBetter };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { pct, direction: "flat", favorable: true };
  const direction = pct > 0 ? "up" : "down";
  const favorable = direction === "up" ? higherIsBetter : !higherIsBetter;
  return { pct, direction, favorable };
}

// ─── Aylık seri (dashboard/analiz grafikleri için) ───────────────

export interface MonthlyFuelPoint {
  key: string;
  label: string;
  totalCost: number;
  totalLiters: number;
}

/** Verilen (bounded) kayıt listesinden son N ayı kapsayan aylık toplam üretir — boş aylar da 0 olarak yer alır. */
export function monthlyFuelSeries(
  rows: { fueledAt: string; totalAmount: number; liters: number }[],
  months: number,
): MonthlyFuelPoint[] {
  const now = new Date();
  const points: MonthlyFuelPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({
      key,
      label: d.toLocaleDateString("tr-TR", { month: "short" }),
      totalCost: 0,
      totalLiters: 0,
    });
  }
  const byKey = new Map(points.map((p) => [p.key, p]));
  for (const r of rows) {
    const d = new Date(r.fueledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const p = byKey.get(key);
    if (!p) continue;
    p.totalCost += r.totalAmount;
    p.totalLiters += r.liters;
  }
  return points;
}

// ─── KPI hesaplama (bu ay / geçen ay) ────────────────────────────

export interface FuelKpiSet {
  totalCost: number;
  totalLiters: number;
  totalDistance: number;
  /** Ağırlıklı: toplam litre / toplam mesafe × 100 — az kayıtlı aylarda sapmayı azaltır. */
  avgConsumption: number | null;
  /** Ağırlıklı: toplam maliyet / toplam litre. */
  avgPricePerLiter: number | null;
  /** Toplam maliyet / toplam mesafe. */
  costPerKm: number | null;
}

export function computeFuelKpiSet(rows: { totalAmount: number; liters: number; distanceKm?: number }[]): FuelKpiSet {
  let totalCost = 0, totalLiters = 0, totalDistance = 0;
  for (const r of rows) {
    totalCost += r.totalAmount;
    totalLiters += r.liters;
    if (r.distanceKm) totalDistance += r.distanceKm;
  }
  return {
    totalCost,
    totalLiters,
    totalDistance,
    avgConsumption: totalDistance > 0 ? (totalLiters / totalDistance) * 100 : null,
    avgPricePerLiter: totalLiters > 0 ? totalCost / totalLiters : null,
    costPerKm: totalDistance > 0 ? totalCost / totalDistance : null,
  };
}

/** Verilen (bounded, son birkaç ay) satırları bu ay / geçen ay olarak ikiye ayırır. */
export function splitCurrentPreviousMonth<T extends { fueledAt: string }>(rows: T[]): { current: T[]; previous: T[] } {
  const now = new Date();
  const curKey = `${now.getFullYear()}-${now.getMonth()}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${prevDate.getMonth()}`;
  const current: T[] = [];
  const previous: T[] = [];
  for (const r of rows) {
    const d = new Date(r.fueledAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key === curKey) current.push(r);
    else if (key === prevKey) previous.push(r);
  }
  return { current, previous };
}

// ─── Anormal tüketim tespiti (dashboard/filo uyarıları) ──────────

/**
 * Her aracın en son yakıt kaydındaki tüketimini geçmiş ortalamasıyla
 * karşılaştırır. Sapma eşiğin (varsayılan %15, şirket ayarından gelir)
 * üzerindeyse FleetAlert üretir — mevcut uyarı boru hattına (dashboard,
 * analitik, e-posta/push özeti, PDF raporu) aynen eklenir.
 *
 * En az 3 geçerli (tüketimi hesaplanabilen) kayıt olmadan karşılaştırma
 * yapılmaz — çok az veriyle yanlış pozitif üretmemek için.
 */
export function getFuelConsumptionAlerts(
  latest: FuelVehicleLatest[],
  stats: FuelVehicleStats[],
  thresholdPct: number = DEFAULT_FUEL_ANOMALY_THRESHOLD_PCT,
): FleetAlert[] {
  const statsByVehicle = new Map(stats.map((s) => [s.vehicleId, s]));
  const alerts: FleetAlert[] = [];

  for (const l of latest) {
    if (l.consumptionL100km === undefined || l.consumptionL100km === null) continue;
    const s = statsByVehicle.get(l.vehicleId);
    if (!s || s.purchaseCount < 3 || !s.avgConsumption || s.avgConsumption <= 0) continue;

    const diffPct = ((l.consumptionL100km - s.avgConsumption) / s.avgConsumption) * 100;
    if (diffPct <= thresholdPct) continue;

    const name = `${l.vehicleBrand} ${l.vehicleModel}`.trim();
    const severity = diffPct >= thresholdPct * 2.5 ? "critical" : "warning";

    alerts.push({
      id: `${l.vehicleId}-fuel-anomaly`,
      vehicleId: l.vehicleId,
      vehiclePlate: l.vehiclePlate,
      vehicleName: name,
      title: "Anormal Yakıt Tüketimi",
      description:
        `${l.vehiclePlate} son yakıt alımında ${l.consumptionL100km.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L/100km tüketim gösterdi — ` +
        `normal ortalaması olan ${s.avgConsumption.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L/100km'nin %${Math.round(diffPct)} üzerinde. ` +
        `Olası nedenler: agresif sürüş, uzun süre rölanti, lastik basıncı, bakım ihtiyacı veya yakıt kaydı hatası olabilir — kesin teşhis için aracı kontrol edin.`,
      severity,
      category: "fuel",
    });
  }

  return alerts;
}

// ─── Veri tutarsızlığı / şüpheli kayıt tespiti ───────────────────

export interface FuelRecordFlag {
  code: "km_regression" | "high_liters" | "low_liters" | "consumption_deviation" | "close_records";
  label: string;
  severity: "warning" | "critical";
}

/**
 * Tek bir yakıt kaydı için "şüpheli kayıt / veri tutarsızlığı" bayrakları.
 * Bunlar "yakıt hırsızlığı kesinleşti" değil, kontrol edilmesi önerilen
 * durumlardır — tabloda rozet olarak gösterilir.
 */
export function getFuelRecordFlags(
  record: Pick<FuelRecord, "liters" | "odometer" | "prevOdometer" | "consumptionL100km">,
  vehicleStats?: Pick<FuelVehicleStats, "avgConsumption" | "purchaseCount">,
  thresholdPct: number = DEFAULT_FUEL_ANOMALY_THRESHOLD_PCT,
): FuelRecordFlag[] {
  const flags: FuelRecordFlag[] = [];

  if (record.prevOdometer !== undefined && record.odometer <= record.prevOdometer) {
    flags.push({
      code: "km_regression",
      label: record.odometer < record.prevOdometer ? "KM geri gitti" : "Aynı KM'de tekrar kayıt",
      severity: "critical",
    });
  }

  if (record.liters > 200) {
    flags.push({ code: "high_liters", label: "Olağandışı yüksek litre", severity: "warning" });
  } else if (record.liters < 2) {
    flags.push({ code: "low_liters", label: "Olağandışı düşük litre", severity: "warning" });
  }

  if (
    record.consumptionL100km !== undefined &&
    vehicleStats?.avgConsumption &&
    vehicleStats.purchaseCount >= 3 &&
    vehicleStats.avgConsumption > 0
  ) {
    const diffPct = Math.abs((record.consumptionL100km - vehicleStats.avgConsumption) / vehicleStats.avgConsumption) * 100;
    if (diffPct > thresholdPct) {
      flags.push({ code: "consumption_deviation", label: "Ortalama tüketimden sapma", severity: "warning" });
    }
  }

  return flags;
}

/**
 * Aynı aracın kronolojik geçmişinde çok yakın zamanlı (varsayılan 30 dk)
 * ardışık kayıtları işaretler — tek bir dolumun yanlışlıkla iki kez
 * girilmiş olabileceğine işaret eder. Tek bir aracın TÜM geçmişi üzerinde
 * çalışacak şekilde tasarlanmıştır (araç detay sayfası / analiz).
 */
export function getCloseRecordPairs(
  vehicleRecords: Pick<FuelRecord, "id" | "fueledAt">[],
  withinMinutes = 30,
): Set<string> {
  const suspicious = new Set<string>();
  const sorted = [...vehicleRecords].sort((a, b) => new Date(a.fueledAt).getTime() - new Date(b.fueledAt).getTime());
  for (let i = 1; i < sorted.length; i++) {
    const diffMin = (new Date(sorted[i].fueledAt).getTime() - new Date(sorted[i - 1].fueledAt).getTime()) / 60000;
    if (diffMin >= 0 && diffMin <= withinMinutes) {
      suspicious.add(sorted[i].id);
      suspicious.add(sorted[i - 1].id);
    }
  }
  return suspicious;
}
