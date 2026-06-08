"use client";

import {
  Wrench, CircleDot, Loader2, CheckCircle2,
  Gauge, Disc3, Zap, Droplet, AlertTriangle, CarFront, MoreHorizontal, type LucideIcon,
} from "lucide-react";
import type { ReportStatus, ReportSeverity, ReportCategory } from "@/lib/types";

// ─── Durum ────────────────────────────────────────────────────

export const STATUS_ORDER: ReportStatus[] = ["open", "acknowledged", "in_progress", "resolved"];

export const STATUS_META: Record<
  ReportStatus,
  { label: string; icon: LucideIcon; text: string; bg: string; dot: string }
> = {
  open:          { label: "Açık",       icon: CircleDot,   text: "text-red-600 dark:text-red-400",      bg: "bg-red-500/10",     dot: "bg-red-500" },
  acknowledged:  { label: "İncelendi",  icon: Wrench,      text: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10",   dot: "bg-amber-500" },
  in_progress:   { label: "Çözülüyor",  icon: Loader2,     text: "text-sky-600 dark:text-sky-400",      bg: "bg-sky-500/10",     dot: "bg-sky-500" },
  resolved:      { label: "Çözüldü",    icon: CheckCircle2,text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
};

export function StatusBadge({ status, className = "" }: { status: ReportStatus; className?: string }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text} ${className}`}>
      {status === "in_progress" ? (
        <Icon className="h-3 w-3 animate-spin" />
      ) : status === "open" ? (
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot} animate-pulse`} />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {m.label}
    </span>
  );
}

// ─── Önem ─────────────────────────────────────────────────────

export const SEVERITY_META: Record<
  ReportSeverity,
  { label: string; text: string; bg: string; ring: string }
> = {
  low:      { label: "Düşük",  text: "text-slate-600 dark:text-slate-300",  bg: "bg-slate-500/10",  ring: "ring-slate-500/30" },
  medium:   { label: "Orta",   text: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10",  ring: "ring-amber-500/30" },
  high:     { label: "Yüksek", text: "text-orange-600 dark:text-orange-400",bg: "bg-orange-500/10", ring: "ring-orange-500/30" },
  critical: { label: "Kritik", text: "text-red-600 dark:text-red-400",      bg: "bg-red-500/10",    ring: "ring-red-500/30" },
};

export function SeverityBadge({ severity, className = "" }: { severity: ReportSeverity; className?: string }) {
  const m = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${m.bg} ${m.text} ${className}`}>
      {severity === "critical" && <AlertTriangle className="h-3 w-3" />}
      {m.label}
    </span>
  );
}

// ─── Kategori ─────────────────────────────────────────────────

export const CATEGORY_META: Record<ReportCategory, { label: string; icon: LucideIcon }> = {
  engine:        { label: "Motor",        icon: Gauge },
  brake:         { label: "Fren",         icon: CircleDot },
  tire:          { label: "Lastik",       icon: Disc3 },
  electrical:    { label: "Elektrik",     icon: Zap },
  fluid:         { label: "Sıvı / Yağ",   icon: Droplet },
  warning_light: { label: "Uyarı Işığı",  icon: AlertTriangle },
  body:          { label: "Kaporta",      icon: CarFront },
  other:         { label: "Diğer",        icon: MoreHorizontal },
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_META) as ReportCategory[]).map((k) => ({
  value: k,
  label: CATEGORY_META[k].label,
}));

export function CategoryIcon({ category, className = "" }: { category: ReportCategory; className?: string }) {
  const Icon = CATEGORY_META[category].icon;
  return <Icon className={className} />;
}
