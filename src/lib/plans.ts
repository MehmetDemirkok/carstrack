import type { PlanType } from "@/lib/types";

export interface PlanDefinition {
  id: PlanType;
  name: string;
  badge: string;
  price: number;
  yearlyPrice: number;
  vehicleLimit: number;
  userLimit: number;
  color: string;
  features: string[];
  notFeatures: string[];
}

export const PLANS: Record<PlanType, PlanDefinition> = {
  free: {
    id: "free",
    name: "Ücretsiz",
    badge: "Başlangıç",
    price: 0,
    yearlyPrice: 0,
    vehicleLimit: 2,
    userLimit: 3,
    color: "#6b7280",
    features: [
      "2 araç",
      "3 kullanıcı (1 şirket yetkilisi + 2 sürücü)",
      "Bakım takibi",
      "Sigorta & muayene takibi",
      "Servis geçmişi",
      "Temel filo özeti",
    ],
    notFeatures: [
      "PDF & Excel export",
      "E-posta bildirimleri",
      "Gelişmiş analitik",
      "Öncelikli destek",
    ],
  },
  pro: {
    id: "pro",
    name: "Profesyonel",
    badge: "En Popüler",
    price: 299,
    yearlyPrice: 2_490,
    vehicleLimit: 10,
    userLimit: 10,
    color: "#6366f1",
    features: [
      "10 araç",
      "10 kullanıcı",
      "Bakım takibi",
      "Sigorta & muayene takibi",
      "Servis geçmişi",
      "PDF & Excel export",
      "E-posta bildirimleri",
      "Gelişmiş filo analizi",
      "Öncelikli destek",
    ],
    notFeatures: [],
  },
  fleet: {
    id: "fleet",
    name: "Filo",
    badge: "Şirketler İçin",
    price: 799,
    yearlyPrice: 6_990,
    vehicleLimit: Infinity,
    userLimit: Infinity,
    color: "#0ea5e9",
    features: [
      "Sınırsız araç",
      "Sınırsız kullanıcı",
      "Tüm Profesyonel özellikler",
      "API erişimi",
      "Özel onboarding",
      "SLA garantisi",
      "Fatura & KDV desteği",
    ],
    notFeatures: [],
  },
};

export function getPlan(plan: PlanType): PlanDefinition {
  return PLANS[plan] ?? PLANS.free;
}

export function canAddVehicle(plan: PlanType, currentCount: number): boolean {
  return currentCount < getPlan(plan).vehicleLimit;
}

export function canAddUser(plan: PlanType, currentCount: number): boolean {
  return currentCount < getPlan(plan).userLimit;
}

export function isFeatureAllowed(plan: PlanType, feature: "export" | "email" | "analytics" | "api"): boolean {
  if (plan === "free") return false;
  if (feature === "api") return plan === "fleet";
  return true;
}

export function isPaidPlan(plan: PlanType): boolean {
  return plan === "pro" || plan === "fleet";
}
