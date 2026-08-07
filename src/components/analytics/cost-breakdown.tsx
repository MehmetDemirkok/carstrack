"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Layers } from "lucide-react";
import { Panel, PanelHeader } from "./panel";
import { formatTRY, type TypeCostSlice } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Props {
  slices: TypeCostSlice[];
}

/** Horizontal ranked breakdown — replaces the donut. */
export function CostBreakdown({ slices }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const withCost = slices.filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
  const total = withCost.reduce((s, x) => s + x.total, 0);
  const max = Math.max(1, ...withCost.map((s) => s.total));

  return (
    <Panel className="flex flex-col h-full" aria-labelledby="cost-breakdown-title">
      <PanelHeader
        eyebrow="Dağılım"
        title="Nereye gidiyor?"
        titleId="cost-breakdown-title"
        description="Servis tipine göre"
      />

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 min-h-[200px] rounded-2xl bg-muted/30">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tutarlı servis kaydı yok.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-5">
          {/* Stacked composition bar */}
          <div
            className="h-3 rounded-full overflow-hidden flex ring-1 ring-border/40"
            role="img"
            aria-label="Harcama kompozisyonu"
          >
            {withCost.map((s, i) => (
              <motion.div
                key={s.type}
                className={cn(
                  "h-full transition-opacity",
                  active && active !== s.type && "opacity-35",
                )}
                style={{ background: s.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(s.total / total) * 100}%` }}
                transition={{
                  duration: reduce ? 0 : 0.7,
                  delay: reduce ? 0 : i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onMouseEnter={() => setActive(s.type)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </div>

          <ul className="space-y-3">
            {withCost.map((s, i) => {
              const pct = Math.round((s.total / total) * 100);
              const isActive = active === s.type;
              return (
                <li key={s.type}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left rounded-2xl px-2 py-2 -mx-2 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && "bg-muted/50",
                    )}
                    onMouseEnter={() => setActive(s.type)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(s.type)}
                    onBlur={() => setActive(null)}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: s.color }}
                        />
                        <span className="text-sm font-medium truncate">{s.label}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">{pct}%</span>
                      </div>
                      <span className="font-outfit text-sm font-bold tabular-nums shrink-0">
                        {formatTRY(s.total)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: s.color, transformOrigin: "left" }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: s.total / max }}
                        transition={{
                          duration: reduce ? 0 : 0.65,
                          delay: reduce ? 0 : 0.1 + i * 0.05,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}
