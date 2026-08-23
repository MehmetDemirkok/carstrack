"use client";

import { motion } from "framer-motion";
import { Gavel } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { DriverFinesView } from "@/components/traffic-fines/driver-fines-view";
import { ManagerFinesView } from "@/components/traffic-fines/manager-fines-view";

export default function TrafficFinesPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isManager = profile?.role === "manager" || profile?.role === "operator";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
          <Gavel className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isManager ? "Trafik Cezaları" : "Cezalarım"}</h1>
          <p className="text-sm text-muted-foreground">
            {isManager
              ? "Filoya kesilen trafik cezalarını kaydedin, sürücüye yansıtın ve ödemeleri takip edin"
              : "Size yansıtılan trafik cezalarını ve ödeme durumlarını görüntüleyin"}
          </p>
        </div>
      </motion.div>

      {isManager ? <ManagerFinesView /> : <DriverFinesView />}
    </div>
  );
}
