import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Vehicle, ServiceRecord, FleetAlert } from "@/lib/types";
import { calculateHealthScore, getMaintenanceStatusForItem, getFleetAlerts } from "@/lib/store";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  routine:    "Periyodik Bakım",
  repair:     "Onarım",
  tire:       "Lastik",
  inspection: "Muayene",
  battery:    "Akü",
  other:      "Diğer",
};

const STATUS_LABELS: Record<string, string> = {
  good:    "İyi",
  warning: "Yaklaşıyor",
  overdue: "Gecikmeli",
};

function formatDate(val?: string): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("tr-TR");
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function docStatusText(days: number | null): string {
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)} gün gecikti`;
  if (days === 0) return "Bugün sona eriyor";
  return `${days} gün kaldı`;
}

// ─── Font Loading ──────────────────────────────────────────────────────────

async function ttfToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Process in chunks to avoid stack overflow on large fonts
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function embedFonts(doc: jsPDF): Promise<void> {
  const [regular, bold] = await Promise.all([
    ttfToBase64("/fonts/Roboto-Regular.ttf"),
    ttfToBase64("/fonts/Roboto-Bold.ttf"),
  ]);
  doc.addFileToVFS("Roboto-Regular.ttf", regular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", bold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
}

// ─── Header / Footer ──────────────────────────────────────────────────────

function addHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 18, "F");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("CarsTrack", 14, 11);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("tr-TR"), pageW - 14, 11, { align: "right" });

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 32);

  if (subtitle) {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, 39);
    return 46;
  }
  return 40;
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("CarsTrack — Araç Takip Sistemi", 14, pageH - 8);
    doc.text(`Sayfa ${i} / ${pageCount}`, pageW - 14, pageH - 8, { align: "right" });
  }
}

function baseTableStyles() {
  return {
    headStyles: {
      fillColor: [99, 102, 241] as [number, number, number],
      textColor: 255 as number,
      fontSize: 8,
      fontStyle: "bold" as const,
    },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] as [number, number, number] },
    styles: { cellPadding: 3, font: "Roboto" },
    margin: { left: 14, right: 14 },
  };
}

function lastY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

// ─── Vehicle Detail Report ─────────────────────────────────────────────────

export async function exportVehicleReportPDF(vehicle: Vehicle, records: ServiceRecord[]): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await embedFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  let y = addHeader(
    doc,
    `${vehicle.brand} ${vehicle.model}`,
    `${vehicle.plate}  •  ${vehicle.year}  •  ${vehicle.color}`
  );

  // Health score badge
  const score = calculateHealthScore(vehicle);
  const scoreColor: [number, number, number] =
    score >= 85 ? [16, 185, 129] : score >= 65 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(...scoreColor);
  doc.roundedRect(pageW - 40, 22, 26, 12, 3, 3, "F");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Sağlık: ${score}`, pageW - 27, 29.5, { align: "center" });

  y += 4;

  // ── Teknik Bilgiler ──
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  doc.setTextColor(99, 102, 241);
  doc.text("Teknik Bilgiler", 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Alan", "Değer", "Alan", "Değer"]],
    body: [
      ["Plaka",          vehicle.plate,                   "Yakıt Tipi",   vehicle.fuelType],
      ["Marka / Model",  `${vehicle.brand} ${vehicle.model}`, "Vites Kutusu", vehicle.transmission],
      ["Yıl",            String(vehicle.year),             "Motor Hacmi",  vehicle.engineVolume || "—"],
      ["Renk",           vehicle.color,                   "Motor Gücü",   vehicle.power ? `${vehicle.power} HP` : "—"],
      ["Kilometre",      `${vehicle.mileage.toLocaleString("tr-TR")} km`, "Motor Kodu", vehicle.engineType || "—"],
      ["Şasi No",        vehicle.chassisNo || "—",         "", ""],
    ],
    ...baseTableStyles(),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 2: { fontStyle: "bold", cellWidth: 35 } },
  });

  y = lastY(doc) + 8;

  // ── Belgeler & Süreler ──
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  doc.setTextColor(99, 102, 241);
  doc.text("Belgeler & Süreler", 14, y);
  y += 5;

  const insDays = daysUntil(vehicle.insuranceExpiry);
  const gcDays  = daysUntil(vehicle.greenCardExpiry);
  const muaDays = daysUntil(vehicle.inspectionExpiry);

  autoTable(doc, {
    startY: y,
    head: [["Belge", "Tarih", "Şirket", "Durum"]],
    body: [
      ["Kasko & Sigorta",       formatDate(vehicle.insuranceExpiry), vehicle.insuranceCompany || "—", docStatusText(insDays)],
      ["Yeşil Kart",            formatDate(vehicle.greenCardExpiry),  vehicle.greenCardCompany  || "—", docStatusText(gcDays)],
      ["TÜVTÜRK Muayene",       formatDate(vehicle.inspectionExpiry), "—",                              docStatusText(muaDays)],
    ],
    ...baseTableStyles(),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 44 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = String(data.cell.raw ?? "");
        if (val.includes("gecikti"))    data.cell.styles.textColor = [239, 68, 68];
        else if (val.includes("kaldı")) data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });

  y = lastY(doc) + 8;

  // ── Lastik & Akü ──
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  doc.setTextColor(99, 102, 241);
  doc.text("Lastik & Akü", 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Alan", "Değer", "Alan", "Değer"]],
    body: [
      ["Lastik Markası",      vehicle.tireBrand        || "—", "Akü Markası",    vehicle.batteryBrand    || "—"],
      ["Lastik Boyutu",       vehicle.tireSize         || "—", "Akü Kapasitesi", vehicle.batteryCapacity || "—"],
      ["Lastik Sezonu",       vehicle.tireStatus       || "—", "Akü Değişim",    formatDate(vehicle.batteryInstallDate)],
      ["Lastik Takma Tarihi", formatDate(vehicle.tireInstallDate), "", ""],
    ],
    ...baseTableStyles(),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 }, 2: { fontStyle: "bold", cellWidth: 35 } },
  });

  y = lastY(doc) + 8;

  // ── Bakım Kalemleri ──
  if (vehicle.maintenanceItems.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("Bakım Kalemleri", 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Bakım Kalemi", "Son Tarih", "Son KM", "Periyot", "Durum"]],
      body: vehicle.maintenanceItems.map((item) => {
        const status = getMaintenanceStatusForItem(item, vehicle.mileage);
        return [
          item.name,
          item.lastDoneDate       ? formatDate(item.lastDoneDate) : "—",
          item.lastDoneMileage !== undefined ? `${item.lastDoneMileage.toLocaleString("tr-TR")} km` : "—",
          item.intervalKm      ? `${item.intervalKm.toLocaleString("tr-TR")} km`
          : item.intervalMonths ? `${item.intervalMonths} ay`
          : "—",
          STATUS_LABELS[status] ?? status,
        ];
      }),
      ...baseTableStyles(),
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = String(data.cell.raw ?? "");
          if (val === "Gecikmeli")    data.cell.styles.textColor = [239, 68, 68];
          else if (val === "Yaklaşıyor") data.cell.styles.textColor = [245, 158, 11];
          else                        data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = lastY(doc) + 8;
  }

  // ── Servis Geçmişi ──
  if (records.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text(`Servis Geçmişi (${records.length} kayıt)`, 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Tarih", "Tür", "Başlık", "Kilometre", "Servis Noktası"]],
      body: records.map((r) => [
        formatDate(r.date),
        SERVICE_TYPE_LABELS[r.type] ?? r.type,
        r.title,
        r.mileage > 0 ? `${r.mileage.toLocaleString("tr-TR")} km` : "—",
        r.serviceCenter || "—",
      ]),
      theme: "striped",
      ...baseTableStyles(),
      alternateRowStyles: { fillColor: [248, 248, 255] },
    });
  }

  addFooter(doc);
  doc.save(`${vehicle.plate}_rapor_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Service History Report ────────────────────────────────────────────────

export async function exportServiceHistoryPDF(records: ServiceRecord[], vehicles: Vehicle[]): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await embedFonts(doc);

  const plateMap = Object.fromEntries(
    vehicles.map((v) => [v.id, `${v.plate} - ${v.brand} ${v.model}`])
  );

  addHeader(
    doc,
    "Servis Geçmişi Raporu",
    `${records.length} kayıt  •  ${new Date().toLocaleDateString("tr-TR")}`
  );

  autoTable(doc, {
    startY: 46,
    head: [["Tarih", "Araç", "Tür", "Başlık", "Kilometre", "Servis Noktası", "Notlar"]],
    body: records.map((r) => [
      formatDate(r.date),
      plateMap[r.vehicleId] ?? "—",
      SERVICE_TYPE_LABELS[r.type] ?? r.type,
      r.title,
      r.mileage > 0 ? `${r.mileage.toLocaleString("tr-TR")} km` : "—",
      r.serviceCenter || "—",
      r.notes         || "",
    ]),
    theme: "striped",
    ...baseTableStyles(),
    alternateRowStyles: { fillColor: [248, 248, 255] },
    styles: { cellPadding: 2.5, font: "Roboto", fontSize: 7.5, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 38 },
      2: { cellWidth: 22 },
      3: { cellWidth: 35 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
    },
    margin: { left: 10, right: 10 },
  });

  addFooter(doc);
  doc.save(`carstrack_servis_gecmisi_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Fleet Status Report ───────────────────────────────────────────────────

export async function exportFleetStatusPDF(vehicles: Vehicle[]): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await embedFonts(doc);

  const alerts = getFleetAlerts(vehicles);

  addHeader(
    doc,
    "Filo Durum Raporu",
    `${vehicles.length} araç  •  ${new Date().toLocaleDateString("tr-TR")}`
  );

  // ── Summary stats boxes ──
  let y = 46;
  const critCount = alerts.filter((a) => a.severity === "critical").length;
  const warnCount = alerts.filter((a) => a.severity === "warning").length;
  const avgScore  = vehicles.length
    ? Math.round(vehicles.reduce((s, v) => s + calculateHealthScore(v), 0) / vehicles.length)
    : 0;

  const stats: Array<{ label: string; value: string; color: [number, number, number] }> = [
    { label: "Toplam Araç",  value: String(vehicles.length), color: [99, 102, 241] },
    { label: "Ort. Sağlık",  value: `${avgScore}`,           color: avgScore >= 85 ? [16, 185, 129] : avgScore >= 65 ? [245, 158, 11] : [239, 68, 68] },
    { label: "Kritik Uyarı", value: String(critCount),       color: [239, 68, 68] },
    { label: "Uyarı",        value: String(warnCount),       color: [245, 158, 11] },
  ];

  const boxW = 42, boxH = 18, gap = 4, startX = 14;
  stats.forEach((stat, i) => {
    const x = startX + i * (boxW + gap);
    doc.setFillColor(...stat.color);
    doc.roundedRect(x, y, boxW, boxH, 3, 3, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(stat.value, x + boxW / 2, y + 10, { align: "center" });
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7);
    doc.text(stat.label, x + boxW / 2, y + 15, { align: "center" });
  });

  y += boxH + 10;

  // ── Vehicle table ──
  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  doc.setTextColor(99, 102, 241);
  doc.text("Araç Listesi", 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Plaka", "Araç", "KM", "Sağlık", "Sigorta", "Muayene", "Bakım"]],
    body: vehicles.map((v) => {
      const score    = calculateHealthScore(v);
      const insDays  = daysUntil(v.insuranceExpiry);
      const muaDays  = daysUntil(v.inspectionExpiry);
      const critMaint = v.maintenanceItems
        .map((item) => ({ ...item, status: getMaintenanceStatusForItem(item, v.mileage) }))
        .filter((item) => item.status !== "good");
      const maintStatus =
        critMaint.some((m) => m.status === "overdue") ? "Gecikmeli"
        : critMaint.length > 0                        ? "Uyarı var"
        : "Tamam";

      return [
        v.plate,
        `${v.brand} ${v.model} (${v.year})`,
        `${v.mileage.toLocaleString("tr-TR")} km`,
        String(score),
        insDays !== null ? docStatusText(insDays) : "—",
        muaDays !== null ? docStatusText(muaDays) : "—",
        maintStatus,
      ];
    }),
    ...baseTableStyles(),
    styles: { cellPadding: 2.5, font: "Roboto", fontSize: 7.5 },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 3) {
        const s = parseInt(String(data.cell.raw ?? "0"));
        data.cell.styles.textColor = s >= 85 ? [16, 185, 129] : s >= 65 ? [245, 158, 11] : [239, 68, 68];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 4 || data.column.index === 5) {
        if (String(data.cell.raw ?? "").includes("gecikti"))
          data.cell.styles.textColor = [239, 68, 68];
      }
      if (data.column.index === 6) {
        const val = String(data.cell.raw ?? "");
        if (val === "Gecikmeli")  data.cell.styles.textColor = [239, 68, 68];
        else if (val === "Uyarı var") data.cell.styles.textColor = [245, 158, 11];
        else                      data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });

  y = lastY(doc) + 10;

  // ── Alerts table ──
  if (alerts.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text(`Aktif Uyarılar (${alerts.length})`, 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Araç", "Uyarı", "Açıklama", "Önem"]],
      body: alerts.map((a: FleetAlert) => [
        a.vehiclePlate,
        a.title,
        a.description,
        a.severity === "critical" ? "Kritik" : a.severity === "warning" ? "Uyarı" : "Bilgi",
      ]),
      ...baseTableStyles(),
      styles: { cellPadding: 2.5, font: "Roboto", fontSize: 7.5, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 45 }, 3: { cellWidth: 18 } },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const val = String(data.cell.raw ?? "");
          if (val === "Kritik")     data.cell.styles.textColor = [239, 68, 68];
          else if (val === "Uyarı") data.cell.styles.textColor = [245, 158, 11];
          else                      data.cell.styles.textColor = [99, 102, 241];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  }

  addFooter(doc);
  doc.save(`carstrack_filo_raporu_${new Date().toISOString().slice(0, 10)}.pdf`);
}
