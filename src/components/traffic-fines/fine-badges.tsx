"use client";

import { Clock, CheckCircle2, Ban, ShieldQuestion, type LucideIcon } from "lucide-react";
import type { TrafficFineStatus } from "@/lib/types";

export const STATUS_ORDER: TrafficFineStatus[] = ["unpaid", "paid", "objected", "cancelled"];

export const STATUS_META: Record<
  TrafficFineStatus,
  { label: string; icon: LucideIcon; text: string; bg: string; dot: string }
> = {
  unpaid:    { label: "Ödenmedi",     icon: Clock,          text: "text-red-600 dark:text-red-400",       bg: "bg-red-500/10",     dot: "bg-red-500" },
  paid:      { label: "Ödendi",       icon: CheckCircle2,   text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  objected:  { label: "İtiraz Edildi", icon: ShieldQuestion, text: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10",   dot: "bg-amber-500" },
  cancelled: { label: "İptal",        icon: Ban,            text: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-500/10",   dot: "bg-slate-400" },
};

export function FineStatusBadge({ status, className = "" }: { status: TrafficFineStatus; className?: string }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text} ${className}`}>
      {status === "unpaid" ? (
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot} animate-pulse`} />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {m.label}
    </span>
  );
}
