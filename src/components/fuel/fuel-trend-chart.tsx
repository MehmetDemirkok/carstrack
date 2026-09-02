"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity } from "lucide-react";
import { Panel, PanelHeader } from "@/components/analytics/panel";
import { formatTRY, type MonthlyFuelPoint } from "@/lib/fuel";
import { cn } from "@/lib/utils";

interface Props {
  data: MonthlyFuelPoint[];
  rangeLabel: string;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}B`;
  return n.toLocaleString("tr-TR");
}

/** Aylık yakıt maliyeti / tüketimi — mevcut analitik sayfasındaki SpendCanvas ile aynı çubuk-grafik dilinde, tek bileşende maliyet/litre geçişli. */
export function FuelTrendChart({ data, rangeLabel }: Props) {
  const [metric, setMetric] = useState<"cost" | "liters">("cost");
  const [hovered, setHovered] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const values = data.map((d) => (metric === "cost" ? d.totalCost : d.totalLiters));
  const total = values.reduce((s, v) => s + v, 0);
  const niceMax = niceCeil(Math.max(1, ...values));
  const gridLines = [1, 0.75, 0.5, 0.25, 0].map((f) => niceMax * f);
  const active = hovered !== null ? data[hovered] : null;
  const activeValue = active ? (metric === "cost" ? active.totalCost : active.totalLiters) : null;

  return (
    <Panel className="h-full" aria-labelledby="fuel-trend-title">
      <PanelHeader
        eyebrow="Trend"
        title={metric === "cost" ? "Aylık Yakıt Maliyeti" : "Aylık Yakıt Tüketimi"}
        titleId="fuel-trend-title"
        description={`${rangeLabel} · ${metric === "cost" ? formatTRY(total) : `${total.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} L`} toplam`}
        action={
          <div className="inline-flex items-center gap-0.5 p-1 rounded-2xl bg-muted/70 ring-1 ring-border/50">
            {(["cost", "liters"] as const).map((m) => (
              <button
                key={m} type="button" onClick={() => setMetric(m)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all",
                  metric === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "cost" ? "Maliyet" : "Litre"}
              </button>
            ))}
          </div>
        }
      />

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[220px] rounded-2xl bg-muted/30 ring-1 ring-border/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Bu dönemde yakıt kaydı yok</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">Yakıt alımı kaydettikçe aylık akış burada şekillenir.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 min-h-[2rem]">
            <div>
              <p className="text-xs text-muted-foreground">{active ? active.label : "Dönem ortalaması"}</p>
              <p className="font-outfit text-2xl font-bold tracking-tight tabular-nums">
                {metric === "cost"
                  ? formatTRY(activeValue ?? total / Math.max(1, data.filter((d) => d.totalCost > 0).length || 1))
                  : `${(activeValue ?? total / Math.max(1, data.filter((d) => d.totalLiters > 0).length || 1)).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} L`}
              </p>
            </div>
          </div>

          <div className="relative h-[200px] sm:h-[240px]">
            <div className="absolute inset-0 flex">
              <div className="flex flex-col justify-between py-0.5 pr-2 text-[10px] font-mono text-muted-foreground/70 text-right w-11 shrink-0">
                {gridLines.map((v, i) => (
                  <span key={i}>{v === 0 ? "0" : metric === "cost" ? formatCompact(v) : Math.round(v)}</span>
                ))}
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {gridLines.map((_, i) => <div key={i} className="border-t border-dashed border-border/50 w-full" />)}
                </div>
                <div className="relative flex items-end justify-between gap-1.5 sm:gap-2.5 h-full">
                  {data.map((d, i) => {
                    const v = metric === "cost" ? d.totalCost : d.totalLiters;
                    const isHover = hovered === i;
                    const dim = hovered !== null && !isHover;
                    const h = (v / niceMax) * 100;
                    return (
                      <button
                        key={d.key} type="button"
                        className="relative flex-1 h-full flex flex-col justify-end items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                        onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(i)} onBlur={() => setHovered(null)}
                        aria-label={`${d.label}: ${metric === "cost" ? formatTRY(v) : `${v} L`}`}
                      >
                        <div className={cn("w-full max-w-[40px] flex flex-col justify-end transition-opacity duration-200", dim && "opacity-30")} style={{ height: "100%" }}>
                          {v > 0 ? (
                            <motion.div
                              className={cn("w-full rounded-md", metric === "cost" ? "bg-primary" : "bg-cyan-500", isHover && "brightness-110")}
                              initial={{ height: 0 }} animate={{ height: `${h}%` }}
                              transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                            />
                          ) : (
                            <div className="w-full h-1 rounded-full bg-muted/80" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-2.5 pl-11">
            {data.map((d, i) => (
              <span
                key={d.key}
                className={cn(
                  "flex-1 text-center text-[10px] sm:text-[11px] font-mono uppercase tracking-wide transition-colors",
                  hovered === i ? "text-foreground font-bold" : "text-muted-foreground",
                )}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
