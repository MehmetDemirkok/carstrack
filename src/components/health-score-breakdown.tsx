"use client";

import { motion } from "framer-motion";
import { Shield, Calendar, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { calculateHealthScoreBreakdown } from "@/lib/store";
import type { Vehicle } from "@/lib/types";

interface Props {
  vehicles: Vehicle[];
}

const rows = [
  { key: "insurance" as const, label: "Sigorta", weight: "15%", Icon: Shield },
  { key: "inspection" as const, label: "Muayene", weight: "15%", Icon: Calendar },
  { key: "maintenance" as const, label: "Bakım", weight: "70%", Icon: Wrench },
];

function scoreColor(score: number) {
  if (score >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 50) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

export function HealthScoreBreakdown({ vehicles }: Props) {
  if (vehicles.length === 0) return null;

  const breakdowns = vehicles.map((v) => calculateHealthScoreBreakdown(v));
  const avg = (key: "insurance" | "inspection" | "maintenance") =>
    Math.round(breakdowns.reduce((sum, b) => sum + b[key], 0) / breakdowns.length);

  const scores = {
    insurance: avg("insurance"),
    inspection: avg("inspection"),
    maintenance: avg("maintenance"),
  };

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Skor Dağılımı</p>
          <span className="text-[10px] text-muted-foreground">ağırlıklı ortalama</span>
        </div>
        <div className="space-y-3.5">
          {rows.map(({ key, label, weight, Icon }, i) => {
            const score = scores[key];
            const { bar, text } = scoreColor(score);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-muted/60">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">{weight}</span>
                  </div>
                  <span className={`text-xs font-bold ${text}`}>{score}</span>
                </div>
                <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${bar}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: score / 100 }}
                    transition={{ duration: 0.8, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ originX: 0, transformOrigin: "left" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
