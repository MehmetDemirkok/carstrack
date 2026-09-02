import * as XLSX from "xlsx";
import type { Vehicle, ServiceRecord, VehicleTask, TrafficFine, VehicleReport, Feedback, DriverLicenseEntry, FuelRecord } from "@/lib/types";
import { STATUS_META as FINE_STATUS_META } from "@/components/traffic-fines/fine-badges";
import { FUEL_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/fuel";

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
    "Şasi No": v.chassisNo,
    "Sigorta Şirketi": v.insuranceCompany,
    "Sigorta Bitiş": formatDate(v.insuranceExpiry),
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
    "Tutar (₺)": r.cost ?? "",
    "Ödeme Durumu": r.cost === undefined ? "" : r.paymentStatus === "unpaid" ? "Ödenmedi" : "Ödendi",
    "Ödenmeme Nedeni": r.paymentStatus === "unpaid" ? (r.unpaidReason || "") : "",
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

function formatDuration(start: string, end?: string): string {
  if (!end) return "";
  const mins = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins} dk`;
  return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
}

function taskRows(tasks: VehicleTask[], vehicles: Vehicle[]) {
  const vehicleMap = Object.fromEntries(
    vehicles.map((v) => [v.id, v] as [string, Vehicle])
  );
  return tasks.map((t) => {
    const v = vehicleMap[t.vehicleId];
    return {
      "Plaka":             t.vehiclePlate ?? v?.plate ?? "—",
      "Araç":              t.vehicleName  ?? (v ? `${v.brand} ${v.model}` : "—"),
      "Personel":          t.driverName   ?? "—",
      "Departman":         t.driverDepartment ?? "—",
      "Başlangıç KM":      t.startKm,
      "Bitiş KM":          t.endKm   ?? "",
      "Mesafe (km)":       t.distance ?? "",
      "Süre":              t.status === "completed"
                             ? formatDuration(t.startTime, t.endTime)
                             : "Devam ediyor",
      "Açıklama":          t.description,
      "Durum":             t.status === "active" ? "Aktif" : "Tamamlandı",
      "Başlangıç Tarihi":  formatDate(t.startTime),
      "Başlangıç Saati":   t.startTime
                             ? new Date(t.startTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                             : "",
      "Bitiş Tarihi":      t.endTime ? formatDate(t.endTime) : "",
      "Bitiş Saati":       t.endTime
                             ? new Date(t.endTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                             : "",
    };
  });
}

export function exportTasksExcel(tasks: VehicleTask[], vehicles: Vehicle[]) {
  const wb = XLSX.utils.book_new();
  const rows = taskRows(tasks, vehicles);

  if (rows.length === 0) {
    // Still create the sheet with headers so the file isn't empty
    const ws = XLSX.utils.json_to_sheet([{
      "Plaka": "", "Araç": "", "Personel": "", "Departman": "",
      "Başlangıç KM": "", "Bitiş KM": "", "Mesafe (km)": "", "Süre": "",
      "Açıklama": "", "Durum": "", "Başlangıç Tarihi": "", "Başlangıç Saati": "",
      "Bitiş Tarihi": "", "Bitiş Saati": "",
    }]);
    autoWidth(ws);
    XLSX.utils.book_append_sheet(wb, ws, "Görev Raporu");
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);
    autoWidth(ws);
    XLSX.utils.book_append_sheet(wb, ws, "Görev Raporu");
  }

  download(wb, `carstrack_gorevler_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

// ─── Yakıt Alımları ─────────────────────────────────────────────────────────

function fuelRecordRows(records: FuelRecord[]) {
  return records.map((r) => ({
    "Tarih": formatDate(r.fueledAt),
    "Saat": new Date(r.fueledAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    "Araç": r.vehiclePlate ?? "",
    "İstasyon": r.stationName,
    "Yakıt Türü": FUEL_TYPE_LABELS[r.fuelType] ?? r.fuelType,
    "Litre": r.liters,
    "Litre Fiyatı (₺)": r.pricePerLiter,
    "Toplam (₺)": r.totalAmount,
    "Kilometre": r.odometer,
    "L/100KM": r.consumptionL100km ?? "",
    "₺/KM": r.costPerKm ?? "",
    "Ödeme Yöntemi": PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod,
    "Fiş/Fatura No": r.receiptNumber,
    "Not": r.notes,
  }));
}

export function exportFuelRecordsExcel(records: FuelRecord[]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    records.length > 0 ? fuelRecordRows(records) : [{ "Tarih": "", "Araç": "", "İstasyon": "", "Toplam (₺)": "" }]
  );
  autoWidth(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Yakıt Alımları");
  download(wb, `carstrack_yakit_alimlari_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Kişisel veri indirme ("Verilerimi İndir") ─────────────────────────────

const ROLE_LABELS: Record<string, string> = { manager: "Yönetici", operator: "Operatör", user: "Sürücü" };
const REPORT_CATEGORY_LABELS: Record<string, string> = {
  engine: "Motor", brake: "Fren", tire: "Lastik", electrical: "Elektrik",
  fluid: "Sıvı / Yağ", warning_light: "Uyarı Işığı", body: "Kaporta", other: "Diğer",
};
const REPORT_SEVERITY_LABELS: Record<string, string> = { low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" };
const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "Açık", acknowledged: "Görüldü", in_progress: "İşlemde", resolved: "Çözüldü",
};
const FEEDBACK_TYPE_LABELS: Record<string, string> = { bug: "Hata Bildirimi", suggestion: "Öneri", other: "Genel Geri Bildirim" };

interface MyProfileExport {
  fullName?: string;
  email?: string;
  role?: string;
  department?: string;
  company?: string;
  licenseNumber?: string;
  licenses?: DriverLicenseEntry[];
}

function profileRows(p: MyProfileExport) {
  const rows = [
    { "Alan": "Ad Soyad", "Değer": p.fullName ?? "" },
    { "Alan": "E-posta", "Değer": p.email ?? "" },
    { "Alan": "Rol", "Değer": (p.role && ROLE_LABELS[p.role]) ?? p.role ?? "" },
    { "Alan": "Departman", "Değer": p.department ?? "" },
    { "Alan": "Şirket", "Değer": p.company ?? "" },
    { "Alan": "Ehliyet No", "Değer": p.licenseNumber ?? "" },
  ];
  for (const l of p.licenses ?? []) {
    rows.push({ "Alan": `Ehliyet Sınıfı — ${l.class}`, "Değer": `Veriliş: ${formatDate(l.issueDate) || "—"} · Geçerlilik: ${formatDate(l.expiryDate) || "—"}` });
  }
  return rows;
}

function myFineRows(fines: TrafficFine[]) {
  return fines.map((f) => ({
    "Plaka": f.vehiclePlate ?? "",
    "İhlal": f.violationType,
    "Tutar (₺)": f.amount,
    "İndirimli Tutar (₺)": f.discountedAmount ?? "",
    "Ceza Tarihi": formatDate(f.fineDate),
    "Son Ödeme": formatDate(f.dueDate),
    "Durum": FINE_STATUS_META[f.status]?.label ?? f.status,
    "Notlar": f.notes,
  }));
}

function myReportRows(reports: VehicleReport[]) {
  return reports.map((r) => ({
    "Araç": r.vehiclePlate ?? r.vehicleName ?? "",
    "Başlık": r.title,
    "Açıklama": r.description,
    "Kategori": REPORT_CATEGORY_LABELS[r.category] ?? r.category,
    "Önem": REPORT_SEVERITY_LABELS[r.severity] ?? r.severity,
    "Durum": REPORT_STATUS_LABELS[r.status] ?? r.status,
    "Tarih": formatDate(r.createdAt),
  }));
}

function myFeedbackRows(feedback: Feedback[]) {
  return feedback.map((f) => ({
    "Tür": FEEDBACK_TYPE_LABELS[f.type] ?? f.type,
    "Mesaj": f.message,
    "Tarih": formatDate(f.createdAt),
  }));
}

/**
 * "Verilerimi İndir" — kullanıcının kendi profil, araç, ceza, arıza bildirimi
 * ve geri bildirim kayıtlarını okunabilir tek bir Excel dosyası olarak indirir.
 * (Ham JSON yerine — sürücü/yönetici olmayan kullanıcılar için anlamsız olurdu.)
 */
export function exportMyDataExcel(data: {
  profile: MyProfileExport;
  vehicles: Vehicle[];
  trafficFines: TrafficFine[];
  reports: VehicleReport[];
  feedback: Feedback[];
}) {
  const wb = XLSX.utils.book_new();

  const wsProfile = XLSX.utils.json_to_sheet(profileRows(data.profile));
  autoWidth(wsProfile);
  XLSX.utils.book_append_sheet(wb, wsProfile, "Profilim");

  const wsVehicles = XLSX.utils.json_to_sheet(
    data.vehicles.length > 0 ? vehicleRows(data.vehicles) : [{ "Plaka": "", "Marka": "", "Model": "" }]
  );
  autoWidth(wsVehicles);
  XLSX.utils.book_append_sheet(wb, wsVehicles, "Araçlarım");

  const wsFines = XLSX.utils.json_to_sheet(
    data.trafficFines.length > 0 ? myFineRows(data.trafficFines) : [{ "Plaka": "", "İhlal": "", "Tutar (₺)": "" }]
  );
  autoWidth(wsFines);
  XLSX.utils.book_append_sheet(wb, wsFines, "Trafik Cezalarım");

  const wsReports = XLSX.utils.json_to_sheet(
    data.reports.length > 0 ? myReportRows(data.reports) : [{ "Araç": "", "Başlık": "", "Durum": "" }]
  );
  autoWidth(wsReports);
  XLSX.utils.book_append_sheet(wb, wsReports, "Arıza Bildirimlerim");

  const wsFeedback = XLSX.utils.json_to_sheet(
    data.feedback.length > 0 ? myFeedbackRows(data.feedback) : [{ "Tür": "", "Mesaj": "" }]
  );
  autoWidth(wsFeedback);
  XLSX.utils.book_append_sheet(wb, wsFeedback, "Geri Bildirimlerim");

  download(wb, `carstrack_verilerim_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
