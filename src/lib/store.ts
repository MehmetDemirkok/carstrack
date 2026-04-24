import type { Vehicle, ServiceRecord, FleetAlert, MaintenanceItem } from "./types";

const VEHICLES_KEY = "carstrack:vehicles";
const RECORDS_KEY = "carstrack:records";

function isClient() {
  return typeof window !== "undefined";
}

export const MAINTENANCE_TEMPLATES: Omit<MaintenanceItem, "lastDoneDate" | "lastDoneMileage">[] = [
  { id: "oil", name: "Yağ Değişimi", intervalKm: 10000, intervalMonths: 12 },
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

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: "v1",
    plate: "34 ABC 123",
    brand: "BMW",
    model: "320i",
    year: 2022,
    color: "Mineral Gri",
    image: "",
    mileage: 45200,
    engineType: "B48B20",
    engineVolume: "2.0",
    power: "184",
    fuelType: "Benzin",
    transmission: "Otomatik",
    chassisNo: "WBA3X5C50EF123456",
    tireStatus: "Yazlık",
    tireBrand: "Michelin Primacy 4",
    tireSize: "225/45 R17",
    tireInstallDate: "2025-04-15",
    tireMileage: 8400,
    batteryBrand: "Varta",
    batteryCapacity: "72Ah",
    batteryInstallDate: "2024-03-10",
    insuranceCompany: "Allianz Sigorta",
    insuranceExpiry: "2026-11-12",
    inspectionExpiry: "2026-09-05",
    lastServiceDate: "2026-04-15",
    lastServiceMileage: 44000,
    nextServiceMileage: 54000,
    maintenanceItems: [
      { id: "oil", name: "Yağ Değişimi", lastDoneDate: "2026-04-15", lastDoneMileage: 44000, intervalKm: 10000, intervalMonths: 12 },
      { id: "airfilter", name: "Hava Filtresi", lastDoneDate: "2026-04-15", lastDoneMileage: 44000, intervalKm: 20000, intervalMonths: 24 },
      { id: "cabinfilter", name: "Kabin Filtresi", lastDoneDate: "2026-04-15", lastDoneMileage: 44000, intervalKm: 15000, intervalMonths: 12 },
      { id: "fuelfilter", name: "Yakıt Filtresi", lastDoneDate: "2024-10-01", lastDoneMileage: 30000, intervalKm: 40000, intervalMonths: 48 },
      { id: "sparkplug", name: "Buji", lastDoneDate: "2024-10-01", lastDoneMileage: 30000, intervalKm: 30000, intervalMonths: 36 },
      { id: "timingbelt", name: "Triger Kayışı / Zinciri", lastDoneDate: "2022-06-01", lastDoneMileage: 5000, intervalKm: 80000, intervalMonths: 60 },
      { id: "brakefluid", name: "Fren Hidroliği", lastDoneDate: "2025-01-10", intervalMonths: 24 },
      { id: "coolant", name: "Antifiriz", lastDoneDate: "2024-06-01", intervalMonths: 36 },
      { id: "brakefront", name: "Ön Fren Balatası", lastDoneMileage: 38000, intervalKm: 40000 },
      { id: "brakerear", name: "Arka Fren Balatası", lastDoneMileage: 20000, intervalKm: 60000 },
    ],
    notes: "",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2026-04-15T10:00:00Z",
  },
  {
    id: "v2",
    plate: "06 DEF 456",
    brand: "Volkswagen",
    model: "Tiguan",
    year: 2021,
    color: "Derin Siyah",
    image: "",
    mileage: 62300,
    engineType: "EA211 TSI",
    engineVolume: "1.5",
    power: "150",
    fuelType: "Benzin",
    transmission: "DSG",
    chassisNo: "WVGZZZ5NZMW987654",
    tireStatus: "Kışlık",
    tireBrand: "Continental WinterContact TS 860",
    tireSize: "235/50 R18",
    tireInstallDate: "2025-11-10",
    tireMileage: 5200,
    batteryBrand: "Bosch S5",
    batteryCapacity: "74Ah",
    batteryInstallDate: "2023-10-22",
    insuranceCompany: "Axa Sigorta",
    insuranceExpiry: "2026-07-20",
    inspectionExpiry: "2026-12-18",
    lastServiceDate: "2026-03-02",
    lastServiceMileage: 60000,
    nextServiceMileage: 70000,
    maintenanceItems: [
      { id: "oil", name: "Yağ Değişimi", lastDoneDate: "2026-03-02", lastDoneMileage: 60000, intervalKm: 10000, intervalMonths: 12 },
      { id: "airfilter", name: "Hava Filtresi", lastDoneDate: "2025-08-15", lastDoneMileage: 52000, intervalKm: 20000, intervalMonths: 24 },
      { id: "cabinfilter", name: "Kabin Filtresi", lastDoneDate: "2025-08-15", lastDoneMileage: 52000, intervalKm: 15000, intervalMonths: 12 },
      { id: "fuelfilter", name: "Yakıt Filtresi", lastDoneDate: "2023-04-01", lastDoneMileage: 30000, intervalKm: 40000, intervalMonths: 48 },
      { id: "sparkplug", name: "Buji", lastDoneDate: "2023-04-01", lastDoneMileage: 30000, intervalKm: 30000, intervalMonths: 36 },
      { id: "timingbelt", name: "Triger Kayışı / Zinciri", lastDoneDate: "2021-06-01", lastDoneMileage: 3000, intervalKm: 80000, intervalMonths: 60 },
      { id: "brakefluid", name: "Fren Hidroliği", lastDoneDate: "2024-06-01", intervalMonths: 24 },
      { id: "coolant", name: "Antifiriz", lastDoneDate: "2023-08-01", intervalMonths: 36 },
      { id: "brakefront", name: "Ön Fren Balatası", lastDoneMileage: 43200, intervalKm: 40000 },
      { id: "brakerear", name: "Arka Fren Balatası", lastDoneMileage: 30000, intervalKm: 60000 },
    ],
    notes: "",
    createdAt: "2023-05-20T10:00:00Z",
    updatedAt: "2026-03-02T10:00:00Z",
  },
];

const INITIAL_RECORDS: ServiceRecord[] = [
  {
    id: "r1", vehicleId: "v1", date: "2026-04-15", type: "routine",
    title: "Periyodik Bakım", mileage: 44000,
    serviceCenter: "Borusan BMW Yetkili Servisi",
    notes: "Yağ, yağ filtresi, hava filtresi ve kabin filtresi değiştirildi. Genel kontrol yapıldı. Frenler kontrol edildi.",
    createdAt: "2026-04-15T14:00:00Z",
  },
  {
    id: "r2", vehicleId: "v1", date: "2026-03-02", type: "repair",
    title: "Ön Fren Balataları", mileage: 43200,
    serviceCenter: "Bosch Car Service",
    notes: "Ön diskler tornalandı, balatalar değiştirildi. Arka frenler kontrol edildi, iyi durumda.",
    createdAt: "2026-03-02T11:00:00Z",
  },
  {
    id: "r3", vehicleId: "v2", date: "2026-03-02", type: "routine",
    title: "60.000 km Bakımı", mileage: 60000,
    serviceCenter: "Volkswagen Yetkili Servisi",
    notes: "60.000 km bakımı: Yağ, yağ filtresi değişimi. Genel kontrol, 4 çeker sistem testi, DSG kontrolü.",
    createdAt: "2026-03-02T09:00:00Z",
  },
  {
    id: "r4", vehicleId: "v2", date: "2025-11-10", type: "tire",
    title: "Kış Lastiği Montajı", mileage: 57100,
    serviceCenter: "Continental Bayii",
    notes: "Continental WinterContact TS 860 kış lastikleri takıldı. Balans ve rot ayarı yapıldı.",
    createdAt: "2025-11-10T10:00:00Z",
  },
  {
    id: "r5", vehicleId: "v2", date: "2025-08-15", type: "routine",
    title: "Periyodik Bakım", mileage: 52000,
    serviceCenter: "Volkswagen Yetkili Servisi",
    notes: "Hava filtresi ve kabin filtresi değişimi. Motor kontrolü. Fren sıvısı seviye kontrolü.",
    createdAt: "2025-08-15T13:00:00Z",
  },
  {
    id: "r6", vehicleId: "v2", date: "2023-10-22", type: "battery",
    title: "Akü Değişimi", mileage: 45800,
    serviceCenter: "Bosch Car Service",
    notes: "Bosch S5 74Ah akü takıldı. Şarj sistemi ve alternatör kontrol edildi.",
    createdAt: "2023-10-22T15:00:00Z",
  },
];

// ─── Persistence ──────────────────────────────────────────────
export function getVehicles(): Vehicle[] {
  if (!isClient()) return INITIAL_VEHICLES;
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(INITIAL_VEHICLES));
    return INITIAL_VEHICLES;
  } catch {
    return INITIAL_VEHICLES;
  }
}

function saveVehicles(vehicles: Vehicle[]): void {
  if (!isClient()) return;
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
}

export function getRecords(): ServiceRecord[] {
  if (!isClient()) return INITIAL_RECORDS;
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(INITIAL_RECORDS));
    return INITIAL_RECORDS;
  } catch {
    return INITIAL_RECORDS;
  }
}

function saveRecords(records: ServiceRecord[]): void {
  if (!isClient()) return;
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

// ─── Vehicle CRUD ─────────────────────────────────────────────
export function addVehicle(data: Omit<Vehicle, "id" | "createdAt" | "updatedAt">): Vehicle {
  const vehicles = getVehicles();
  const now = new Date().toISOString();
  const vehicle: Vehicle = {
    ...data,
    id: `v${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  saveVehicles([...vehicles, vehicle]);
  return vehicle;
}

export function updateVehicle(id: string, updates: Partial<Vehicle>): void {
  const vehicles = getVehicles();
  const idx = vehicles.findIndex((v) => v.id === id);
  if (idx === -1) return;
  vehicles[idx] = { ...vehicles[idx], ...updates, updatedAt: new Date().toISOString() };
  saveVehicles(vehicles);
}

export function deleteVehicle(id: string): void {
  const vehicles = getVehicles().filter((v) => v.id !== id);
  saveVehicles(vehicles);
  const records = getRecords().filter((r) => r.vehicleId !== id);
  saveRecords(records);
}

export function deleteVehicles(ids: string[]): void {
  const idSet = new Set(ids);
  saveVehicles(getVehicles().filter((v) => !idSet.has(v.id)));
  saveRecords(getRecords().filter((r) => !idSet.has(r.vehicleId)));
}

// ─── Record CRUD ──────────────────────────────────────────────
export function addRecord(data: Omit<ServiceRecord, "id" | "createdAt">): ServiceRecord {
  const records = getRecords();
  const record: ServiceRecord = {
    ...data,
    id: `r${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveRecords([record, ...records]);
  return record;
}

export function deleteRecord(id: string): void {
  saveRecords(getRecords().filter((r) => r.id !== id));
}

// ─── Health Score ─────────────────────────────────────────────
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function docScore(expiryDateStr: string): number {
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

// ─── Fleet Alerts ─────────────────────────────────────────────
export function getFleetAlerts(vehicles: Vehicle[]): FleetAlert[] {
  const alerts: FleetAlert[] = [];
  const today = new Date();

  for (const v of vehicles) {
    const name = `${v.brand} ${v.model}`;

    const insDays = daysBetween(today, new Date(v.insuranceExpiry));
    if (insDays < 0) {
      alerts.push({ id: `${v.id}-ins`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Sigorta Süresi Doldu", description: `${v.plate} aracının sigortası sona erdi.`, severity: "critical", category: "insurance" });
    } else if (insDays < 30) {
      alerts.push({ id: `${v.id}-ins`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Sigorta Yaklaşıyor", description: `${v.plate} — ${insDays} gün kaldı.`, severity: "warning", category: "insurance" });
    }

    const muaDays = daysBetween(today, new Date(v.inspectionExpiry));
    if (muaDays < 0) {
      alerts.push({ id: `${v.id}-mua`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Muayene Süresi Doldu", description: `${v.plate} aracının muayenesi sona erdi.`, severity: "critical", category: "inspection" });
    } else if (muaDays < 30) {
      alerts.push({ id: `${v.id}-mua`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Muayene Yaklaşıyor", description: `${v.plate} — ${muaDays} gün kaldı.`, severity: "warning", category: "inspection" });
    }

    if (v.tireStatus === "Kışlık") {
      const month = today.getMonth() + 1;
      if (month >= 4 && month <= 9) {
        alerts.push({ id: `${v.id}-tire`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: "Kış Lastiği Uyarısı", description: `${v.plate} aracında kış lastiği takılı, değişim zamanı.`, severity: "warning", category: "tire" });
      }
    }

    for (const item of v.maintenanceItems) {
      const status = getMaintenanceStatusForItem(item, v.mileage);
      if (status === "overdue") {
        alerts.push({ id: `${v.id}-${item.id}`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: `${item.name} Gecikmeli`, description: `${v.plate} — ${item.name} zamanı geçti.`, severity: "critical", category: "maintenance" });
      } else if (status === "warning") {
        alerts.push({ id: `${v.id}-${item.id}`, vehicleId: v.id, vehiclePlate: v.plate, vehicleName: name, title: `${item.name} Yaklaşıyor`, description: `${v.plate} — ${item.name} yakında gerekiyor.`, severity: "warning", category: "maintenance" });
      }
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}
