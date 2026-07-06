import type { DriverLicenseEntry } from "./types";

export const LICENSE_CLASSES = [
  "A1", "A2", "A", "B1", "B", "BE", "C1", "C1E", "C", "CE", "D1", "D1E", "D", "DE", "F", "G", "M",
];

// Sürücü ehliyet süresi durumu — sigorta/muayene ile aynı eşikler (bkz. use-notifications.ts):
// süresi geçmiş → expired, ≤30 gün → expiring, yoksa → valid, hiç sınıf girilmemiş → missing.
// Bir sürücünün birden fazla sınıfı olabilir; her sınıfın kendi geçerlilik tarihi vardır —
// genel durum bunların en acilisine (en kritik olanına) göre belirlenir.

export type LicenseStatus = "missing" | "expired" | "expiring" | "valid";

export function daysUntilDate(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function entryStatus(entry: DriverLicenseEntry): "expired" | "expiring" | "valid" {
  if (!entry.expiryDate) return "valid";
  const days = daysUntilDate(entry.expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

/** Tüm sınıflar arasındaki en kritik duruma göre genel ehliyet durumu. */
export function getOverallLicenseStatus(licenses?: DriverLicenseEntry[]): LicenseStatus {
  if (!licenses || licenses.length === 0) return "missing";
  const statuses = licenses.map(entryStatus);
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("expiring")) return "expiring";
  return "valid";
}

/** Banner/bildirim mesajında gösterilecek en acil (en yakın dolan ya da dolmuş) sınıf. */
export function getMostUrgentEntry(licenses?: DriverLicenseEntry[]): DriverLicenseEntry | null {
  const withExpiry = (licenses ?? []).filter((l) => l.expiryDate);
  if (withExpiry.length === 0) return null;
  return withExpiry.reduce((worst, l) =>
    daysUntilDate(l.expiryDate!) < daysUntilDate(worst.expiryDate!) ? l : worst
  );
}

/** Süresi dolmuş ya da yaklaşan tüm sınıflar — cron toplu bildirimi için. */
export function getFlaggedEntries(
  licenses?: DriverLicenseEntry[],
): (DriverLicenseEntry & { status: "expired" | "expiring" })[] {
  return (licenses ?? [])
    .filter((l) => l.expiryDate)
    .map((l) => ({ ...l, status: entryStatus(l) }))
    .filter((l): l is DriverLicenseEntry & { status: "expired" | "expiring" } => l.status !== "valid");
}
