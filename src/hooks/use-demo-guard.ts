"use client";

import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

const DEMO_EMAIL = "demo@carstrack.app";

export function useDemoGuard() {
  const { user } = useAuth();

  return function guardDemo(): boolean {
    if (user?.email !== DEMO_EMAIL) return false;

    toast.warning("Demo Hesabı", {
      description: "Demo hesabında değişiklik yapılamaz.",
      action: {
        label: "Kayıt Ol",
        onClick: () => { window.location.href = "/register"; },
      },
      duration: 5000,
    });

    return true;
  };
}
