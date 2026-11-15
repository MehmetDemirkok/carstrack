import { getOverallLicenseStatus, getMostUrgentEntry, daysUntilDate } from "@/lib/license";
import type { DriverLicenseEntry, Profile, UserRole, Vehicle, VehicleTask } from "@/lib/types";
import { isDriverRole } from "@/lib/types";

// ─── Tipler ──────────────────────────────────────────────────

export type DriverWithAssignment = Profile & { assignedVehicleIds: string[] };

export type PendingInvite = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  expires_at: string;
};

/** Ekip listesinde tek bir kartın ihtiyaç duyduğu, önceden hesaplanmış görünüm. */
export type MemberView = {
  member: Profile;
  isDriver: boolean;
  assignedVehicles: Vehicle[];
  activeTask: VehicleTask | null;
  taskVehicle: Vehicle | null;
  licenseStatus: ReturnType<typeof getOverallLicenseStatus>;
};

export type TeamFilter = "all" | "management" | "drivers" | "active" | "unassigned" | "license";

// ─── Biçimlendirme yardımcıları ──────────────────────────────

export function formatDuration(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  return `${hours} sa ${mins % 60} dk`;
}

export function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toLocaleUpperCase("tr-TR") ?? "").join("");
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
  "bg-indigo-500", "bg-rose-500",
];

export function avatarColor(name: string): string {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function roleBadge(role: UserRole) {
  if (role === "manager") return { label: "Şirket Yetkilisi", cls: "bg-primary/10 text-primary" };
  if (role === "operator") return { label: "Operatör", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  if (role === "sofor") return { label: "Şoför", cls: "bg-muted text-muted-foreground" };
  return { label: "Kullanıcı", cls: "bg-muted text-muted-foreground" };
}

export function licenseBadge(licenses?: DriverLicenseEntry[]) {
  const status = getOverallLicenseStatus(licenses);
  if (status === "missing") return { label: "Ehliyet bilgisi yok", cls: "bg-muted/50 text-muted-foreground" };

  const urgent = getMostUrgentEntry(licenses);
  if (status === "expired" && urgent) {
    return { label: `${urgent.class} süresi doldu (${new Date(urgent.expiryDate!).toLocaleDateString("tr-TR")})`, cls: "bg-red-500/10 text-red-600 dark:text-red-400" };
  }
  if (status === "expiring" && urgent) {
    return { label: `${urgent.class} ${daysUntilDate(urgent.expiryDate!)} gün sonra doluyor`, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  }
  const classesLabel = (licenses ?? []).map((l) => l.class).join(", ");
  return { label: `Ehliyet geçerli (${classesLabel})`, cls: "bg-green-500/10 text-green-600 dark:text-green-400" };
}

/** Bir davetin bitişine kalan süreyi kısa metin olarak döndürür. */
export function inviteExpiryLabel(expiresAt: string): { label: string; urgent: boolean } {
  const days = daysUntilDate(expiresAt);
  if (days <= 0) return { label: "Süresi doldu", urgent: true };
  if (days === 1) return { label: "Yarın sona eriyor", urgent: true };
  return { label: `${days} gün sonra sona eriyor`, urgent: days <= 2 };
}

// ─── Roller ──────────────────────────────────────────────────

export const ROLE_OPTIONS: { value: UserRole; label: string; activeClass: string; short: string; description: string }[] = [
  {
    value: "user",
    label: "Kullanıcı",
    activeClass: "bg-muted border-primary text-primary",
    short: "Sadece atanan araçlar",
    description: "Genel personel rolüdür. Yalnızca kendisine atanan araçları görür, kilometre/görev günceller. Ekip veya araç ekleyemez, şirket ayarlarına erişemez.",
  },
  {
    value: "sofor",
    label: "Şoför",
    activeClass: "bg-muted border-primary text-primary",
    short: "Kullanıcı ile aynı yetki",
    description: "Şoförler için uygun roldür — yetkileri Kullanıcı rolüyle birebir aynıdır. Yalnızca kendisine atanan araçları görür, kilometre/görev günceller. Ekip veya araç ekleyemez, şirket ayarlarına erişemez.",
  },
  {
    value: "operator",
    label: "Operatör",
    activeClass: "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400",
    short: "Filoyu yönetir",
    description: "Tüm araçları, görevleri ve cezaları yönetir. Ekip davet edemez, rol değiştiremez, etkinlik geçmişini göremez.",
  },
  {
    value: "manager",
    label: "Şirket Yetkilisi",
    activeClass: "bg-primary/10 border-primary text-primary",
    short: "Tam yetki",
    description: "Tam yetkilidir: ekip davet eder, rol değiştirir, şirket ayarlarını yönetir ve etkinlik geçmişini görür.",
  },
];

const ROLE_RANK: Record<UserRole, number> = { manager: 3, operator: 2, user: 1, sofor: 1 };

/** Yeni rol eskisinden daha az yetkiliyse true (onay istenir). */
export function isDowngrade(from: UserRole, to: UserRole): boolean {
  return ROLE_RANK[to] < ROLE_RANK[from];
}

// ─── Liste görünümü, filtre ve sıralama ──────────────────────

export function buildMemberViews(
  members: Profile[],
  drivers: DriverWithAssignment[],
  vehicles: Vehicle[],
  activeTasks: VehicleTask[],
): MemberView[] {
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const assignmentMap = new Map(drivers.map((d) => [d.id, d.assignedVehicleIds]));
  const activeTaskMap = new Map(activeTasks.map((t) => [t.driverId, t]));

  return members.map((member) => {
    const isDriver = isDriverRole(member.role);
    const assignedVehicles = (assignmentMap.get(member.id) ?? [])
      .map((id) => vehicleMap.get(id))
      .filter((v): v is Vehicle => !!v);
    const activeTask = activeTaskMap.get(member.id) ?? null;
    return {
      member,
      isDriver,
      assignedVehicles,
      activeTask,
      taskVehicle: activeTask ? vehicleMap.get(activeTask.vehicleId) ?? null : null,
      licenseStatus: getOverallLicenseStatus(member.licenses),
    };
  });
}

export function hasLicenseIssue(v: MemberView): boolean {
  return v.isDriver && v.licenseStatus !== "valid";
}

export function isUnassignedDriver(v: MemberView): boolean {
  return v.isDriver && !v.activeTask && v.assignedVehicles.length === 0;
}

export function matchesFilter(v: MemberView, filter: TeamFilter): boolean {
  switch (filter) {
    case "all": return true;
    case "management": return !v.isDriver;
    case "drivers": return v.isDriver;
    case "active": return !!v.activeTask;
    case "unassigned": return isUnassignedDriver(v);
    case "license": return hasLicenseIssue(v);
  }
}

/** Türkçe karakterlere duyarsız arama için metni sadeleştirir. */
function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
}

export function matchesSearch(v: MemberView, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [
    v.member.fullName,
    v.member.department ?? "",
    roleBadge(v.member.role).label,
    ...v.assignedVehicles.map((x) => x.plate),
    v.taskVehicle?.plate ?? v.activeTask?.vehiclePlate ?? "",
  ];
  return haystack.some((h) => normalize(h).includes(q));
}

/**
 * Sürücüleri aciliyete göre sıralar: süresi dolan ehliyet → araçsız →
 * dolmak üzere ehliyet → aktif seyahatte → diğerleri; eşitlikte isim.
 */
function driverUrgency(v: MemberView): number {
  if (v.licenseStatus === "expired") return 0;
  if (isUnassignedDriver(v)) return 1;
  if (v.licenseStatus === "expiring") return 2;
  if (v.activeTask) return 3;
  return 4;
}

export function sortManagement(a: MemberView, b: MemberView): number {
  const rank = ROLE_RANK[b.member.role] - ROLE_RANK[a.member.role];
  return rank !== 0 ? rank : a.member.fullName.localeCompare(b.member.fullName, "tr");
}

export function sortDrivers(a: MemberView, b: MemberView): number {
  const u = driverUrgency(a) - driverUrgency(b);
  return u !== 0 ? u : a.member.fullName.localeCompare(b.member.fullName, "tr");
}
