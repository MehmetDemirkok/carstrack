import type { PlanType } from "./types";

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
    vehicleLimit: Infinity,
    userLimit: Infinity,
    color: "#6366f1",
    features: [],
    notFeatures: [],
  },
  pro: {
    id: "pro",
    name: "Profesyonel",
    badge: "Pro",
    price: 0,
    yearlyPrice: 0,
    vehicleLimit: Infinity,
    userLimit: Infinity,
    color: "#6366f1",
    features: [],
    notFeatures: [],
  },
  fleet: {
    id: "fleet",
    name: "Filo",
    badge: "Filo",
    price: 0,
    yearlyPrice: 0,
    vehicleLimit: Infinity,
    userLimit: Infinity,
    color: "#6366f1",
    features: [],
    notFeatures: [],
  },
};

export function getPlan(plan: PlanType): PlanDefinition {
  return PLANS[plan] ?? PLANS.free;
}

export function canAddVehicle(_plan: PlanType, _currentCount: number): boolean {
  return true;
}

export function canAddUser(_plan: PlanType, _currentCount: number): boolean {
  return true;
}

export function isFeatureAllowed(_plan: PlanType, _feature: "export" | "email" | "analytics" | "api"): boolean {
  return true;
}

export function isPaidPlan(_plan: PlanType): boolean {
  return true;
}
