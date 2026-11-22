import type { DriverLicenseEntry, UserRole } from "./types";
import { isDriverRole } from "./types";
import { isValidPhone } from "./phone";

/**
 * Profil tamamlama kontrolü — hem istemci (ayarlar kartı, hatırlatma bandı)
 * hem sunucu (profile-reminder cron'u) aynı kuralı kullansın diye tek yerde.
 *
 * Herkes: ad soyad ve telefon (doğrulanmaz; biçimsel kontrol src/lib/phone.ts).
 * Operatör ve sürücü: departman/ünvan. Şirket Yetkilisinde isteğe bağlı — çoğu
 * zaman şirket sahibidir; canlı veride yöneticilerin tek eksiği buydu ve bunun
 * için hatırlatma göndermek gürültü olurdu.
 * Sürücü (user/sofor): ehliyet no, en az bir ehliyet sınıfı, her sınıfın bitiş
 * tarihi — bitiş tarihi olmadan ehliyet süresi hatırlatması çalışamaz.
 * Profil fotoğrafı isteğe bağlıdır; eksik sayılmaz.
 */

export type ProfileFieldKey = "fullName" | "phone" | "department" | "licenseNumber" | "licenseClass" | "licenseExpiry";

export interface MissingField {
  key: ProfileFieldKey;
  label: string;
  /** Ayarlar sayfasında ilgili bölüm. */
  section: "profil" | "ehliyet";
}

export interface ProfileCompletenessInput {
  role: UserRole | string | null | undefined;
  fullName?: string | null;
  phone?: string | null;
  department?: string | null;
  licenseNumber?: string | null;
  licenses?: DriverLicenseEntry[] | null;
}

const LABELS: Record<ProfileFieldKey, string> = {
  fullName: "Ad Soyad",
  phone: "Telefon",
  department: "Departman / Ünvan",
  licenseNumber: "Ehliyet numarası",
  licenseClass: "Ehliyet sınıfı",
  licenseExpiry: "Ehliyet geçerlilik tarihi",
};

function blank(v: string | null | undefined): boolean {
  return !v || !v.trim();
}

export function requiresDepartment(role: ProfileCompletenessInput["role"]): boolean {
  return role !== "manager";
}

export function getMissingProfileFields(p: ProfileCompletenessInput): MissingField[] {
  const missing: MissingField[] = [];
  const add = (key: ProfileFieldKey, section: MissingField["section"]) =>
    missing.push({ key, label: LABELS[key], section });

  // Kayıtta ad yerine e-posta yazılmışsa da eksik sayılır.
  if (blank(p.fullName) || p.fullName!.includes("@")) add("fullName", "profil");
  if (!isValidPhone(p.phone)) add("phone", "profil");
  if (requiresDepartment(p.role) && blank(p.department)) add("department", "profil");

  if (isDriverRole(p.role ?? null)) {
    const licenses = (p.licenses ?? []).filter((l) => !blank(l.class));
    if (blank(p.licenseNumber)) add("licenseNumber", "ehliyet");
    if (licenses.length === 0) add("licenseClass", "ehliyet");
    else if (licenses.some((l) => blank(l.expiryDate))) add("licenseExpiry", "ehliyet");
  }
  return missing;
}

/** Eksik alanlardan ayarlar sayfasındaki ilk ilgili bölüme giden yol. */
export function completionUrl(missing: MissingField[]): string {
  const section = missing.find((m) => m.section === "profil") ? "profil" : "ehliyet";
  return `/settings#${missing.length ? section : "profil"}`;
}

/** Doldurulan alan oranı (0–100) — ilerleme çubuğu için. */
export function completionPercent(p: ProfileCompletenessInput): number {
  const total = 2 + (requiresDepartment(p.role) ? 1 : 0) + (isDriverRole(p.role ?? null) ? 3 : 0);
  // licenseClass ve licenseExpiry birbirini dışlar; sınıf yokken tarih de yok sayılır.
  const missing = getMissingProfileFields(p);
  let missingCount = missing.length;
  if (missing.some((m) => m.key === "licenseClass")) missingCount += 1;
  return Math.round(((total - missingCount) / total) * 100);
}
