"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Wallet, ChevronRight, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTRY, type VehicleCostRow } from "@/lib/analytics";

interface Props {
  rows: VehicleCostRow[];
}

export function CostByVehicle({ rows }: Props) {
  const withCost = rows.filter((r) => r.total > 0);
  const max = Math.max(1, ...withCost.map((r) => r.total));
  const shown = withCost.slice(0, 6);

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wallet className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Araç Bazında Maliyet</p>
          </div>
          <span className="text-[10px] text-muted-foreground">en çok harcayan</span>
        </div>

        {withCost.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 min-h-[140px] text-muted-foreground">
            <Wallet className="h-8 w-8 opacity-30" />
            <p className="text-xs">Bu dönemde araç maliyeti yok.</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2.5">
            {shown.map((r, i) => {
              const pct = (r.total / max) * 100;
              return (
                <Link key={r.vehicleId} href={`/vehicles/${r.vehicleId}`} className="block group">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-outfit font-bold tracking-tight">{r.plate}</span>
                        <span className="text-muted-foreground truncate">{r.name}</span>
                        {r.costPerKm !== null && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono bg-muted/60 text-muted-foreground rounded-full px-1.5 py-0.5 shrink-0">
                            <Gauge className="h-2.5 w-2.5" />
                            ₺{r.costPerKm.toFixed(2)}/km
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold shrink-0 group-hover:text-primary transition-colors">
                        {formatTRY(r.total)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: pct / 100 }}
                        transition={{ duration: 0.7, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{ originX: 0, transformOrigin: "left" }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
            {withCost.length > shown.length && (
              <Link href="/history" className="flex items-center justify-center gap-1 text-[10px] text-primary font-medium pt-1 hover:underline">
                {withCost.length - shown.length} araç daha <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
