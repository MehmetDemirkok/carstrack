"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { DriverReportsView } from "@/components/reports/driver-reports-view";
import { ManagerReportsView } from "@/components/reports/manager-reports-view";

function ReportsContent() {
  const { profile, loading } = useAuth();
  const searchParams = useSearchParams();
  const initialVehicleId = searchParams.get("vehicle") ?? undefined;

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
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isManager ? "Arıza Bildirimleri" : "Arıza Bildir"}</h1>
          <p className="text-sm text-muted-foreground">
            {isManager
              ? "Sürücülerden gelen arıza/durum bildirimlerini görüntüleyin ve yönetin"
              : "Araç arızalarını bildirin ve çözüm sürecini takip edin"}
          </p>
        </div>
      </motion.div>

      {isManager ? <ManagerReportsView /> : <DriverReportsView initialVehicleId={initialVehicleId} />}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
