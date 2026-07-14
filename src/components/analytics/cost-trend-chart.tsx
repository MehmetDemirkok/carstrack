"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCompactTRY, formatTRY, type MonthlyCostPoint } from "@/lib/analytics";

interface Props {
  data: MonthlyCostPoint[];
  rangeLabel: string;
}

export function CostTrendChart({ data, rangeLabel }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  const total = data.reduce((s, d) => s + d.total, 0);
  // "Güzel" bir eksen üst sınırı — grid çizgileri için
  const niceMax = niceCeil(max);
  const gridLines = [1, 0.75, 0.5, 0.25, 0].map((f) => niceMax * f);

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Harcama Trendi</p>
              <p className="text-[10px] text-muted-foreground">{rangeLabel} · toplam {formatTRY(total)}</p>
            </div>
          </div>
          {/* Açıklama (legend) */}
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-primary" /> Ödenen
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-red-500" /> Ödenmemiş
            </span>
          </div>
        </div>

        {total === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex-1 flex flex-col min-h-[180px]">
            <div className="flex-1 flex gap-2">
              {/* Y ekseni etiketleri */}
              <div className="flex flex-col justify-between py-1 pr-1 text-[9px] font-mono text-muted-foreground/70 text-right shrink-0 w-10">
                {gridLines.map((v, i) => (
                  <span key={i}>{v === 0 ? "0" : formatCompactTRY(v)}</span>
                ))}
              </div>

              {/* Grafik alanı */}
              <div className="relative flex-1">
                {/* Izgara çizgileri (recessive) */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {gridLines.map((_, i) => (
                    <div key={i} className="border-t border-border/40 w-full h-0" />
                  ))}
                </div>

                {/* Barlar */}
                <div className="relative flex items-end justify-between gap-1.5 h-full pb-0">
                  {data.map((d, i) => {
                    const isHover = hovered === i;
                    const dim = hovered !== null && !isHover;
                    const paidH = (d.paid / niceMax) * 100;
                    const unpaidH = (d.unpaid / niceMax) * 100;
                    return (
                      <div
                        key={d.key}
                        className="relative flex-1 h-full flex flex-col justify-end items-center gap-1 cursor-default"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {/* Tooltip */}
                        {isHover && d.total > 0 && (
                          <div className="absolute bottom-full mb-2 z-20 left-1/2 -translate-x-1/2 w-max max-w-[160px] pointer-events-none">
                            <div className="bg-popover border border-border/60 rounded-xl shadow-lg px-3 py-2 text-left space-y-1">
                              <p className="text-[10px] font-bold text-foreground">{d.label} · {d.count} kayıt</p>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="w-2 h-2 rounded-[2px] bg-primary" />
                                <span className="text-muted-foreground">Ödenen</span>
                                <span className="ml-auto font-semibold font-mono text-foreground">{formatTRY(d.paid)}</span>
                              </div>
                              {d.unpaid > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="w-2 h-2 rounded-[2px] bg-red-500" />
                                  <span className="text-muted-foreground">Ödenmemiş</span>
                                  <span className="ml-auto font-semibold font-mono text-red-500">{formatTRY(d.unpaid)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] pt-1 border-t border-border/40">
                                <span className="text-muted-foreground">Toplam</span>
                                <span className="ml-auto font-bold font-mono text-foreground">{formatTRY(d.total)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Yığılmış bar (ödenmemiş üstte, ödenen altta, 2px boşluk) */}
                        <div
                          className="w-full max-w-[36px] flex flex-col justify-end items-stretch gap-[2px] transition-opacity"
                          style={{ height: "100%", opacity: dim ? 0.35 : 1 }}
                        >
                          {d.unpaid > 0 && (
                            <motion.div
                              className="w-full bg-red-500 rounded-t-[4px]"
                              initial={{ height: 0 }}
                              animate={{ height: `${unpaidH}%` }}
                              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          )}
                          {d.paid > 0 && (
                            <motion.div
                              className={`w-full bg-primary ${d.unpaid > 0 ? "rounded-b-[4px]" : "rounded-[4px]"}`}
                              initial={{ height: 0 }}
                              animate={{ height: `${paidH}%` }}
                              transition={{ duration: 0.6, delay: i * 0.04 + 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* X ekseni etiketleri */}
            <div className="flex gap-1.5 pl-11 pt-1.5">
              {data.map((d, i) => (
                <span
                  key={d.key}
                  className={`flex-1 text-center text-[9px] font-mono uppercase transition-colors ${
                    hovered === i ? "text-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 min-h-[180px] text-muted-foreground">
      <TrendingUp className="h-8 w-8 opacity-30" />
      <p className="text-xs">Bu dönemde maliyet kaydı yok.</p>
      <p className="text-[10px] opacity-70">Servis kayıtlarına tutar girdikçe trend burada oluşur.</p>
    </div>
  );
}

// Eksen üst sınırını "güzel" bir sayıya yuvarlar (ör. 1.850 → 2.000)
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * magnitude;
}
