"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Fuel, Route } from "lucide-react";
import { Panel, PanelHeader } from "./panel";
import { formatKm, type DistanceRow } from "@/lib/analytics";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  distances: DistanceRow[];
  totalDistance: number;
  vehicles: Vehicle[];
}

const FUEL_COLORS: Record<string, string> = {
  Benzin: "bg-amber-500",
  Dizel: "bg-slate-500",
  LPG: "bg-emerald-500",
  Hibrit: "bg-teal-500",
  Elektrik: "bg-sky-500",
};

export function FleetPulse({ distances, totalDistance, vehicles }: Props) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...distances.map((r) => r.distance));
  const shown = distances.slice(0, 4);

  const ozmal = vehicles.filter((v) => v.ownershipType === "ozmal").length;
  const kiralik = vehicles.length - ozmal;
  const fuelCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.fuelType] = (acc[v.fuelType] || 0) + 1;
    return acc;
  }, {});
  const fuelEntries = Object.entries(fuelCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Panel className="flex flex-col h-full" aria-labelledby="fleet-pulse-title">
      <PanelHeader
        eyebrow="Operasyon"
        title="Filo nabzı"
        titleId="fleet-pulse-title"
        description={totalDistance > 0 ? `Toplam ${formatKm(totalDistance)}` : "Mesafe ve kompozisyon"}
      />

      <div className="flex-1 space-y-6">
        {/* Distance leaders */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Route className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Mesafe liderleri
            </p>
          </div>

          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-2xl bg-muted/30 px-4 py-5 text-center">
              Tamamlanmış görev yok — mesafe burada birikir.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {shown.map((r, i) => (
                <li key={r.vehicleId}>
                  <Link
                    href={`/vehicles/${r.vehicleId}`}
                    className="group block space-y-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-outfit font-bold tracking-tight">{r.plate}</span>
                        <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums group-hover:text-primary transition-colors">
                        {formatKm(r.distance)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg, var(--chart-2), var(--chart-3))",
                          transformOrigin: "left",
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: r.distance / max }}
                        transition={{
                          duration: reduce ? 0 : 0.6,
                          delay: reduce ? 0 : i * 0.05,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Composition */}
        <div className="pt-5 border-t border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
              Kompozisyon
            </p>
          </div>

          {vehicles.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs mb-2">
                <span>
                  Özmal <span className="font-mono font-semibold">{ozmal}</span>
                </span>
                <span>
                  Kiralık <span className="font-mono font-semibold">{kiralik}</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex bg-muted/60 mb-4">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(ozmal / vehicles.length) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.7 }}
                />
                <motion.div
                  className="h-full bg-primary/25"
                  initial={{ width: 0 }}
                  animate={{ width: `${(kiralik / vehicles.length) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.7, delay: 0.05 }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {fuelEntries.map(([fuel, count]) => (
                  <span
                    key={fuel}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full",
                      "bg-muted/50 px-2.5 py-1 text-xs font-medium",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", FUEL_COLORS[fuel] ?? "bg-muted-foreground")} />
                    {fuel}
                    <span className="font-mono text-muted-foreground">{count}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
