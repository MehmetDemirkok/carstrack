export type UserRole = "manager" | "driver";
export type PlanType = "free" | "pro" | "fleet";

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  inviteCode?: string;
  plan: PlanType;
  planExpiresAt?: string;
  paytrOrderId?: string;
}

export interface Profile {
  id: string;
  companyId: string;
  role: UserRole;
  fullName: string;
  department: string;
  avatarUrl?: string;
  notifyByEmail: boolean;
  telegramChatId?: string;
  createdAt: string;
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
  imagePosition?: number;
  imagePositionX?: number;
  imageZoom?: number;
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

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  date: string;
  type: ServiceType;
  title: string;
  mileage: number;
  serviceCenter: string;
  notes: string;
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
}

export interface FleetAlert {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleName: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: "insurance" | "green-card" | "inspection" | "maintenance" | "tire";
}

export type DocumentType = "ruhsat" | "trafik_sigortasi" | "kasko" | "muayene" | "egzoz" | "diger";

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
