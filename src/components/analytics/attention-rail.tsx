"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, ChevronRight, FileWarning, ShieldAlert, Wrench, CheckCircle2,
} from "lucide-react";
import { Panel, PanelHeader } from "./panel";
import type { RenewalItem } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export interface AttentionItem {
  id: string;
  href: string;
  plate: string;
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  kind: "document" | "health" | "maintenance";
}

interface Props {
  items: AttentionItem[];
  urgentDocs: RenewalItem[];
}

const KIND_ICON = {
  document: FileWarning,
  health: ShieldAlert,
  maintenance: Wrench,
};

function severityStyle(s: AttentionItem["severity"]) {
  if (s === "critical") return {
    bar: "bg-red-500",
    chip: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: "text-red-500",
  };
  if (s === "warning") return {
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: "text-amber-500",
  };
  return {
    bar: "bg-primary",
    chip: "bg-primary/10 text-primary",
    icon: "text-primary",
  };
}

export function AttentionRail({ items, urgentDocs }: Props) {
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const shown = items.slice(0, 5);

  return (
    <Panel className="flex flex-col h-full" aria-labelledby="attention-title">
      <PanelHeader
        eyebrow="Öncelik"
        title="Dikkat gerekenler"
        titleId="attention-title"
        description={
          items.length === 0
            ? "Şu an aksiyon bekleyen kalem yok."
            : `${items.length} kalem · ${urgentDocs.filter((d) => d.days <= 30).length} belge ≤30 gün`
        }
        action={
          criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount}
            </span>
          ) : undefined
        }
        className="mb-4"
      />

      {shown.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8 px-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Her şey yolunda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Kritik belge veya düşük skorlu araç bulunmuyor.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex-1 space-y-1 -mx-1">
          {shown.map((item, i) => {
            const Icon = KIND_ICON[item.kind];
            const s = severityStyle(item.severity);
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-2xl px-3 py-3",
                    "transition-colors hover:bg-muted/50 focus-visible:outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-full", s.bar)} aria-hidden />
                  <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/70", s.icon)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-outfit text-sm font-bold tracking-tight">{item.plate}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", s.chip)}>
                        {item.severity === "critical" ? "Acil" : item.severity === "warning" ? "Yakında" : "Bilgi"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground/90 truncate mt-0.5">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-2 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}

      {items.length > shown.length && (
        <Link
          href="/vehicles"
          className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {items.length - shown.length} kalem daha
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </Panel>
  );
}
