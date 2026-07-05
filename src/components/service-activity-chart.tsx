"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceRecord } from "@/lib/types";

interface Props {
  records: ServiceRecord[];
}

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export function ServiceActivityChart({ records }: Props) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const counts = months.map(({ year, month }) =>
    records.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length
  );

  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const thisMonth = counts[counts.length - 1] ?? 0;
  const prevMonth = counts[counts.length - 2] ?? 0;
  const trend = thisMonth - prevMonth;

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Servis Aktivitesi</p>
          </div>
          <span className="text-[10px] text-muted-foreground">son 6 ay</span>
        </div>

        <div className="flex items-end justify-between gap-2 flex-1 min-h-[72px] pt-2">
          {counts.map((count, i) => {
            const heightPct = Math.max(6, (count / max) * 100);
            const isLast = i === counts.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-mono text-muted-foreground">{count > 0 ? count : ""}</span>
                <div className="w-full h-full flex items-end">
                  <motion.div
                    className={`w-full rounded-t-md ${isLast ? "bg-primary" : "bg-primary/25"}`}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: heightPct / 100 }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ originY: 1, transformOrigin: "bottom", height: "100%" }}
                  />
                </div>
                <span className="text-[9px] font-mono uppercase text-muted-foreground">{MONTH_LABELS[months[i].month]}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
          <span className="text-muted-foreground">Toplam {total} kayıt</span>
          {trend !== 0 && (
            <span className={`font-semibold ${trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {trend > 0 ? `+${trend} bu ay` : `${trend} bu ay`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
