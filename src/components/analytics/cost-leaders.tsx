"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Crown, Gauge } from "lucide-react";
import { Panel, PanelHeader } from "./panel";
import { formatTRY, type VehicleCostRow } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Props {
  rows: VehicleCostRow[];
}

export function CostLeaders({ rows }: Props) {
  const reduce = useReducedMotion();
  const withCost = rows.filter((r) => r.total > 0);
  const max = Math.max(1, ...withCost.map((r) => r.total));
  const shown = withCost.slice(0, 5);
  const leader = shown[0];

  return (
    <Panel className="h-full" aria-labelledby="cost-leaders-title">
      <PanelHeader
        eyebrow="Sıralama"
        title="En pahalı araçlar"
        titleId="cost-leaders-title"
        description="Dönem içinde en çok harcama yapanlar"
        action={
          withCost.length > shown.length ? (
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Tümü <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : undefined
        }
      />

      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[200px] rounded-2xl bg-muted/30">
          <Crown className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Bu dönemde araç maliyeti yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leader && (
            <Link
              href={`/vehicles/${leader.vehicleId}`}
              className={cn(
                "group relative block overflow-hidden rounded-[18px] p-5 mb-3",
                "bg-gradient-to-br from-primary/12 via-primary/5 to-transparent",
                "ring-1 ring-primary/15 hover:ring-primary/30 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
                    <Crown className="h-3 w-3" />
                    1. sıra
                  </div>
                  <p className="font-outfit text-xl font-bold tracking-tight">{leader.plate}</p>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{leader.name}</p>
                  {leader.costPerKm !== null && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      ₺{leader.costPerKm.toFixed(2)}/km
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-outfit text-3xl font-bold tracking-tighter tabular-nums text-foreground">
                    {formatTRY(leader.total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{leader.count} kayıt</p>
                </div>
              </div>
              <ChevronRight className="absolute right-4 bottom-4 h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
            </Link>
          )}

          <ul className="space-y-1">
            {shown.slice(1).map((r, i) => {
              const rank = i + 2;
              const pct = (r.total / max) * 100;
              return (
                <li key={r.vehicleId}>
                  <Link
                    href={`/vehicles/${r.vehicleId}`}
                    className={cn(
                      "group grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl px-3 py-3",
                      "hover:bg-muted/50 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span className="font-mono text-xs font-bold text-muted-foreground tabular-nums">
                      {String(rank).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-outfit text-sm font-bold tracking-tight shrink-0">
                          {r.plate}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary/80"
                          style={{ transformOrigin: "left" }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: pct / 100 }}
                          transition={{
                            duration: reduce ? 0 : 0.6,
                            delay: reduce ? 0 : i * 0.06,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-outfit text-sm font-bold tabular-nums group-hover:text-primary transition-colors">
                      {formatTRY(r.total)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}
