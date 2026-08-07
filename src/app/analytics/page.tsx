"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { BarChart3, ChevronRight, FileDown } from "lucide-react";
import { useData } from "@/context/data-context";
import { getTasks } from "@/lib/db";
import type { VehicleTask } from "@/lib/types";
import {
  type AnalyticsRange,
  RANGE_LABELS,
  filterRecordsByRange,
  filterTasksByRange,
  monthlyCostSeries,
  costByType,
  costByVehicle,
  distanceByVehicle,
  computeSummary,
  getRenewals,
} from "@/lib/analytics";
import { calculateHealthScore, getFleetAlerts } from "@/lib/store";
import { exportFleetStatusPDF } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FleetCommand } from "@/components/analytics/fleet-command";
import { AttentionRail, type AttentionItem } from "@/components/analytics/attention-rail";
import { SpendCanvas } from "@/components/analytics/spend-canvas";
import { CostBreakdown } from "@/components/analytics/cost-breakdown";
import { CostLeaders } from "@/components/analytics/cost-leaders";
import { FleetPulse } from "@/components/analytics/fleet-pulse";
import { DocUrgency } from "@/components/analytics/doc-urgency";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { cn } from "@/lib/utils";

const RANGES: AnalyticsRange[] = ["3m", "6m", "12m", "all"];

export default function AnalyticsPage() {
  const { vehicles, records, loading } = useData();
  const [range, setRange] = useState<AnalyticsRange>("6m");
  const [tasks, setTasks] = useState<VehicleTask[]>([]);
  const [tasksReady, setTasksReady] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    getTasks({ status: "completed" })
      .then((t) => {
        if (!cancelled) setTasks(t);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setTasksReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const a = useMemo(() => {
    const recordsInRange = filterRecordsByRange(records, range);
    const tasksInRange = filterTasksByRange(tasks, range);
    const scores = vehicles.map((v) => ({
      vehicle: v,
      score: calculateHealthScore(v),
    }));
    const fleetScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length)
        : 100;

    return {
      recordsInRange,
      tasksInRange,
      monthly: monthlyCostSeries(records, range),
      types: costByType(recordsInRange),
      vehicleCosts: costByVehicle(recordsInRange, vehicles, tasksInRange),
      distances: distanceByVehicle(tasksInRange, vehicles),
      summary: computeSummary(recordsInRange, vehicles, tasksInRange, records, range),
      renewals: getRenewals(vehicles),
      fleetScore,
      goodCount: scores.filter((s) => s.score >= 85).length,
      fairCount: scores.filter((s) => s.score >= 65 && s.score < 85).length,
      poorCount: scores.filter((s) => s.score < 65).length,
      lowHealth: scores.filter((s) => s.score < 85).sort((a, b) => a.score - b.score),
    };
  }, [records, tasks, vehicles, range]);

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];
    const seenVehicles = new Set<string>();

    for (const doc of a.renewals.filter((r) => r.days <= 30)) {
      items.push({
        id: `doc-${doc.vehicleId}-${doc.kind}`,
        href: `/vehicles/${doc.vehicleId}`,
        plate: doc.plate,
        title: doc.days < 0 ? `${doc.label} süresi doldu` : `${doc.label} bitiyor`,
        detail:
          doc.days < 0
            ? `${Math.abs(doc.days)} gün gecikmiş`
            : `${doc.days} gün kaldı${doc.company ? ` · ${doc.company}` : ""}`,
        severity: doc.days <= 14 ? "critical" : "warning",
        kind: "document",
      });
      seenVehicles.add(doc.vehicleId);
    }

    for (const alert of getFleetAlerts(vehicles)) {
      if (
        alert.category === "insurance" ||
        alert.category === "inspection" ||
        alert.category === "green-card"
      ) {
        continue;
      }
      items.push({
        id: `alert-${alert.id}`,
        href: `/vehicles/${alert.vehicleId}`,
        plate: alert.vehiclePlate,
        title: alert.title,
        detail: alert.description.slice(0, 90),
        severity:
          alert.severity === "critical"
            ? "critical"
            : alert.severity === "warning"
              ? "warning"
              : "info",
        kind: "maintenance",
      });
      seenVehicles.add(alert.vehicleId);
    }

    for (const { vehicle, score } of a.lowHealth) {
      if (seenVehicles.has(vehicle.id) && score >= 65) continue;
      if (items.some((i) => i.id === `health-${vehicle.id}`)) continue;
      items.push({
        id: `health-${vehicle.id}`,
        href: `/vehicles/${vehicle.id}`,
        plate: vehicle.plate,
        title: `Sağlık skoru ${score}`,
        detail: `${vehicle.brand} ${vehicle.model}`.trim(),
        severity: score < 65 ? "critical" : "warning",
        kind: "health",
      });
    }

    const rank = { critical: 0, warning: 1, info: 2 };
    return items.sort((x, y) => rank[x.severity] - rank[y.severity]).slice(0, 8);
  }, [a.renewals, a.lowHealth, vehicles]);

  const hasVehicles = vehicles.length > 0;
  const showSkeleton = loading || !tasksReady;

  const stagger = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduce ? 0 : 0.06 },
    },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-8">
      {/* ── Page chrome ── */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            Analitik
          </p>
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Filo Analitiği
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
            Sağlık, maliyet ve belgeler — filonuzun durumunu tek bakışta görün.
          </p>
        </div>

        {hasVehicles && (
          <div className="flex items-center gap-2 shrink-0">
            <div
              role="tablist"
              aria-label="Zaman aralığı"
              className="inline-flex items-center gap-0.5 p-1 rounded-2xl bg-muted/70 ring-1 ring-border/50"
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    range === r
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
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
                    className="rounded-2xl h-10 w-10 shadow-sm border-border/50 shrink-0"
                    onClick={() => exportFleetStatusPDF(vehicles)}
                    aria-label="PDF raporu indir"
                  />
                }
              >
                <FileDown className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>PDF Raporu İndir</TooltipContent>
            </Tooltip>
          </div>
        )}
      </header>

      {showSkeleton ? (
        <AnalyticsSkeleton />
      ) : !hasVehicles ? (
        <EmptyFleet />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-12 gap-4 sm:gap-5"
        >
          <motion.div variants={fadeUp} className="col-span-12 lg:col-span-8 min-h-0">
            <FleetCommand
              fleetScore={a.fleetScore}
              vehicleCount={vehicles.length}
              goodCount={a.goodCount}
              fairCount={a.fairCount}
              poorCount={a.poorCount}
              summary={a.summary}
              rangeLabel={RANGE_LABELS[range]}
            />
          </motion.div>
          <motion.div variants={fadeUp} className="col-span-12 lg:col-span-4 min-h-0">
            <AttentionRail items={attentionItems} urgentDocs={a.renewals} />
          </motion.div>

          <motion.div variants={fadeUp} className="col-span-12 lg:col-span-8">
            <SpendCanvas data={a.monthly} rangeLabel={RANGE_LABELS[range]} />
          </motion.div>
          <motion.div variants={fadeUp} className="col-span-12 lg:col-span-4">
            <CostBreakdown slices={a.types} />
          </motion.div>

          <motion.div variants={fadeUp} className="col-span-12 lg:col-span-7">
            <CostLeaders rows={a.vehicleCosts} />
          </motion.div>
          <motion.div variants={fadeUp} className="col-span-12 lg:col-span-5">
            <FleetPulse
              distances={a.distances}
              totalDistance={a.summary.totalDistance}
              vehicles={vehicles}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="col-span-12">
            <DocUrgency items={a.renewals} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function EmptyFleet() {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-card ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm">
      <div className="absolute inset-0 bg-mesh-soft opacity-80" aria-hidden />
      <div className="relative flex flex-col items-center text-center gap-5 px-6 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-mesh shadow-lg shadow-primary/25">
          <BarChart3 className="h-8 w-8 text-primary-foreground/90" />
        </div>
        <div className="space-y-2 max-w-sm">
          <p className="font-outfit text-xl font-bold tracking-tight">Filo henüz boş</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Analitik görünümü araç ve servis kayıtlarınızla dolacak. İlk aracınızı ekleyerek başlayın.
          </p>
        </div>
        <Link
          href="/vehicles/new"
          className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Araç ekle
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
