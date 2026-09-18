import type { PlanType, UserRole } from "@/lib/types";

/**
 * Admin paneli API sözleşmeleri. Hem route handler'lar hem de istemci
 * bileşenleri buradan okur — böylece camelCase dönüşümü tek yerde tanımlı.
 */

// ─── Kullanıcılar ────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  companyId: string | null;
  companyName: string;
  companyPlan: PlanType;
  /** profiles.created_at — uygulamaya kaydolma anı. */
  createdAt: string;
  /** auth.users.last_sign_in_at — hiç giriş yapmadıysa null. */
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  banned: boolean;
  /** Atanmış araç sayısı. */
  vehicleCount: number;
  /** Kullanıcının başlattığı görev sayısı. */
  taskCount: number;
  notifyByEmail: boolean;
}

export interface AdminUserListResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Filtrelenmemiş toplamlar — üst şeritteki sayaçlar için. */
  counts: {
    all: number;
    managers: number;
    operators: number;
    drivers: number;
    banned: number;
    neverSignedIn: number;
  };
}

export interface AdminUserDetail extends AdminUserRow {
  provider: string;
  authCreatedAt: string;
  licenseNumber: string | null;
  vehicles: { id: string; plate: string; brand: string; model: string }[];
  recentActivity: { id: string; action: string; entityLabel: string | null; createdAt: string }[];
  stats: {
    tasks: number;
    fuelRecords: number;
    reports: number;
    feedback: number;
    kilometerLogs: number;
  };
}

// ─── Şirketler ───────────────────────────────────────────────────────────────

export interface AdminCompanyRow {
  id: string;
  name: string;
  plan: PlanType;
  createdAt: string;
  timezone: string | null;
  email: string | null;
  phone: string | null;
  userCount: number;
  vehicleCount: number;
  /** Son 30 günde üretilen kayıt sayısı (araç/servis/görev/yakıt/ceza). */
  activity30d: number;
  /** Şirketteki herhangi bir kullanıcının en son giriş zamanı. */
  lastSignInAt: string | null;
  /** Yönetici rolündeki ilk kullanıcının e-postası — iletişim için. */
  ownerEmail: string | null;
  ownerName: string | null;
  /** Aktivasyon durumu: araç eklendi mi, sigorta/muayene girildi mi. */
  health: AdminCompanyHealth;
}

export type AdminCompanyHealth = "healthy" | "partial" | "empty" | "dormant";

export interface AdminCompanyListResponse {
  companies: AdminCompanyRow[];
  total: number;
  counts: {
    all: number;
    healthy: number;
    partial: number;
    empty: number;
    dormant: number;
  };
}

export interface AdminCompanyDetail extends AdminCompanyRow {
  address: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  inviteCode: string | null;
  members: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    createdAt: string;
    lastSignInAt: string | null;
  }[];
  vehicles: { id: string; plate: string; brand: string; model: string; createdAt: string }[];
  counts: {
    vehicles: number;
    serviceRecords: number;
    documents: number;
    tasks: number;
    fuelRecords: number;
    trafficFines: number;
    reports: number;
    feedback: number;
  };
}

// ─── Genel bakış ─────────────────────────────────────────────────────────────

export interface AdminOverviewResponse {
  totals: {
    companies: number;
    users: number;
    vehicles: number;
    serviceRecords: number;
    tasks: number;
    fuelRecords: number;
    trafficFines: number;
    reports: number;
  };
  /** Bugün / 7 gün / 30 gün içinde eklenen yeni kayıtlar. */
  growth: {
    usersToday: number;
    users7d: number;
    users30d: number;
    usersPrev30d: number;
    companiesToday: number;
    companies7d: number;
    companies30d: number;
    companiesPrev30d: number;
    vehicles7d: number;
    vehicles30d: number;
  };
  engagement: {
    activeToday: number;
    active7d: number;
    active30d: number;
    neverSignedIn: number;
    unconfirmedEmail: number;
  };
  /** Son 30 gün, günlük yeni kullanıcı + şirket serisi (grafik için). */
  series: { date: string; users: number; companies: number; vehicles: number }[];
  planBreakdown: { plan: PlanType; count: number }[];
  roleBreakdown: { role: UserRole; count: number }[];
  /** Aktivasyon hunisi: kayıt → araç → içerik → ekip. */
  funnel: { label: string; count: number }[];
  recentUsers: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    companyName: string;
    createdAt: string;
  }[];
  recentCompanies: { id: string; name: string; plan: PlanType; createdAt: string; userCount: number }[];
  recentFeedback: {
    id: string;
    type: string;
    status: string;
    message: string;
    companyName: string;
    userName: string;
    createdAt: string;
  }[];
  /** Dikkat isteyen hesaplar. */
  attention: {
    emptyCompanies: { id: string; name: string; createdAt: string; ageDays: number }[];
    dormantCompanies: { id: string; name: string; lastSignInAt: string | null; ageDays: number }[];
    openFeedback: number;
  };
}

// ─── E-posta ─────────────────────────────────────────────────────────────────

export type AdminEmailSegment =
  | "all"
  | "managers"
  | "operators"
  | "drivers"
  | "company"
  | "inactive"
  | "never_signed_in"
  | "empty_fleet"
  | "manual";

export interface AdminEmailRecipient {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  companyName: string;
}

export interface AdminEmailRecipientsResponse {
  recipients: AdminEmailRecipient[];
  total: number;
  /** E-posta bildirimi kapalı olduğu için elenenler. */
  optedOut: number;
}

export interface AdminEmailSendResponse {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: boolean;
  errors: string[];
}

export interface AdminEmailLogRow {
  id: string;
  actorEmail: string;
  segment: AdminEmailSegment;
  segmentLabel: string;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  isTest: boolean;
  error: string | null;
  createdAt: string;
}

// ─── Geri bildirim ───────────────────────────────────────────────────────────

export interface AdminFeedbackRow {
  id: string;
  type: "bug" | "suggestion" | "other";
  status: "new" | "seen" | "resolved";
  message: string;
  pageUrl: string;
  userAgent: string;
  createdAt: string;
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  userEmail: string;
}

// ─── Etkinlik ────────────────────────────────────────────────────────────────

export interface AdminActivityRow {
  id: string;
  source: "tenant" | "admin";
  action: string;
  actorName: string;
  entityType: string;
  entityLabel: string | null;
  companyName: string;
  createdAt: string;
  meta: Record<string, unknown>;
}

// ─── Sistem ──────────────────────────────────────────────────────────────────

export interface AdminSystemResponse {
  env: { key: string; present: boolean; required: boolean; hint: string }[];
  crons: {
    path: string;
    schedule: string;
    label: string;
    description: string;
  }[];
  backups: { name: string; sizeLabel: string; createdAt: string }[];
  tables: { table: string; rows: number }[];
  emailLog: { last7d: number; last30d: number; lastSentAt: string | null };
  adminEmails: string[];
}
