"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Fuel, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFuelMetricsSince, getFuelVehicleLatest, getFuelVehicleStats, getFuelAnomalyThreshold } from "@/lib/db";
import {
  splitCurrentPreviousMonth, computeFuelKpiSet, computeChange, getFuelConsumptionAlerts,
  formatTRY, formatConsumption, type ChangeIndicator,
} from "@/lib/fuel";

interface WidgetState {
  loading: boolean;
  hasData: boolean;
  cost: number;
  change: ChangeIndicator | null;
  avgConsumption: number | null;
  anomalyCount: number;
}

/** Ana dashboard'daki küçük yakıt özeti — filoda yakıt kaydı yoksa hiç render edilmez (dashboard'u kalabalıklaştırmamak için). */
export function FuelDashboardWidget() {
  const [state, setState] = useState<WidgetState>({
    loading: true, hasData: false, cost: 0, change: null, avgConsumption: null, anomalyCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, latest, stats, threshold] = await Promise.all([
          getFuelMetricsSince(2), getFuelVehicleLatest(), getFuelVehicleStats(), getFuelAnomalyThreshold(),
        ]);
        if (cancelled) return;
        const { current, previous } = splitCurrentPreviousMonth(rows);
        const curKpi = computeFuelKpiSet(current);
        const prevKpi = computeFuelKpiSet(previous);
        const alerts = getFuelConsumptionAlerts(latest, stats, threshold);
        setState({
          loading: false,
          hasData: rows.length > 0 || latest.length > 0,
          cost: curKpi.totalCost,
          change: computeChange(curKpi.totalCost, prevKpi.totalCost),
          avgConsumption: curKpi.avgConsumption,
          anomalyCount: alerts.length,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading || !state.hasData) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-2.5 md:space-y-3">
      <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">⛽ Yakıt Durumu</h3>
      <Card className="rounded-2xl border-border/40 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Bu Ay</p>
              <p className="text-xl font-bold font-outfit leading-none">{formatTRY(state.cost)}</p>
            </div>
            {state.change && state.change.pct !== null && (
              <span className={`text-[11px] font-bold shrink-0 ${
                state.change.direction === "flat" ? "text-muted-foreground" : state.change.favorable ? "text-emerald-500" : "text-red-500"
              }`}>
                {state.change.direction === "up" ? "↑" : state.change.direction === "down" ? "↓" : "–"} %{Math.abs(state.change.pct).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
              </span>
            )}
          </div>
          {state.avgConsumption !== null && (
            <p className="text-[11px] text-muted-foreground">Ortalama {formatConsumption(state.avgConsumption)}</p>
          )}
          {state.anomalyCount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-xl px-2.5 py-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {state.anomalyCount} araç normalden fazla yakıt tüketiyor
            </div>
          )}
          <Link href="/yakit">
            <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-primary h-8 gap-1 hover:bg-primary/10">
              <Fuel className="h-3.5 w-3.5" /> Detayları Gör <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
