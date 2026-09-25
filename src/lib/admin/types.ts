import type { UserRole } from "@/lib/types";

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
  };
}

// ─── Şirketler ───────────────────────────────────────────────────────────────

export interface AdminCompanyRow {
  id: string;
  name: string;
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
  };
  /** Son 7 günde üretilen içerik — ömür boyu toplam yerine (bkz. overview route). */
  activity7d: {
    serviceRecords: number;
    tasks: number;
    fuelRecords: number;
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
  roleBreakdown: { role: UserRole; count: number }[];
  /** Aktivasyon hunisi: kayıt → araç → içerik → ekip. */
  funnel: { label: string; count: number }[];
  /** Haftalık şirket kohortları — kaydoldu / araç ekledi / 7+ gün sonra döndü. */
  cohorts: { weekStart: string; signedUp: number; activated: number; retained: number }[];
  recentUsers: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    companyName: string;
    createdAt: string;
  }[];
  recentCompanies: { id: string; name: string; createdAt: string; userCount: number }[];
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
  /**
   * Gönderim bitti mi? Toplu duyuru tek istekte bitmeyebilir (fonksiyon süre
   * sınırı); false ise `remaining` ile aynı uca devam çağrısı yapılmalıdır.
   */
  done: boolean;
  /** Bu çağrıda çözülen alıcı sayısı. */
  total: number;
  /** Bu çağrıda sırası gelmeyen alıcıların profil id'leri. */
  remaining: string[];
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

export interface CronHealth {
  lastRunAt: string | null;
  lastStatus: "ok" | "error" | null;
  lastDurationMs: number | null;
  lastError: string | null;
  lastSummary: Record<string, unknown>;
  runs7d: number;
  errors7d: number;
}

export interface AdminSystemResponse {
  env: { key: string; present: boolean; required: boolean; hint: string }[];
  crons: {
    path: string;
    schedule: string;
    label: string;
    description: string;
    /** Son 7 günün `cron_runs` özeti; migration uygulanmadıysa hepsi boş/0. */
    health: CronHealth;
  }[];
  backups: { name: string; sizeLabel: string; createdAt: string }[];
  /** `last7d` null ise o tablo için artış hesaplanamadı. */
  tables: { table: string; rows: number; last7d: number | null }[];
  emailLog: { last7d: number; last30d: number; lastSentAt: string | null };
  adminEmails: string[];
}

// ─── Araçlar ─────────────────────────────────────────────────────────────────

export interface AdminVehicleRow {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  mileage: number;
  companyId: string | null;
  companyName: string;
  /** Araca atanmış sürücü adları — boşsa araç kimseye atanmamış. */
  drivers: string[];
  insuranceExpiry: string | null;
  inspectionExpiry: string | null;
  kaskoExpiry: string | null;
  /** Bugüne göre kalan gün; negatifse geçmiş, tarih yoksa null. */
  insuranceDays: number | null;
  inspectionDays: number | null;
  createdAt: string;
}

export interface AdminVehicleListResponse {
  vehicles: AdminVehicleRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: {
    all: number;
    expired: number;
    expiring: number;
    missingDates: number;
    unassigned: number;
  };
}

export interface AdminVehicleDetail {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string;
  mileage: number;
  fuelType: string;
  transmission: string;
  chassisNo: string;
  ownershipType: string;
  rentCompany: string;
  companyId: string | null;
  companyName: string;
  insuranceCompany: string;
  insuranceExpiry: string | null;
  kaskoCompany: string;
  kaskoExpiry: string | null;
  inspectionExpiry: string | null;
  lastServiceDate: string | null;
  lastServiceMileage: number;
  nextServiceMileage: number;
  notes: string;
  createdAt: string;
  updatedAt: string | null;
  /** Satırda hâlâ base64 duran fotoğrafların toplam boyutu (taşınmamış kalıntı). */
  inlineBytes: number;
  inlineCount: number;
  /** Storage'a taşınmış fotoğraf sayısı. */
  storedCount: number;
  drivers: { id: string; fullName: string; role: string }[];
  documents: {
    id: string;
    title: string;
    type: string;
    fileName: string;
    fileSize: number | null;
    expiryDate: string | null;
    createdAt: string;
  }[];
  services: {
    id: string;
    date: string | null;
    type: string;
    title: string;
    serviceCenter: string;
    cost: number | null;
    mileage: number;
  }[];
  /** vehicle_tasks — görev değil, sefer/km kaydı. */
  trips: {
    id: string;
    driverName: string;
    startKm: number;
    endKm: number | null;
    distance: number | null;
    description: string;
    status: string;
    startTime: string;
  }[];
  fuelRecords: {
    id: string;
    fueledAt: string | null;
    liters: number;
    totalAmount: number;
    odometer: number;
    stationName: string;
  }[];
  fines: {
    id: string;
    fineDate: string | null;
    amount: number;
    status: string;
    violationType: string;
  }[];
  reports: {
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    createdAt: string;
  }[];
}

// ─── Depolama ────────────────────────────────────────────────────────────────

export interface AdminStorageResponse {
  /** Araç fotoğraflarının storage'a taşınma durumu. */
  photos: {
    inlineVehicles: number;
    inlineBytes: number;
    storedPhotos: number;
    totalVehicles: number;
  };
  /** Satır içi fotoğraf taşıyan en ağır şirketler. */
  heaviestCompanies: {
    id: string;
    name: string;
    vehicleCount: number;
    inlineBytes: number;
    inlineCount: number;
  }[];
  /** Satır içi fotoğraf taşıyan en ağır araçlar. */
  heaviestVehicles: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    companyId: string | null;
    companyName: string;
    inlineBytes: number;
    inlineCount: number;
  }[];
  /** Storage bucket kullanımı — listelenemezse `error` dolar. */
  buckets: { name: string; fileCount: number; bytes: number; error: string | null }[];
  /** View'lar yoksa (migration uygulanmadıysa) true. */
  unavailable: boolean;
}

// ─── Destek notları ──────────────────────────────────────────────────────────

export type AdminNoteTarget = "user" | "company" | "vehicle";

export interface AdminNoteRow {
  id: string;
  actorEmail: string;
  targetType: AdminNoteTarget;
  targetId: string;
  targetLabel: string;
  body: string;
  createdAt: string;
}

// ─── Davetler ────────────────────────────────────────────────────────────────

export interface AdminInviteRow {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  /** `status = 'pending'` ama `expires_at` geçmiş — fiilen ölü davet. */
  expired: boolean;
  companyId: string | null;
  companyName: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface AdminInviteListResponse {
  invites: AdminInviteRow[];
  counts: {
    all: number;
    pending: number;
    expired: number;
    accepted: number;
    revoked: number;
  };
}

// ─── Duyuru kuyruğu ──────────────────────────────────────────────────────────

export interface AdminEmailQueueRow {
  id: string;
  actorEmail: string;
  status: "pending" | "sending" | "done" | "cancelled" | "error";
  scheduledAt: string;
  segment: AdminEmailSegment;
  segmentLabel: string;
  subject: string;
  title: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

// ─── Global ayarlar ──────────────────────────────────────────────────────────

export interface AppBanner {
  enabled: boolean;
  message: string;
  severity: "info" | "warning" | "critical";
}
