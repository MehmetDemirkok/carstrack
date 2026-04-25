"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHealthScore } from "@/lib/store";
import type { Vehicle } from "@/lib/types";

interface Props {
  vehicles: Vehicle[];
}

export function FleetRiskOverview({ vehicles }: Props) {
  if (vehicles.length === 0) return null;

  const scores = vehicles.map((v) => calculateHealthScore(v));
  const good = scores.filter((s) => s >= 85).length;
  const fair = scores.filter((s) => s >= 65 && s < 85).length;
  const poor = scores.filter((s) => s < 65).length;
  const total = vehicles.length;

  const tiers = [
    { label: "İyi Durumda", count: good, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Dikkat Gerektiriyor", count: fair, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { label: "Kritik", count: poor, color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  ];

  const allGood = poor === 0 && fair === 0;

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Filo Risk Dağılımı</p>
          <span className="text-[10px] text-muted-foreground">{total} araç</span>
        </div>

        {allGood ? (
          <div className="flex items-center gap-2.5 py-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">Filonuz mükemmel durumda</span>
          </div>
        ) : (
          <div className="space-y-3">
            {tiers.map(({ label, count, color, textColor, bg }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`text-xs font-bold w-5 text-right shrink-0 ${textColor}`}>{count}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">{label}</span>
                  </div>
                  <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${color}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: total > 0 ? count / total : 0 }}
                      transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                      style={{ originX: 0, transformOrigin: "left" }}
                    />
                  </div>
                </div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${bg} ${textColor}`}>
                  {total > 0 ? Math.round((count / total) * 100) : 0}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
