"use client";

import Link from "next/link";
import { CalendarClock, Shield, ShieldCheck, ClipboardCheck, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DocKind, RenewalItem } from "@/lib/analytics";

interface Props {
  items: RenewalItem[];
}

const KIND_ICON: Record<DocKind, typeof Shield> = {
  insurance: Shield,
  kasko: ShieldCheck,
  inspection: ClipboardCheck,
  "green-card": Globe,
};

function tone(days: number) {
  if (days < 0) return { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-500", text: "Süresi doldu" };
  if (days <= 14) return { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-500", text: `${days} gün` };
  if (days <= 30) return { pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500", text: `${days} gün` };
  return { pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", text: `${days} gün` };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export function RenewalTimeline({ items }: Props) {
  const shown = items.slice(0, 7);

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden h-full">
      <CardContent className="p-5 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Belge Yenileme Takvimi</p>
          </div>
          <span className="text-[10px] text-muted-foreground">120 gün</span>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 min-h-[140px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-8 w-8 opacity-40" />
            <p className="text-xs">Yaklaşan belge yenilemesi yok.</p>
            <p className="text-[10px] text-muted-foreground">Tüm belgeler 120 günden uzun süre geçerli.</p>
          </div>
        ) : (
          <div className="flex-1 space-y-1.5">
            {shown.map((item) => {
              const Icon = KIND_ICON[item.kind];
              const t = tone(item.days);
              return (
                <Link
                  key={`${item.vehicleId}-${item.kind}`}
                  href={`/vehicles/${item.vehicleId}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/40 transition-colors group"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
                  <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold truncate">{item.label}</span>
                      <span className="text-[10px] font-outfit font-bold text-muted-foreground shrink-0">{item.plate}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{formatDate(item.expiry)}{item.company ? ` · ${item.company}` : ""}</p>
                  </div>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${t.pill}`}>{t.text}</span>
                </Link>
              );
            })}
            {items.length > shown.length && (
              <p className="text-[10px] text-center text-muted-foreground pt-1">+{items.length - shown.length} belge daha</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
