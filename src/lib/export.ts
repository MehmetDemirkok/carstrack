import * as XLSX from "xlsx";
import type { Vehicle, ServiceRecord } from "@/lib/types";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  routine: "Periyodik Bakım",
  repair: "Onarım",
  tire: "Lastik",
  inspection: "Muayene",
  battery: "Akü",
  other: "Diğer",
};

function formatDate(val?: string) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("tr-TR");
}

function vehicleRows(vehicles: Vehicle[]) {
  return vehicles.map((v) => ({
    "Plaka": v.plate,
    "Marka": v.brand,
    "Model": v.model,
    "Yıl": v.year,
    "Renk": v.color,
    "Kilometre": v.mileage,
    "Yakıt": v.fuelType,
    "Vites": v.transmission,
    "Motor": v.engineType,
    "Motor Hacmi": v.engineVolume,
    "Güç": v.power,
    "Şasi No": v.chassisNo,
    "Sigorta Şirketi": v.insuranceCompany,
    "Sigorta Bitiş": formatDate(v.insuranceExpiry),
    "Yeşil Kart Şirketi": v.greenCardCompany,
    "Yeşil Kart Bitiş": formatDate(v.greenCardExpiry),
    "Muayene Bitiş": formatDate(v.inspectionExpiry),
    "Son Servis Tarihi": formatDate(v.lastServiceDate),
    "Son Servis KM": v.lastServiceMileage,
    "Sonraki Servis KM": v.nextServiceMileage,
    "Lastik Markası": v.tireBrand,
    "Lastik Boyutu": v.tireSize,
    "Lastik Sezonu": v.tireStatus,
    "Lastik Takma Tarihi": formatDate(v.tireInstallDate),
    "Lastik Takma KM": v.tireMileage,
    "Akü Markası": v.batteryBrand,
    "Akü Kapasitesi": v.batteryCapacity,
    "Akü Takma Tarihi": formatDate(v.batteryInstallDate),
    "Notlar": v.notes,
  }));
}

function recordRows(records: ServiceRecord[], vehicles: Vehicle[]) {
  const plateMap = Object.fromEntries(vehicles.map((v) => [v.id, `${v.plate} — ${v.brand} ${v.model}`]));
  return records.map((r) => ({
    "Araç": plateMap[r.vehicleId] ?? r.vehicleId,
    "Tarih": formatDate(r.date),
    "Tür": SERVICE_TYPE_LABELS[r.type] ?? r.type,
    "Başlık": r.title,
    "Kilometre": r.mileage,
    "Servis Noktası": r.serviceCenter,
    "Notlar": r.notes,
  }));
}

function autoWidth(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const colWidths: number[] = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      const len = cell ? String(cell.v ?? "").length : 0;
      colWidths[C] = Math.min(Math.max(colWidths[C] ?? 8, len + 2), 40);
    }
  }
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
}

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportVehiclesExcel(vehicles: Vehicle[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(vehicleRows(vehicles));
  autoWidth(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Araçlar");
  download(wb, `carstrack_araclar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportServiceHistoryExcel(records: ServiceRecord[], vehicles: Vehicle[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(recordRows(records, vehicles));
  autoWidth(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Servis Geçmişi");
  download(wb, `carstrack_servis_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFullReportExcel(vehicles: Vehicle[], records: ServiceRecord[]) {
  const wb = XLSX.utils.book_new();

  const wsVehicles = XLSX.utils.json_to_sheet(vehicleRows(vehicles));
  autoWidth(wsVehicles);
  XLSX.utils.book_append_sheet(wb, wsVehicles, "Araçlar");

  const wsRecords = XLSX.utils.json_to_sheet(recordRows(records, vehicles));
  autoWidth(wsRecords);
  XLSX.utils.book_append_sheet(wb, wsRecords, "Servis Geçmişi");

  download(wb, `carstrack_tam_rapor_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
