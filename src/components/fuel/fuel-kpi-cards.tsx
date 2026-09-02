"use client";

import { motion } from "framer-motion";
import { Wallet, Fuel, Gauge, Coins, Route, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  formatTRY, formatTRY2, formatLiters, formatConsumption, formatCostPerKm,
  computeChange, type FuelKpiSet, type ChangeIndicator,
} from "@/lib/fuel";

interface CardDef {
  label: string;
  icon: LucideIcon;
  value: string;
  change: ChangeIndicator | null;
}

function ChangeBadge({ change }: { change: ChangeIndicator | null }) {
  if (!change || change.pct === null) return null;
  const Icon = change.direction === "up" ? ArrowUp : change.direction === "down" ? ArrowDown : Minus;
  const tone = change.direction === "flat"
    ? "bg-muted text-muted-foreground"
    : change.favorable
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "bg-red-500/10 text-red-600 dark:text-red-400";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tone}`}>
      <Icon className="h-2.5 w-2.5" />
      %{Math.abs(change.pct).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
    </span>
  );
}

export function FuelKpiCards({ current, previous }: { current: FuelKpiSet; previous: FuelKpiSet }) {
  const cards: CardDef[] = [
    {
      label: "Bu Ay Yakıt Maliyeti",
      icon: Wallet,
      value: formatTRY(current.totalCost),
      change: computeChange(current.totalCost, previous.totalCost),
    },
    {
      label: "Bu Ay Tüketim",
      icon: Fuel,
      value: formatLiters(current.totalLiters),
      change: computeChange(current.totalLiters, previous.totalLiters),
    },
    {
      label: "Ortalama Tüketim",
      icon: Gauge,
      value: formatConsumption(current.avgConsumption),
      change: current.avgConsumption != null && previous.avgConsumption != null
        ? computeChange(current.avgConsumption, previous.avgConsumption) : null,
    },
    {
      label: "Ortalama Litre Fiyatı",
      icon: Coins,
      value: current.avgPricePerLiter != null ? formatTRY2(current.avgPricePerLiter) : "—",
      change: current.avgPricePerLiter != null && previous.avgPricePerLiter != null
        ? computeChange(current.avgPricePerLiter, previous.avgPricePerLiter) : null,
    },
    {
      label: "KM Başına Yakıt Maliyeti",
      icon: Route,
      value: formatCostPerKm(current.costPerKm),
      change: current.costPerKm != null && previous.costPerKm != null
        ? computeChange(current.costPerKm, previous.costPerKm) : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          className="glass rounded-2xl p-4 border border-border/40 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <c.icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <ChangeBadge change={c.change} />
          </div>
          <div>
            <p className="text-lg md:text-xl font-bold font-outfit leading-tight tabular-nums">{c.value}</p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 leading-tight">{c.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
