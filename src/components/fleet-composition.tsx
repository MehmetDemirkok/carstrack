"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Vehicle } from "@/lib/types";

interface Props {
  vehicles: Vehicle[];
}

const FUEL_COLORS: Record<string, string> = {
  Benzin: "bg-amber-500",
  Dizel: "bg-slate-500",
  LPG: "bg-emerald-500",
  Hibrit: "bg-teal-500",
  Elektrik: "bg-sky-500",
};

export function FleetComposition({ vehicles }: Props) {
  if (vehicles.length === 0) return null;
  const total = vehicles.length;

  const ozmal = vehicles.filter((v) => v.ownershipType === "ozmal").length;
  const kiralik = total - ozmal;

  const fuelCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.fuelType] = (acc[v.fuelType] || 0) + 1;
    return acc;
  }, {});
  const fuelEntries = Object.entries(fuelCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Layers className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Filo Kompozisyonu</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{total} araç</span>
        </div>

        {/* Ownership split */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-foreground">Özmal <span className="text-muted-foreground font-mono">{ozmal}</span></span>
            <span className="font-medium text-foreground">Kiralık <span className="text-muted-foreground font-mono">{kiralik}</span></span>
          </div>
          <div className="h-2 bg-muted/60 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(ozmal / total) * 100}%` }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.div
              className="h-full bg-primary/25"
              initial={{ width: 0 }}
              animate={{ width: `${(kiralik / total) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </div>

        {/* Fuel type breakdown */}
        <div className="flex-1 space-y-2 pt-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Yakıt Tipi</p>
          <div className="flex flex-wrap gap-1.5">
            {fuelEntries.map(([fuel, count], i) => (
              <motion.span
                key={fuel}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="inline-flex items-center gap-1.5 text-[10px] font-medium bg-muted/50 rounded-full pl-1.5 pr-2 py-1"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${FUEL_COLORS[fuel] || "bg-muted-foreground"}`} />
                {fuel} <span className="font-mono text-muted-foreground">{count}</span>
              </motion.span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
