"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Route } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKm, type DistanceRow } from "@/lib/analytics";

interface Props {
  rows: DistanceRow[];
  totalDistance: number;
}

export function DistanceChart({ rows, totalDistance }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.distance));
  const shown = rows.slice(0, 6);

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Route className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mesafe Analizi</p>
              <p className="text-[10px] text-muted-foreground">toplam {formatKm(totalDistance)}</p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">görevlerden</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 min-h-[140px] text-muted-foreground">
            <Route className="h-8 w-8 opacity-30" />
            <p className="text-xs">Bu dönemde tamamlanmış görev yok.</p>
            <p className="text-[10px] opacity-70">Sürücüler görev tamamladıkça mesafe burada birikir.</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2.5">
            {shown.map((r, i) => {
              const pct = (r.distance / max) * 100;
              return (
                <Link key={r.vehicleId} href={`/vehicles/${r.vehicleId}`} className="block group">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-outfit font-bold tracking-tight">{r.plate}</span>
                        <span className="text-muted-foreground truncate">{r.name}</span>
                        <span className="text-[9px] font-mono bg-muted/60 text-muted-foreground rounded-full px-1.5 py-0.5 shrink-0">
                          {r.trips} sefer
                        </span>
                      </div>
                      <span className="font-mono font-semibold shrink-0 group-hover:text-primary transition-colors">
                        {formatKm(r.distance)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(to right, var(--chart-2), var(--chart-3))", originX: 0, transformOrigin: "left" }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: pct / 100 }}
                        transition={{ duration: 0.7, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
