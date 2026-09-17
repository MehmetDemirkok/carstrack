// Dışa aktarma kütüphaneleri ağır: xlsx (~400 KB) ve jspdf (~450 KB).
// Statik import edildiklerinde, kullanıcı hiç "Dışa aktar" demese bile sayfayla
// birlikte indiriliyorlardı. Bu modül aynı fonksiyonları dinamik import ardına
// alır — kod yalnızca butona basıldığında yüklenir.
//
// Sarmalayıcılar senkron olan fonksiyonları da Promise döndürür hâle getirir;
// çağrı yerlerinde await etmeyi (ya da hatayı yakalamayı) unutmayın.

type ExcelModule = typeof import("@/lib/export");
type PdfModule = typeof import("@/lib/pdf-export");
type ImportModule = typeof import("@/lib/vehicle-import");

const excel = () => import("@/lib/export");
const pdf = () => import("@/lib/pdf-export");
const vehicleImport = () => import("@/lib/vehicle-import");

/* ---------- Excel (xlsx) ---------- */

export async function exportVehiclesExcel(...args: Parameters<ExcelModule["exportVehiclesExcel"]>) {
  return (await excel()).exportVehiclesExcel(...args);
}

export async function exportServiceHistoryExcel(...args: Parameters<ExcelModule["exportServiceHistoryExcel"]>) {
  return (await excel()).exportServiceHistoryExcel(...args);
}

export async function exportTasksExcel(...args: Parameters<ExcelModule["exportTasksExcel"]>) {
  return (await excel()).exportTasksExcel(...args);
}

export async function exportFuelRecordsExcel(...args: Parameters<ExcelModule["exportFuelRecordsExcel"]>) {
  return (await excel()).exportFuelRecordsExcel(...args);
}

export async function exportMyDataExcel(...args: Parameters<ExcelModule["exportMyDataExcel"]>) {
  return (await excel()).exportMyDataExcel(...args);
}

/* ---------- PDF (jspdf) ---------- */

export async function exportVehicleReportPDF(...args: Parameters<PdfModule["exportVehicleReportPDF"]>) {
  return (await pdf()).exportVehicleReportPDF(...args);
}

export async function exportServiceHistoryPDF(...args: Parameters<PdfModule["exportServiceHistoryPDF"]>) {
  return (await pdf()).exportServiceHistoryPDF(...args);
}

export async function exportFleetStatusPDF(...args: Parameters<PdfModule["exportFleetStatusPDF"]>) {
  return (await pdf()).exportFleetStatusPDF(...args);
}

export async function exportFuelRecordsPDF(...args: Parameters<PdfModule["exportFuelRecordsPDF"]>) {
  return (await pdf()).exportFuelRecordsPDF(...args);
}

/* ---------- Araç içe aktarma (xlsx) ---------- */

export async function exportVehicleImportTemplate(...args: Parameters<ImportModule["exportVehicleImportTemplate"]>) {
  return (await vehicleImport()).exportVehicleImportTemplate(...args);
}

export async function parseVehicleImportFile(...args: Parameters<ImportModule["parseVehicleImportFile"]>) {
  return (await vehicleImport()).parseVehicleImportFile(...args);
}

// Tipler derleme sırasında silinir; runtime maliyeti yok.
export type { ParsedVehicleRow, ImportVehicleData } from "@/lib/vehicle-import";
