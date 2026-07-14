"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3, Wallet, TrendingDown, TrendingUp, Route, Car,
  FileDown, ChevronRight, AlertCircle, Gauge,
} from "lucide-react";
import { useData } from "@/context/data-context";
import { getTasks } from "@/lib/db";
import type { VehicleTask } from "@/lib/types";
import {
  type AnalyticsRange, RANGE_LABELS, formatTRY, formatKm,
  filterRecordsByRange, filterTasksByRange, monthlyCostSeries, costByType,
  costByVehicle, distanceByVehicle, computeSummary, getRenewals,
} from "@/lib/analytics";
import { exportFleetStatusPDF } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DocumentAutomation } from "@/components/document-automation";
import { FleetRiskOverview } from "@/components/fleet-risk-overview";
import { FleetComposition } from "@/components/fleet-composition";
import { CostTrendChart } from "@/components/analytics/cost-trend-chart";
import { CostTypeDonut } from "@/components/analytics/cost-type-donut";
import { CostByVehicle } from "@/components/analytics/cost-by-vehicle";
import { DistanceChart } from "@/components/analytics/distance-chart";
import { RenewalTimeline } from "@/components/analytics/renewal-timeline";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const RANGES: AnalyticsRange[] = ["3m", "6m", "12m", "all"];

export default function AnalyticsPage() {
  const { vehicles, records } = useData();
  const [range, setRange] = useState<AnalyticsRange>("6m");
  const [tasks, setTasks] = useState<VehicleTask[]>([]);

  // Görevleri (mesafe verisi) bir kez çek — hata olursa mesafe bölümleri gizlenir
  useEffect(() => {
    let cancelled = false;
    getTasks({ status: "completed" })
      .then((t) => { if (!cancelled) setTasks(t); })
      .catch(() => { if (!cancelled) setTasks([]); });
    return () => { cancelled = true; };
  }, []);

  const a = useMemo(() => {
    const recordsInRange = filterRecordsByRange(records, range);
    const tasksInRange = filterTasksByRange(tasks, range);
    return {
      recordsInRange,
      tasksInRange,
      monthly: monthlyCostSeries(records, range),
      types: costByType(recordsInRange),
      vehicleCosts: costByVehicle(recordsInRange, vehicles, tasksInRange),
      distances: distanceByVehicle(tasksInRange, vehicles),
      summary: computeSummary(recordsInRange, vehicles, tasksInRange, records, range),
      renewals: getRenewals(vehicles),
    };
  }, [records, tasks, vehicles, range]);

  const s = a.summary;
  const hasVehicles = vehicles.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5 pb-28">
      {/* ── Başlık + kontroller ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-outfit font-bold tracking-tight">Filo Analitiği</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Maliyet, mesafe ve belge içgörüleri</p>
        </div>
        {hasVehicles && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Zaman aralığı seçici */}
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-muted/60 border border-border/40">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    range === r ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-9 w-9 shadow-sm border-border/50 shrink-0"
                    onClick={() => exportFleetStatusPDF(vehicles)}
                  />
                }
              >
                <FileDown className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>PDF Raporu İndir</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {!hasVehicles ? (
        <div className="text-center py-16 flex flex-col items-center gap-4">
          <div className="p-5 bg-mesh rounded-3xl shadow-lg shadow-primary/20">
            <BarChart3 className="h-10 w-10 text-primary-foreground/80" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold">Henüz Araç Yok</p>
            <p className="text-sm text-muted-foreground max-w-xs">Analitik veriler için önce araçlarınızı ekleyin.</p>
          </div>
          <Link href="/vehicles/new">
            <span className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
              Araç ekle <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
          {/* ── KPI kartları ── */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile
              icon={Wallet}
              label="Toplam Harcama"
              value={formatTRY(s.totalCost)}
              accent="text-primary"
              bg="bg-primary/10"
              trend={s.costTrendPct}
            />
            <KpiTile
              icon={AlertCircle}
              label="Ödenmemiş"
              value={formatTRY(s.unpaidCost)}
              sub={`${s.unpaidCount} kayıt`}
              accent="text-red-500"
              bg="bg-red-500/10"
            />
            <KpiTile
              icon={Car}
              label="Araç Başı Ort."
              value={formatTRY(s.avgCostPerVehicle)}
              sub={`${vehicles.length} araç · ${s.recordCount} servis`}
              accent="text-violet-500"
              bg="bg-violet-500/10"
            />
            {s.totalDistance > 0 ? (
              <KpiTile
                icon={Route}
                label="Toplam Mesafe"
                value={formatKm(s.totalDistance)}
                sub={s.costPerKm !== null ? `₺${s.costPerKm.toFixed(2)}/km` : undefined}
                subIcon={s.costPerKm !== null ? Gauge : undefined}
                accent="text-emerald-500"
                bg="bg-emerald-500/10"
              />
            ) : (
              <KpiTile
                icon={Route}
                label="Toplam Mesafe"
                value="—"
                sub="görev kaydı yok"
                accent="text-emerald-500"
                bg="bg-emerald-500/10"
              />
            )}
          </motion.div>

          {/* ── Harcama trendi + dağılım ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <motion.div variants={fadeUp} className="lg:col-span-3">
              <CostTrendChart data={a.monthly} rangeLabel={RANGE_LABELS[range]} />
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <CostTypeDonut slices={a.types} />
            </motion.div>
          </div>

          {/* ── Araç maliyeti + mesafe ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div variants={fadeUp}>
              <CostByVehicle rows={a.vehicleCosts} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <DistanceChart rows={a.distances} totalDistance={s.totalDistance} />
            </motion.div>
          </div>

          {/* ── Belge takvimi + filo sağlık dağılımı ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div variants={fadeUp}>
              <RenewalTimeline items={a.renewals} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FleetRiskOverview vehicles={vehicles} />
            </motion.div>
          </div>

          {/* ── Filo kompozisyonu ── */}
          <motion.div variants={fadeUp}>
            <FleetComposition vehicles={vehicles} />
          </motion.div>

          {/* ── Belge otomasyonu ── */}
          <motion.div variants={fadeUp}>
            <DocumentAutomation vehicles={vehicles} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// ─── KPI kartı ────────────────────────────────────────────────
interface KpiProps {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  subIcon?: typeof Gauge;
  accent: string;
  bg: string;
  trend?: number | null;
}

function KpiTile({ icon: Icon, label, value, sub, subIcon: SubIcon, accent, bg, trend }: KpiProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-sm p-4 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className={`p-1.5 rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        {trend !== undefined && trend !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              trend > 0
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {trend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {Math.abs(Math.round(trend))}%
          </span>
        )}
      </div>
      <div>
        <p className="text-lg font-bold font-outfit tracking-tight leading-none truncate">{value}</p>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            {SubIcon && <SubIcon className="h-2.5 w-2.5" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
