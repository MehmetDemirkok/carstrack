"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  TrendingDown, TrendingUp, Wallet, AlertCircle, Route, Car,
} from "lucide-react";
import { HealthRing } from "./health-ring";
import { Panel } from "./panel";
import { formatTRY, formatKm, type AnalyticsSummary } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Props {
  fleetScore: number;
  vehicleCount: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
  summary: AnalyticsSummary;
  rangeLabel: string;
}

function statusCopy(score: number) {
  if (score >= 85) return { title: "Filonuz sağlam", body: "Belgeler ve bakım planı kontrol altında." };
  if (score >= 65) return { title: "Dikkat gereken noktalar var", body: "Birkaç araç veya belge yakında müdahale isteyecek." };
  return { title: "Acil aksiyon gerekli", body: "Kritik belge veya bakım kalemleri filoyu aşağı çekiyor." };
}

export function FleetCommand({
  fleetScore,
  vehicleCount,
  goodCount,
  fairCount,
  poorCount,
  summary,
  rangeLabel,
}: Props) {
  const reduce = useReducedMotion();
  const status = statusCopy(fleetScore);
  const trend = summary.costTrendPct;

  return (
    <Panel
      padded={false}
      className="bg-mesh-soft h-full"
      aria-labelledby="fleet-command-title"
    >
      <div className="relative p-6 sm:p-8">
        {/* Ambient orb */}
        <div
          className="orb w-64 h-64 -top-24 -right-16 bg-primary/20 animate-float-slow"
          aria-hidden
        />

        <div className="relative grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-8 items-center">
          <HealthRing score={fleetScore} size={172} stroke={11} />

          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Filo nabzı · {vehicleCount} araç
              </p>
              <h2
                id="fleet-command-title"
                className="font-outfit text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
              >
                {status.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
                {status.body}
              </p>
            </div>

            {/* Health tier pills */}
            <div className="flex flex-wrap gap-2" role="list" aria-label="Sağlık dağılımı">
              <TierPill tone="good" count={goodCount} label="İyi" />
              <TierPill tone="fair" count={fairCount} label="Dikkat" />
              <TierPill tone="poor" count={poorCount} label="Kritik" />
            </div>
          </div>
        </div>

        {/* Spend hero strip */}
        <div className="relative mt-8 pt-7 border-t border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  Toplam harcama · {rangeLabel}
                </p>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <motion.p
                  className="font-outfit text-4xl sm:text-5xl font-bold tracking-tighter tabular-nums text-foreground"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.45, delay: 0.2 }}
                >
                  {formatTRY(summary.totalCost)}
                </motion.p>
                {trend !== null && trend !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      trend > 0
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend > 0 ? "+" : ""}
                    {Math.round(trend)}% önceki dönem
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full sm:w-auto">
              <MicroStat
                icon={AlertCircle}
                label="Ödenmemiş"
                value={formatTRY(summary.unpaidCost)}
                warn={summary.unpaidCost > 0}
              />
              <MicroStat
                icon={Car}
                label="Araç başı"
                value={formatTRY(summary.avgCostPerVehicle)}
              />
              <MicroStat
                icon={Route}
                label="Mesafe"
                value={summary.totalDistance > 0 ? formatKm(summary.totalDistance) : "—"}
              />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TierPill({
  tone,
  count,
  label,
}: {
  tone: "good" | "fair" | "poor";
  count: number;
  label: string;
}) {
  const styles = {
    good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    fair: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    poor: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  const dots = {
    good: "bg-emerald-500",
    fair: "bg-amber-500",
    poor: "bg-red-500",
  };
  return (
    <span
      role="listitem"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        styles[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />
      {count} {label}
    </span>
  );
}

function MicroStat({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-background/60 dark:bg-background/40 backdrop-blur-sm px-3 py-3 ring-1 ring-border/40">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("h-3 w-3", warn ? "text-red-500" : "text-muted-foreground")} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-outfit text-sm sm:text-base font-bold tracking-tight tabular-nums truncate",
          warn && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}
