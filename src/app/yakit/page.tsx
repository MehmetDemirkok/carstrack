"use client";

import { motion } from "framer-motion";
import { Fuel } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { isDriverRole } from "@/lib/types";
import { DriverFuelView } from "@/components/fuel/driver-fuel-view";
import { ManagerFuelDashboard } from "@/components/fuel/manager-fuel-dashboard";

export default function FuelPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isDriver = isDriverRole(profile?.role);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
          <Fuel className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isDriver ? "Yakıtım" : "Yakıt Yönetimi"}</h1>
          <p className="text-sm text-muted-foreground">
            {isDriver
              ? "Aldığınız yakıtı kaydedin ve geçmişinizi görüntüleyin"
              : "Filo genelinde yakıt maliyeti, tüketim ve anomali takibi"}
          </p>
        </div>
      </motion.div>

      {isDriver ? <DriverFuelView /> : <ManagerFuelDashboard />}
    </div>
  );
}
