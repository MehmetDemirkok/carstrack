"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity } from "lucide-react";
import { Panel, PanelHeader } from "./panel";
import { formatCompactTRY, formatTRY, type MonthlyCostPoint } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Props {
  data: MonthlyCostPoint[];
  rangeLabel: string;
}

export function SpendCanvas({ data, rangeLabel }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const gradId = useId();
  const total = data.reduce((s, d) => s + d.total, 0);
  const max = Math.max(1, ...data.map((d) => d.total));
  const niceMax = niceCeil(max);
  const gridLines = [1, 0.75, 0.5, 0.25, 0].map((f) => niceMax * f);

  // Area path (paid+unpaid total)
  const w = 100;
  const h = 100;
  const padX = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length === 1 ? w / 2 : i * padX,
    y: h - (d.total / niceMax) * h,
    ...d,
  }));

  const linePath =
    points.length === 0
      ? ""
      : points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(" ");
  const areaPath =
    points.length === 0
      ? ""
      : `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${h} L ${points[0].x.toFixed(2)} ${h} Z`;

  const active = hovered !== null ? data[hovered] : null;

  return (
    <Panel className="h-full" aria-labelledby="spend-canvas-title">
      <PanelHeader
        eyebrow="Trend"
        title="Harcama akışı"
        titleId="spend-canvas-title"
        description={`${rangeLabel} · ${formatTRY(total)} toplam`}
        action={
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-primary" /> Ödenen
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-red-500" /> Ödenmemiş
            </span>
          </div>
        }
      />

      {total === 0 ? (
        <EmptyChart />
      ) : (
        <div className="space-y-4">
          {/* Live readout */}
          <div className="flex items-baseline justify-between gap-3 min-h-[2rem]">
            <div>
              <p className="text-xs text-muted-foreground">
                {active ? active.label : "Dönem ortalaması"}
              </p>
              <p className="font-outfit text-2xl font-bold tracking-tight tabular-nums">
                {formatTRY(active ? active.total : total / Math.max(1, data.filter((d) => d.total > 0).length || 1))}
              </p>
            </div>
            {active && (
              <div className="text-right text-xs space-y-0.5">
                <p className="text-muted-foreground">
                  Ödenen <span className="font-mono font-semibold text-foreground">{formatTRY(active.paid)}</span>
                </p>
                {active.unpaid > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    Ödenmemiş <span className="font-mono font-semibold">{formatTRY(active.unpaid)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="relative h-[220px] sm:h-[260px]">
            {/* Soft area backdrop */}
            <svg
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-70"
              aria-hidden
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d={areaPath}
                fill={`url(#${gradId})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduce ? 0 : 0.6 }}
              />
              <motion.path
                d={linePath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            {/* Grid + stacked bars */}
            <div className="absolute inset-0 flex">
              <div className="flex flex-col justify-between py-0.5 pr-2 text-[10px] font-mono text-muted-foreground/70 text-right w-11 shrink-0">
                {gridLines.map((v, i) => (
                  <span key={i}>{v === 0 ? "0" : formatCompactTRY(v)}</span>
                ))}
              </div>

              <div className="relative flex-1">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {gridLines.map((_, i) => (
                    <div key={i} className="border-t border-dashed border-border/50 w-full" />
                  ))}
                </div>

                <div className="relative flex items-end justify-between gap-1.5 sm:gap-2.5 h-full">
                  {data.map((d, i) => {
                    const isHover = hovered === i;
                    const dim = hovered !== null && !isHover;
                    const paidH = (d.paid / niceMax) * 100;
                    const unpaidH = (d.unpaid / niceMax) * 100;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        className="relative flex-1 h-full flex flex-col justify-end items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered(i)}
                        onBlur={() => setHovered(null)}
                        aria-label={`${d.label}: ${formatTRY(d.total)}`}
                      >
                        <div
                          className={cn(
                            "w-full max-w-[40px] flex flex-col justify-end gap-[3px] transition-opacity duration-200",
                            dim && "opacity-30",
                          )}
                          style={{ height: "100%" }}
                        >
                          {d.unpaid > 0 && (
                            <motion.div
                              className={cn(
                                "w-full rounded-t-md bg-red-500",
                                isHover && "brightness-110",
                              )}
                              initial={{ height: 0 }}
                              animate={{ height: `${unpaidH}%` }}
                              transition={{
                                duration: reduce ? 0 : 0.65,
                                delay: reduce ? 0 : i * 0.035,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            />
                          )}
                          {d.paid > 0 && (
                            <motion.div
                              className={cn(
                                "w-full bg-primary",
                                d.unpaid > 0 ? "rounded-b-md" : "rounded-md",
                                isHover && "brightness-110",
                              )}
                              initial={{ height: 0 }}
                              animate={{ height: `${paidH}%` }}
                              transition={{
                                duration: reduce ? 0 : 0.65,
                                delay: reduce ? 0 : i * 0.035 + 0.04,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                            />
                          )}
                          {d.total === 0 && (
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

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[240px] rounded-2xl bg-muted/30 ring-1 ring-border/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Bu dönemde harcama yok</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Servis kayıtlarına tutar girdikçe aylık akış burada şekillenir.
        </p>
      </div>
    </div>
  );
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * magnitude;
}
