"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/analytics/panel";
import { cn } from "@/lib/utils";

export interface RankedBarItem {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  displayValue: string;
  color?: string;
}

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  items: RankedBarItem[];
  emptyText?: string;
  maxItems?: number;
}

/** Genel amaçlı sıralı yatay çubuk listesi — mevcut CostBreakdown ile aynı görsel dil, araç/istasyon/tüketim karşılaştırmaları için yeniden kullanılır. */
export function FuelRankedBars({ eyebrow, title, description, items, emptyText, maxItems = 8 }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const ranked = [...items].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const max = Math.max(1, ...ranked.map((r) => r.value));

  return (
    <Panel className="flex flex-col h-full" aria-labelledby={`ranked-${title}`}>
      <PanelHeader eyebrow={eyebrow} title={title} titleId={`ranked-${title}`} description={description} />

      {ranked.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 min-h-[200px] rounded-2xl bg-muted/30">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyText ?? "Henüz veri yok."}</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-3">
          {ranked.map((item, i) => {
            const isActive = active === item.key;
            const color = item.color ?? "var(--primary)";
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left rounded-2xl px-2 py-2 -mx-2 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive && "bg-muted/50",
                  )}
                  onMouseEnter={() => setActive(item.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(item.key)}
                  onBlur={() => setActive(null)}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.sublabel && <span className="text-[11px] text-muted-foreground truncate">{item.sublabel}</span>}
                    </div>
                    <span className="font-outfit text-sm font-bold tabular-nums shrink-0">{item.displayValue}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color, transformOrigin: "left" }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: item.value / max }}
                      transition={{ duration: reduce ? 0 : 0.65, delay: reduce ? 0 : 0.05 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
