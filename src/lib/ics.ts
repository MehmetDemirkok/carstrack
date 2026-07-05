import type { Vehicle } from "./types";

type VehicleIcsInput = Pick<
  Vehicle,
  "id" | "brand" | "model" | "plate" | "insuranceExpiry" | "kaskoExpiry" | "greenCardExpiry" | "inspectionExpiry"
>;

interface IcsEvent {
  key: string;
  label: string;
  date: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function addDaysIcs(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function nowStampUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Araç belge bitiş tarihlerinden (sigorta, kasko, yeşil kart, muayene) bir
 * .ics takvim dosyası üretir. Boş tarihler atlanır. Bağımlılık gerektirmez —
 * RFC 5545'in minimal bir alt kümesini elle üretir.
 */
export function buildVehicleIcs(vehicle: VehicleIcsInput): string {
  const vehicleName = `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`.trim();

  const events: IcsEvent[] = (
    [
      { key: "insurance", label: "Trafik Sigortası Bitişi", date: vehicle.insuranceExpiry },
      { key: "kasko", label: "Kasko Bitişi", date: vehicle.kaskoExpiry },
      { key: "greencard", label: "Yeşil Kart Bitişi", date: vehicle.greenCardExpiry },
      { key: "inspection", label: "Muayene Bitişi", date: vehicle.inspectionExpiry },
    ] as { key: string; label: string; date: string | undefined }[]
  ).filter((e): e is IcsEvent => !!e.date);

  const dtstamp = nowStampUtc();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CarsTrack//Vehicle Reminders//TR",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const summary = escapeIcsText(`${vehicleName} — ${event.label}`);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${vehicle.id}-${event.key}@carstrack.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
      `DTEND;VALUE=DATE:${addDaysIcs(event.date, 1)}`,
      `SUMMARY:${summary}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${summary}`,
      "TRIGGER:-P7D",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
