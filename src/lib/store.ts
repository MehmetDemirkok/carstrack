import type { Vehicle, FleetAlert, MaintenanceItem } from "./types";

// ─── Maintenance Templates ────────────────────────────────────

export const MAINTENANCE_TEMPLATES: Omit<MaintenanceItem, "lastDoneDate" | "lastDoneMileage">[] = [
  { id: "oil", name: "Yağ Değişimi", intervalKm: 15000, intervalMonths: 12 },
  { id: "airfilter", name: "Hava Filtresi", intervalKm: 20000, intervalMonths: 24 },
  { id: "cabinfilter", name: "Kabin Filtresi", intervalKm: 15000, intervalMonths: 12 },
  { id: "fuelfilter", name: "Yakıt Filtresi", intervalKm: 40000, intervalMonths: 48 },
  { id: "sparkplug", name: "Buji", intervalKm: 30000, intervalMonths: 36 },
  { id: "timingbelt", name: "Triger Kayışı / Zinciri", intervalKm: 80000, intervalMonths: 60 },
  { id: "brakefluid", name: "Fren Hidroliği", intervalMonths: 24 },
  { id: "coolant", name: "Antifiriz", intervalMonths: 36 },
  { id: "brakefront", name: "Ön Fren Balatası", intervalKm: 40000 },
  { id: "brakerear", name: "Arka Fren Balatası", intervalKm: 60000 },
];

// ─── Health Score & Maintenance Status ────────────────────────

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

export function docScore(expiryDateStr: string): number {
  if (!expiryDateStr) return 100;
  const days = daysBetween(new Date(), new Date(expiryDateStr));
  if (days < 0) return 0;
  if (days < 15) return 20;
  if (days < 30) return 40;
  if (days < 60) return 65;
  if (days < 90) return 80;
  return 100;
}

function itemScore(item: MaintenanceItem, currentMileage: number): number {
  let kmScore = 100;
  let monthScore = 100;

  if (item.intervalKm && item.lastDoneMileage !== undefined) {
    const ratio = (currentMileage - item.lastDoneMileage) / item.intervalKm;
    if (ratio >= 1.1) kmScore = 0;
    else if (ratio >= 1.0) kmScore = 20;
    else if (ratio >= 0.9) kmScore = 50;
    else if (ratio >= 0.75) kmScore = 75;
    else kmScore = 100;
  }

  if (item.intervalMonths && item.lastDoneDate) {
    const months = monthsBetween(new Date(item.lastDoneDate), new Date());
    const ratio = months / item.intervalMonths;
    if (ratio >= 1.1) monthScore = 0;
    else if (ratio >= 1.0) monthScore = 20;
    else if (ratio >= 0.9) monthScore = 50;
    else if (ratio >= 0.75) monthScore = 75;
    else monthScore = 100;
  }

  return Math.min(kmScore, monthScore);
}

export function calculateHealthScoreBreakdown(vehicle: Vehicle): {
  insurance: number;
  inspection: number;
  maintenance: number;
  overall: number;
} {
  const insurance = docScore(vehicle.insuranceExpiry);
  const inspection = docScore(vehicle.inspectionExpiry);
  const itemScores = vehicle.maintenanceItems.map((item) => itemScore(item, vehicle.mileage));
  const maintenance = itemScores.length > 0
    ? itemScores.reduce((a, b) => a + b, 0) / itemScores.length
    : 100;
  const overall = Math.round(insurance * 0.15 + inspection * 0.15 + maintenance * 0.7);
  return { insurance: Math.round(insurance), inspection: Math.round(inspection), maintenance: Math.round(maintenance), overall };
}

export function calculateHealthScore(vehicle: Vehicle): number {
  const insScore = docScore(vehicle.insuranceExpiry);
  const inspScore = docScore(vehicle.inspectionExpiry);

  const itemScores = vehicle.maintenanceItems.map((item) =>
    itemScore(item, vehicle.mileage)
  );
  const avgItemScore =
    itemScores.length > 0
      ? itemScores.reduce((a, b) => a + b, 0) / itemScores.length
      : 100;

  return Math.round(insScore * 0.15 + inspScore * 0.15 + avgItemScore * 0.7);
}

export function getMaintenanceStatusForItem(
  item: MaintenanceItem,
  currentMileage: number
): "overdue" | "warning" | "good" {
  const score = itemScore(item, currentMileage);
  if (score <= 20) return "overdue";
  if (score <= 65) return "warning";
  return "good";
}

export function getMaintenanceProgress(item: MaintenanceItem, currentMileage: number): number {
  let kmRatio = 0;
  let monthRatio = 0;

  if (item.intervalKm && item.lastDoneMileage !== undefined) {
    kmRatio = Math.min(1, (currentMileage - item.lastDoneMileage) / item.intervalKm);
  }
  if (item.intervalMonths && item.lastDoneDate) {
    const months = monthsBetween(new Date(item.lastDoneDate), new Date());
    monthRatio = Math.min(1, months / item.intervalMonths);
  }

  return Math.round(Math.max(kmRatio, monthRatio) * 100);
}

// ─── Periodic Service Sync ────────────────────────────────────
// Bir "periyodik bakım" servis kaydı eklenince çağrılır. Kullanıcının bu
// serviste "yapıldı" olarak işaretlediği bakım kalemlerinin (doneItemIds) son
// yapılma tarih/km'sini kayıttan günceller; "Son Servis" alanlarını ve yağ
// kalemine göre sonraki servis km'sini yeniden hesaplar. Bakım sekmesi bu
// maintenanceItems'i okuduğu için iki yer otomatik senkron kalır.
// Tek giriş noktası: servis kaydı.
const DEFAULT_OIL_INTERVAL_KM = 15000;

export function applyPeriodicService(
  vehicle: Vehicle,
  recordDate: string,
  recordMileage: number,
  doneItemIds: string[]
): Partial<Vehicle> {
  const done = new Set(doneItemIds);
  const maintenanceItems = vehicle.maintenanceItems.map((item) =>
    done.has(item.id)
      ? { ...item, lastDoneDate: recordDate, lastDoneMileage: recordMileage }
      : item
  );

  // Sonraki servis km'si yağ değişimine göre belirlenir; yağ bu serviste
  // yapıldıysa kayıt km'sinden, yapılmadıysa mevcut yağ verisinden türer.
  const oil = maintenanceItems.find((i) => i.id === "oil");
  const nextServiceMileage =
    oil?.lastDoneMileage !== undefined
      ? oil.lastDoneMileage + (oil.intervalKm ?? DEFAULT_OIL_INTERVAL_KM)
      : vehicle.nextServiceMileage;

  return {
    maintenanceItems,
    lastServiceDate: recordDate,
    lastServiceMileage: recordMileage,
    nextServiceMileage,
  };
}

// ─── Fleet Alerts ─────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function getFleetAlerts(vehicles: Vehicle[]): FleetAlert[] {
  const alerts: FleetAlert[] = [];
  const today = new Date();

  for (const v of vehicles) {
    const name = `${v.brand} ${v.model}`;

    // ── Sigorta ──────────────────────────────────────────────────
    if (v.insuranceExpiry) {
      const insDays = daysBetween(today, new Date(v.insuranceExpiry));
      const insCompany = v.insuranceCompany ? ` (${v.insuranceCompany})` : "";
      if (insDays < 0) {
        alerts.push({ id: `${v.id}-ins`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Sigorta Süresi Doldu", description: `${v.plate} aracının sigortası${insCompany} ${formatDate(v.insuranceExpiry)} tarihinde sona erdi. Lütfen en kısa sürede yenileyin.`, severity: "critical", category: "insurance" });
      } else if (insDays <= 60) {
        const urgency = insDays <= 14 ? "Acil: " : "";
        alerts.push({ id: `${v.id}-ins`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: `${urgency}Sigorta Bitiyor`, description: `${v.plate} aracının sigortası${insCompany} ${formatDate(v.insuranceExpiry)} tarihinde bitiyor — ${insDays} gün kaldı.`, severity: insDays <= 14 ? "critical" : "warning", category: "insurance" });
      }
    }

    // ── Yeşil Kart ───────────────────────────────────────────────
    if (v.greenCardExpiry) {
      const gcDays = daysBetween(today, new Date(v.greenCardExpiry));
      const gcCompany = v.greenCardCompany ? ` (${v.greenCardCompany})` : "";
      if (gcDays < 0) {
        alerts.push({ id: `${v.id}-gc`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Yeşil Kart Süresi Doldu", description: `${v.plate} aracının yeşil kartı${gcCompany} ${formatDate(v.greenCardExpiry)} tarihinde sona erdi.`, severity: "critical", category: "green-card" });
      } else if (gcDays <= 60) {
        alerts.push({ id: `${v.id}-gc`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Yeşil Kart Bitiyor", description: `${v.plate} aracının yeşil kartı${gcCompany} ${formatDate(v.greenCardExpiry)} tarihinde bitiyor — ${gcDays} gün kaldı.`, severity: gcDays <= 14 ? "critical" : "warning", category: "green-card" });
      }
    }

    // ── Muayene ──────────────────────────────────────────────────
    if (v.inspectionExpiry) {
      const muaDays = daysBetween(today, new Date(v.inspectionExpiry));
      if (muaDays < 0) {
        alerts.push({ id: `${v.id}-mua`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Muayene Süresi Doldu", description: `${v.plate} aracının muayenesi ${formatDate(v.inspectionExpiry)} tarihinde sona erdi. Trafik cezasına maruz kalmamak için yaptırın.`, severity: "critical", category: "inspection" });
      } else if (muaDays <= 60) {
        const urgency = muaDays <= 14 ? "Acil: " : "";
        alerts.push({ id: `${v.id}-mua`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: `${urgency}Muayene Yaklaşıyor`, description: `${v.plate} aracının muayene tarihi ${formatDate(v.inspectionExpiry)} — ${muaDays} gün kaldı.`, severity: muaDays <= 14 ? "critical" : "warning", category: "inspection" });
      }
    }

    // ── Lastik ───────────────────────────────────────────────────
    if (v.tireStatus === "Kışlık") {
      const month = today.getMonth() + 1;
      if (month >= 4 && month <= 9) {
        alerts.push({ id: `${v.id}-tire`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Kış Lastiği Değişimi", description: `${v.plate} aracında kış lastiği takılı. Yaz aylarında yaz lastiğine geçiş önerilir.`, severity: "warning", category: "tire" });
      }
    }

    // ── Bakım Kalemleri ──────────────────────────────────────────
    for (const item of v.maintenanceItems) {
      const status = getMaintenanceStatusForItem(item, v.mileage);
      if (status === "overdue") {
        alerts.push({ id: `${v.id}-${item.id}`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: `${item.name} — Gecikmeli`, description: `${v.plate} aracında ${item.name} zamanı geçti. En kısa sürede servise götürmeniz önerilir.`, severity: "critical", category: "maintenance" });
      } else if (status === "warning") {
        alerts.push({ id: `${v.id}-${item.id}`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: `${item.name} — Yaklaşıyor`, description: `${v.plate} aracında ${item.name} zamanı yaklaşıyor. Servis randevusu planlamanız önerilir.`, severity: "warning", category: "maintenance" });
      }
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}
