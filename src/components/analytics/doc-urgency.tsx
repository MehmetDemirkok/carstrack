"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarClock, ClipboardCheck, Globe, Shield, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { Panel, PanelHeader } from "./panel";
import type { DocKind, RenewalItem } from "@/lib/analytics";
import { cn } from "@/lib/utils";

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
  if (days < 0) {
    return {
      pill: "bg-red-500 text-white",
      row: "bg-red-500/[0.06] ring-red-500/15",
      label: "Süresi doldu",
    };
  }
  if (days <= 14) {
    return {
      pill: "bg-red-500/15 text-red-700 dark:text-red-400",
      row: "bg-red-500/[0.04] ring-red-500/10",
      label: `${days} gün`,
    };
  }
  if (days <= 30) {
    return {
      pill: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
      row: "ring-border/40",
      label: `${days} gün`,
    };
  }
  return {
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    row: "ring-border/40",
    label: `${days} gün`,
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DocUrgency({ items }: Props) {
  const shown = items.slice(0, 8);
  const overdue = items.filter((i) => i.days < 0).length;
  const soon = items.filter((i) => i.days >= 0 && i.days <= 30).length;

  return (
    <Panel aria-labelledby="doc-urgency-title">
      <PanelHeader
        eyebrow="Belgeler"
        title="Yenileme takvimi"
        titleId="doc-urgency-title"
        description={
          items.length === 0
            ? "120 gün içinde yenilenecek belge yok."
            : `${overdue > 0 ? `${overdue} gecikmiş · ` : ""}${soon} belge 30 gün içinde`
        }
        action={
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
          </div>
        }
      />

      {shown.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 rounded-[18px] bg-emerald-500/[0.06] ring-1 ring-emerald-500/15 px-6 py-10 text-center sm:text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Tüm belgeler güncel</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Sigorta, kasko ve muayene tarihleri 120 günden uzun süre geçerli.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {shown.map((item, i) => {
            const Icon = KIND_ICON[item.kind];
            const t = tone(item.days);
            return (
              <motion.div
                key={`${item.vehicleId}-${item.kind}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Link
                  href={`/vehicles/${item.vehicleId}`}
                  className={cn(
                    "flex items-center gap-3 rounded-[16px] px-4 py-3.5 ring-1 transition-all",
                    "hover:shadow-md hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    t.row,
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80 ring-1 ring-border/50">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{item.label}</span>
                      <span className="font-outfit text-xs font-bold text-muted-foreground shrink-0">
                        {item.plate}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {formatDate(item.expiry)}
                      {item.company ? ` · ${item.company}` : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", t.pill)}>
                    {t.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {items.length > shown.length && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          +{items.length - shown.length} belge daha
        </p>
      )}
    </Panel>
  );
}
