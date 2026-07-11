import * as XLSX from "xlsx";
import type { Vehicle } from "@/lib/types";
import { MAINTENANCE_TEMPLATES } from "@/lib/store";

// Export şablonuyla (export.ts → vehicleRows) birebir aynı Türkçe başlıklar.
const TEMPLATE_HEADERS = [
  "Plaka", "Marka", "Model", "Yıl", "Renk", "Kilometre", "Yakıt", "Vites", "Motor",
  "Motor Hacmi", "Güç", "Şasi No", "Sigorta Şirketi", "Sigorta Bitiş",
  "Yeşil Kart Şirketi", "Yeşil Kart Bitiş", "Muayene Bitiş", "Son Servis Tarihi",
  "Son Servis KM", "Sonraki Servis KM", "Lastik Markası", "Lastik Boyutu",
  "Lastik Sezonu", "Lastik Takma Tarihi", "Lastik Takma KM", "Akü Markası",
  "Akü Kapasitesi", "Akü Takma Tarihi", "Notlar",
] as const;

export type ImportVehicleData = Omit<Vehicle, "id" | "createdAt" | "updatedAt">;

export interface ParsedVehicleRow {
  /** Excel'deki satır numarası (başlık = 1. satır). */
  row: number;
  data: ImportVehicleData;
  errors: string[];
  warnings: string[];
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

export function exportVehicleImportTemplate() {
  const example: Record<string, string | number> = {
    "Plaka": "34 ABC 123",
    "Marka": "Toyota",
    "Model": "Corolla",
    "Yıl": 2022,
    "Renk": "Beyaz",
    "Kilometre": 25000,
    "Yakıt": "Benzin",
    "Vites": "Otomatik",
    "Motor": "",
    "Motor Hacmi": "1.6",
    "Güç": "132 HP",
    "Şasi No": "",
    "Sigorta Şirketi": "",
    "Sigorta Bitiş": "15.03.2026",
    "Yeşil Kart Şirketi": "",
    "Yeşil Kart Bitiş": "",
    "Muayene Bitiş": "20.06.2026",
    "Son Servis Tarihi": "01.01.2026",
    "Son Servis KM": 20000,
    "Sonraki Servis KM": 35000,
    "Lastik Markası": "",
    "Lastik Boyutu": "",
    "Lastik Sezonu": "Yazlık",
    "Lastik Takma Tarihi": "",
    "Lastik Takma KM": "",
    "Akü Markası": "",
    "Akü Kapasitesi": "",
    "Akü Takma Tarihi": "",
    "Notlar": "",
  };
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([example], { header: [...TEMPLATE_HEADERS] });
  autoWidth(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Araçlar");
  XLSX.writeFile(wb, "carstrack_arac_sablonu.xlsx");
}

function toStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) return "";
  return String(v).trim();
}

/** Excel numarası veya "25.000" / "25000,5" gibi TR biçimli metni sayıya çevirir. */
function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  const s = toStr(v);
  if (s === "") return undefined;
  const cleaned = s.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Number(cleaned);
}

function numField(raw: unknown, label: string, errors: string[]): number | undefined {
  const n = toNumber(raw);
  if (n === undefined) return undefined;
  if (isNaN(n)) {
    errors.push(`${label} sayısal olmalı`);
    return undefined;
  }
  return n;
}

/** Excel tarih hücresi (Date), "GG.AA.YYYY" veya ISO metni kabul eder. */
function toDateISO(v: unknown): string | undefined | "invalid" {
  if (v === undefined || v === null || v === "") return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().split("T")[0];
  }
  const s = toStr(v);
  if (s === "") return undefined;
  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
    return "invalid";
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return s.slice(0, 10);
  }
  return "invalid";
}

export async function parseVehicleImportFile(
  file: File,
  existingVehicles: Vehicle[]
): Promise<{ rows: ParsedVehicleRow[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const existingPlates = new Set(existingVehicles.map((v) => v.plate.trim().toUpperCase()));
  const seenPlates = new Set<string>();
  const currentYear = new Date().getFullYear();
  const rows: ParsedVehicleRow[] = [];

  raw.forEach((r, idx) => {
    const allEmpty = Object.values(r).every((v) => toStr(v) === "");
    if (allEmpty) return;

    const errors: string[] = [];
    const warnings: string[] = [];

    const plate = toStr(r["Plaka"]).toUpperCase();
    const brand = toStr(r["Marka"]);
    const model = toStr(r["Model"]);
    const yearRaw = numField(r["Yıl"], "Yıl", errors);

    if (!plate) errors.push("Plaka zorunludur");
    if (!brand) errors.push("Marka zorunludur");
    if (!model) errors.push("Model zorunludur");
    if (yearRaw === undefined) errors.push("Yıl zorunludur");
    else if (yearRaw < 1980 || yearRaw > currentYear + 1) errors.push("Yıl geçersiz");

    if (plate) {
      if (existingPlates.has(plate)) {
        warnings.push("Bu plaka filoda zaten kayıtlı — yine de eklenirse mükerrer kayıt oluşur");
      } else if (seenPlates.has(plate)) {
        warnings.push("Bu plaka dosyada birden fazla kez geçiyor");
      }
      seenPlates.add(plate);
    }

    const mileage = numField(r["Kilometre"], "Kilometre", errors) ?? 0;
    const lastServiceMileage = numField(r["Son Servis KM"], "Son Servis KM", errors) ?? 0;
    const nextServiceMileage = numField(r["Sonraki Servis KM"], "Sonraki Servis KM", errors) ?? 0;
    const tireMileage = numField(r["Lastik Takma KM"], "Lastik Takma KM", errors) ?? 0;

    const dateOrEmpty = (header: string, label: string): string => {
      const parsed = toDateISO(r[header]);
      if (parsed === "invalid") {
        errors.push(`${label} tarihi anlaşılamadı (GG.AA.YYYY biçiminde girin)`);
        return "";
      }
      return parsed ?? "";
    };

    const data: ImportVehicleData = {
      ownershipType: "ozmal",
      rentCompany: "",
      ruhsatSahibi: "",
      plate,
      brand,
      model,
      year: yearRaw ?? currentYear,
      color: toStr(r["Renk"]),
      image: "",
      image2: "",
      image3: "",
      image4: "",
      imagePosition: 50,
      imagePositionX: 50,
      imageZoom: 100,
      mileage,
      engineType: toStr(r["Motor"]),
      engineVolume: toStr(r["Motor Hacmi"]),
      power: toStr(r["Güç"]),
      fuelType: (toStr(r["Yakıt"]) || "Benzin") as Vehicle["fuelType"],
      transmission: (toStr(r["Vites"]) || "Manuel") as Vehicle["transmission"],
      chassisNo: toStr(r["Şasi No"]),
      tireStatus: (toStr(r["Lastik Sezonu"]) || "Yazlık") as Vehicle["tireStatus"],
      tireBrand: toStr(r["Lastik Markası"]),
      tireSize: toStr(r["Lastik Boyutu"]),
      tireInstallDate: dateOrEmpty("Lastik Takma Tarihi", "Lastik Takma Tarihi"),
      tireMileage,
      batteryBrand: toStr(r["Akü Markası"]),
      batteryCapacity: toStr(r["Akü Kapasitesi"]),
      batteryInstallDate: dateOrEmpty("Akü Takma Tarihi", "Akü Takma Tarihi"),
      insuranceCompany: toStr(r["Sigorta Şirketi"]),
      insuranceExpiry: dateOrEmpty("Sigorta Bitiş", "Sigorta Bitiş"),
      kaskoCompany: "",
      kaskoExpiry: "",
      greenCardCompany: toStr(r["Yeşil Kart Şirketi"]),
      greenCardExpiry: dateOrEmpty("Yeşil Kart Bitiş", "Yeşil Kart Bitiş"),
      inspectionExpiry: dateOrEmpty("Muayene Bitiş", "Muayene Bitiş"),
      lastServiceDate: dateOrEmpty("Son Servis Tarihi", "Son Servis Tarihi"),
      lastServiceMileage,
      nextServiceMileage,
      maintenanceItems: MAINTENANCE_TEMPLATES.map((t) => ({ ...t })),
      notes: toStr(r["Notlar"]),
    };

    rows.push({ row: idx + 2, data, errors, warnings });
  });

  return { rows };
}
