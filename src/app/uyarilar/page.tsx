"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield, Wrench, Disc3, Calendar, Gavel, Fuel, ChevronRight, BellRing,
} from "lucide-react";
import { useData } from "@/context/data-context";
import { getFleetAlerts, getTrafficFineAlerts } from "@/lib/store";
import { getFuelConsumptionAlerts } from "@/lib/fuel";
import { getFuelVehicleLatest, getFuelVehicleStats, getFuelAnomalyThreshold } from "@/lib/db";
import type { FleetAlert } from "@/lib/types";

const severityOrder = { critical: 0, warning: 1, info: 2 };

const severityStyle = {
  critical: "bg-red-500/5 border-red-500/25 dark:bg-red-500/10",
  warning: "bg-orange-500/5 border-orange-500/25 dark:bg-orange-500/10",
  info: "bg-violet-500/5 border-violet-500/25 dark:bg-violet-500/10",
} as const;
const severityIconStyle = {
  critical: "bg-red-500/15 text-red-500",
  warning: "bg-orange-500/15 text-orange-500",
  info: "bg-violet-500/15 text-violet-500",
} as const;
const severityLabel = { critical: "Kritik", warning: "Uyarı", info: "Bilgi" } as const;

const categoryIcon = {
  insurance: Shield,
  "green-card": Shield,
  inspection: Calendar,
  maintenance: Wrench,
  tire: Disc3,
  "traffic-fine": Gavel,
  fuel: Fuel,
};

type Filter = "all" | "critical" | "warning";

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}

function AlertsContent() {
  const searchParams = useSearchParams();
  const { vehicles, fines, loading } = useData();
  const [fuelAlerts, setFuelAlerts] = useState<FleetAlert[]>([]);
  const [filter, setFilter] = useState<Filter>(() => {
    const durum = searchParams.get("durum");
    if (durum === "kritik" || durum === "critical") return "critical";
    if (durum === "uyari" || durum === "warning") return "warning";
    return "all";
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [latest, stats, threshold] = await Promise.all([
          getFuelVehicleLatest(),
          getFuelVehicleStats(),
          getFuelAnomalyThreshold(),
        ]);
        if (!cancelled) setFuelAlerts(getFuelConsumptionAlerts(latest, stats, threshold));
      } catch {
        if (!cancelled) setFuelAlerts([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const alerts = useMemo<FleetAlert[]>(
    () =>
      [...getFleetAlerts(vehicles), ...getTrafficFineAlerts(fines), ...fuelAlerts].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
      ),
    [vehicles, fines, fuelAlerts],
  );

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 } as Record<string, number>;
    for (const a of alerts) c[a.severity] = (c[a.severity] ?? 0) + 1;
    return c;
  }, [alerts]);

  const visible = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="relative min-h-[100dvh]">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-4 py-6 pb-32 space-y-6">

      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
          <BellRing className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-outfit font-bold">Uyarı Merkezi</h1>
          <p className="text-sm text-muted-foreground">Filonuzdaki kritik uyarılar ve bakım gerektiren durumlar</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "critical" as const, label: "Kritik", color: "text-red-500", bg: "bg-red-500/10" },
          { key: "warning" as const, label: "Uyarı", color: "text-orange-500", bg: "bg-orange-500/10" },
          { key: "info" as const, label: "Bilgi", color: "text-violet-500", bg: "bg-violet-500/10" },
        ].map((s) => (
          <div key={s.key} className="rounded-2xl border border-border/40 bg-card p-4 text-center">
            <p className={`text-2xl font-bold font-outfit ${s.color}`}>{counts[s.key]}</p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {[
          { key: "all" as const, label: `Tümü (${alerts.length})` },
          { key: "critical" as const, label: `Kritik (${counts.critical})` },
          { key: "warning" as const, label: `Uyarı (${counts.warning})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-9 rounded-xl px-3 text-xs font-semibold border transition-colors ${
              filter === f.key
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {filter === "critical" ? "Kritik uyarı yok" : filter === "warning" ? "Uyarı yok" : "Aktif uyarı yok"}
          </p>
          <p className="text-xs mt-1">Filonuzda dikkat gerektiren bir durum bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((alert) => {
            const Icon = categoryIcon[alert.category];
            const accentBar = alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-orange-500" : "bg-primary";
            return (
              <Link key={alert.id} href={`/vehicles/${alert.vehicleId}`} className="block tap-highlight-transparent">
                <motion.div
                  whileTap={{ scale: 0.99 }}
                  className={`relative p-4 pl-5 rounded-2xl border flex gap-3 items-start transition-all cursor-pointer overflow-hidden hover-lift ${severityStyle[alert.severity]}`}
                >
                  <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${accentBar}`} />
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${severityIconStyle[alert.severity]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${alert.severity === "critical" ? "text-red-500" : alert.severity === "warning" ? "text-orange-500" : "text-violet-500"}`}>
                          {severityLabel[alert.severity]}
                        </span>
                        <h3 className="font-semibold text-sm truncate">{alert.title}</h3>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground shrink-0">{alert.vehiclePlate}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-2">
                      Aracı görüntüle <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
