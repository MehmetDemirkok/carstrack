"use client";

import { useState } from "react";
import { PieChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTRY, type TypeCostSlice } from "@/lib/analytics";

interface Props {
  slices: TypeCostSlice[];
}

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 2; // segmentler arası boşluk (yüzde puanı olarak dasharray birimi)

export function CostTypeDonut({ slices }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const withCost = slices.filter((s) => s.total > 0);
  const total = withCost.reduce((s, x) => s + x.total, 0);

  // Segment dasharray'lerini hesapla (payı olan dilimler). Ofsetler kümülatif —
  // render sırasında değişken mutasyonundan kaçınmak için prefix toplamı kullanılır.
  const arcs = withCost.map((s, i) => {
    const frac = s.total / total;
    const len = Math.max(0, frac * CIRC - GAP);
    const offset = withCost.slice(0, i).reduce((acc, x) => acc + (x.total / total) * CIRC, 0);
    return { ...s, dash: len, gap: CIRC - len, offset };
  });

  const activeSlice = active !== null ? withCost[active] : null;

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <PieChart className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harcama Dağılımı</p>
          </div>
          <span className="text-[10px] text-muted-foreground">servis tipine göre</span>
        </div>

        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 min-h-[160px] text-muted-foreground">
            <PieChart className="h-8 w-8 opacity-30" />
            <p className="text-xs">Tutar girilmiş servis kaydı yok.</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-4 flex-col sm:flex-row">
            {/* Donut */}
            <div className="relative shrink-0 w-[128px] h-[128px]">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth="11" opacity="0.5" />
                {arcs.map((a, i) => (
                  <circle
                    key={a.type}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={active === i ? 14 : 11}
                    strokeDasharray={`${a.dash} ${a.gap}`}
                    strokeDashoffset={-a.offset}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    style={{ opacity: active !== null && active !== i ? 0.35 : 1 }}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                  />
                ))}
              </svg>
              {/* Merkez */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                {activeSlice ? (
                  <>
                    <span className="text-sm font-bold font-outfit leading-none">{Math.round((activeSlice.total / total) * 100)}%</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[70px] leading-tight">{activeSlice.label}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Toplam</span>
                    <span className="text-[13px] font-bold font-outfit leading-tight">{formatTRY(total)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Açıklama listesi */}
            <div className="flex-1 w-full space-y-1.5 min-w-0">
              {withCost.map((s, i) => {
                const pct = Math.round((s.total / total) * 100);
                return (
                  <button
                    key={s.type}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    className={`w-full flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors ${
                      active === i ? "bg-muted/60" : ""
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: s.color }} />
                    <span className="text-[11px] font-medium truncate flex-1">{s.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{pct}%</span>
                    <span className="text-[11px] font-mono font-semibold text-foreground shrink-0 w-16 text-right">{formatTRY(s.total)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
