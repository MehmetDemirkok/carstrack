export type UserRole = "manager" | "operator" | "user" | "sofor";
export type PlanType = "free" | "pro" | "fleet";

/** "user" (Kullanıcı) ve "sofor" (Şoför) yetki bakımından birebir aynıdır — yalnızca ekip listesinde ayrı etiketle gösterilirler. */
export function isDriverRole(role?: UserRole | string | null): boolean {
  return role === "user" || role === "sofor";
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  inviteCode?: string;
  plan: PlanType;
  /** IANA saat dilimi — günlük filo özeti bu dilimde yerel 09:00'da gider. */
  timezone?: string;
}

/** Sürücünün sahip olduğu bir ehliyet sınıfı — her sınıfın kendi veriliş/geçerlilik tarihi vardır. */
export interface DriverLicenseEntry {
  class: string;
  issueDate?: string;
  expiryDate?: string;
}

/** Kategori bazlı bildirim tercihi — yalnızca push/e-posta kanallarını etkiler, uygulama içi zil her zaman gelir. */
export interface NotificationPrefs {
  /** Günlük aktivite: yeni araç/servis kaydı/arıza/görev/ekip üyesi/geri bildirim durumu. */
  operational: boolean;
  /** Doğrudan kişiye yönelik hatırlatmalar: haftalık km, ehliyet süresi, trafik cezası. */
  reminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { operational: true, reminders: true };

export interface Profile {
  id: string;
  companyId: string;
  role: UserRole;
  fullName: string;
  department: string;
  avatarUrl?: string;
  notifyByEmail: boolean;
  createdAt: string;
  /** Sürücü (role="user") ehliyet bilgileri — hiçbiri zorunlu değildir. */
  licenseNumber?: string;
  licenses?: DriverLicenseEntry[];
  notificationPrefs?: NotificationPrefs;
}

export interface VehicleAssignment {
  id: string;
  vehicleId: string;
  driverId: string;
  assignedAt: string;
}

export type OwnershipType = "ozmal" | "kiralik";
export type FuelType = "Benzin" | "Dizel" | "LPG" | "Hibrit" | "Elektrik";
export type TransmissionType = "Manuel" | "Otomatik" | "CVT" | "DSG" | "Yarı Otomatik";
export type TireSeasonType = "Yazlık" | "Kışlık" | "Dört Mevsim";
export type ServiceType = "routine" | "repair" | "tire" | "inspection" | "battery" | "other";
export type AlertSeverity = "critical" | "warning" | "info";

export interface MaintenanceItem {
  id: string;
  name: string;
  lastDoneDate?: string;
  lastDoneMileage?: number;
  intervalKm?: number;
  intervalMonths?: number;
}

export interface Vehicle {
  id: string;
  ownershipType: OwnershipType;
  rentCompany: string;
  ruhsatSahibi: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  image?: string;
  /** Ek araç fotoğrafları (arka, yan vb.) — image ile birlikte toplamda 4 adet */
  image2?: string;
  image3?: string;
  image4?: string;
  imagePosition?: number;
  imagePositionX?: number;
  imageZoom?: number;
  sortOrder?: number;
  mileage: number;
  engineType: string;
  engineVolume: string;
  power: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  chassisNo: string;
  tireStatus: TireSeasonType;
  tireBrand: string;
  tireSize: string;
  tireInstallDate: string;
  tireMileage: number;
  batteryBrand: string;
  batteryCapacity: string;
  batteryInstallDate: string;
  insuranceCompany: string;
  insuranceExpiry: string;
  kaskoCompany: string;
  kaskoExpiry: string;
  greenCardCompany: string;
  greenCardExpiry: string;
  inspectionExpiry: string;
  lastServiceDate: string;
  lastServiceMileage: number;
  nextServiceMileage: number;
  maintenanceItems: MaintenanceItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = "paid" | "unpaid";

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  date: string;
  type: ServiceType;
  title: string;
  mileage: number;
  serviceCenter: string;
  notes: string;
  /** Servis masrafı (TRY) — opsiyonel. */
  cost?: number;
  /** cost girildiyse anlamlıdır: ödendi mi, ödenmedi mi. */
  paymentStatus?: PaymentStatus;
  /** paymentStatus === "unpaid" iken ödenmeme nedeni. */
  unpaidReason?: string;
  createdAt: string;
}

export type TaskStatus = "active" | "completed";

export interface VehicleTask {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  startKm: number;
  endKm?: number;
  distance?: number;
  description: string;
  status: TaskStatus;
  startTime: string;
  endTime?: string;
  createdAt: string;
  vehiclePlate?: string;
  vehicleName?: string;
  driverName?: string;
  driverDepartment?: string;
  /** true ise bu kayıt bir seyahat değil, yöneticinin kapattığı KM farkıdır. */
  isAdjustment?: boolean;
}

export type ReportStatus = "open" | "acknowledged" | "in_progress" | "resolved";
export type ReportSeverity = "low" | "medium" | "high" | "critical";
export type ReportCategory =
  | "engine"
  | "brake"
  | "tire"
  | "electrical"
  | "fluid"
  | "warning_light"
  | "body"
  | "other";

export interface VehicleReport {
  id: string;
  companyId: string;
  vehicleId: string;
  reporterId: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  resolutionNote?: string;
  /** Storage'daki fotoğraf dosya yolları (report-photos bucket). En fazla 3. */
  photoPaths: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  // join'lerden gelen (opsiyonel)
  vehiclePlate?: string;
  vehicleName?: string;
  reporterName?: string;
  reporterDepartment?: string;
}

export interface VehicleReportLog {
  id: string;
  reportId: string;
  companyId: string;
  actorId: string;
  fromStatus?: ReportStatus;
  toStatus?: ReportStatus;
  note: string;
  createdAt: string;
  actorName?: string;
}

// ─── Kullanıcı Geri Bildirimleri ──────────────────────────────
export type FeedbackType = "bug" | "suggestion" | "other";
export type FeedbackStatus = "new" | "seen" | "resolved";

export interface Feedback {
  id: string;
  companyId: string;
  userId: string;
  type: FeedbackType;
  message: string;
  /** Geri bildirimin gönderildiği sayfa (bağlam). */
  pageUrl?: string;
  status: FeedbackStatus;
  createdAt: string;
  // join'den gelen (opsiyonel)
  userName?: string;
}

// ─── Servis Sağlayıcı Defteri ─────────────────────────────────
export interface ServiceProvider {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

// ─── Audit Log / Aktivite Geçmişi ─────────────────────────────
export interface AuditLog {
  id: string;
  companyId: string;
  actorId?: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface FleetAlert {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: "insurance" | "green-card" | "inspection" | "maintenance" | "tire" | "traffic-fine";
}

/** Haftalık kilometre takip kaydı (kilometer_logs). */
export interface KilometerLog {
  id: string;
  companyId: string;
  vehicleId: string;
  userId: string;
  kilometerValue: number;
  previousKilometer?: number;
  photoUrl?: string;
  createdAt: string;
  vehiclePlate?: string;
  userName?: string;
}

/** Atanan araç özeti — magic link formunda plaka seçimi için. */
export interface KilometerLogVehicleOption {
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  previousKilometer: number;
  /** Bu token döneminde bu araç için km girilmiş mi. */
  alreadySubmitted?: boolean;
}

/** Magic link token bağlamı — form sayfasında gösterilir. */
export interface KilometerLogTokenContext {
  token: string;
  expiresAt: string;
  /** Atanan araçlar (1+). Birden fazlaysa formda plaka seçilir. */
  vehicles: KilometerLogVehicleOption[];
}

// ─── Trafik Cezaları ───────────────────────────────────────────
export type TrafficFineStatus = "unpaid" | "paid" | "objected" | "cancelled";

export interface TrafficFine {
  id: string;
  companyId: string;
  vehicleId: string;
  /** Cezanın yansıtıldığı sürücü — atanmamışsa undefined. */
  driverId?: string;
  fineNumber: string;
  violationType: string;
  amount: number;
  /** Peşin/erken ödeme indirimli tutar — opsiyonel. */
  discountedAmount?: number;
  fineDate: string;
  /** Son ödeme tarihi — geçmişse/yaklaşıyorsa filo uyarılarında görünür. */
  dueDate?: string;
  location?: string;
  status: TrafficFineStatus;
  paidAt?: string;
  /** Tebligat fotoğrafı (traffic-fine-photos bucket) dosya yolu. */
  photoPath?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // join'lerden gelen (opsiyonel)
  vehiclePlate?: string;
  vehicleName?: string;
  driverName?: string;
}

export type DocumentType = "ruhsat" | "trafik_sigortasi" | "kasko" | "muayene" | "egzoz" | "teslim" | "diger";

export interface VehicleDocument {
  id: string;
  companyId: string;
  vehicleId: string;
  type: DocumentType;
  title: string;
  filePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expiryDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
