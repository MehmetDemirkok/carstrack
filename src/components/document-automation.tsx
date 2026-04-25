"use client";

import Link from "next/link";
import { CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Vehicle } from "@/lib/types";

interface Props {
  vehicles: Vehicle[];
}

interface DocEntry {
  vehicleId: string;
  plate: string;
  docType: "insurance" | "inspection";
  docLabel: string;
  daysRemaining: number;
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function statusDot(days: number) {
  if (days < 0) return "bg-red-500";
  if (days < 30) return "bg-amber-500";
  return "bg-emerald-500";
}

function statusChip(days: number) {
  if (days < 0) return { label: "Gecikmiş", cls: "bg-red-500/10 text-red-600 dark:text-red-400" };
  if (days < 7) return { label: `${days} gün`, cls: "bg-red-500/10 text-red-600 dark:text-red-400" };
  if (days < 30) return { label: `${days} gün`, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  if (days < 60) return { label: `${days} gün`, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  return { label: `${days} gün`, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
}

export function DocumentAutomation({ vehicles }: Props) {
  const entries: DocEntry[] = [];

  for (const v of vehicles) {
    if (v.insuranceExpiry) {
      entries.push({ vehicleId: v.id, plate: v.plate, docType: "insurance", docLabel: "Sigorta", daysRemaining: daysUntil(v.insuranceExpiry) });
    }
    if (v.inspectionExpiry) {
      entries.push({ vehicleId: v.id, plate: v.plate, docType: "inspection", docLabel: "Muayene", daysRemaining: daysUntil(v.inspectionExpiry) });
    }
  }

  entries.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const attentionCount = entries.filter((e) => e.daysRemaining < 60).length;
  const allGood = attentionCount === 0;

  return (
    <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Belge Takibi</p>
          </div>
          {!allGood && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[10px] font-bold">{attentionCount} dikkat</span>
            </div>
          )}
        </div>

        {allGood ? (
          <div className="flex items-center gap-2.5 py-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">Tüm belgeler güncel</span>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto no-scrollbar space-y-0 -mx-1">
            {entries.map((entry, i) => {
              const chip = statusChip(entry.daysRemaining);
              return (
                <Link href={`/vehicles/${entry.vehicleId}`} key={`${entry.vehicleId}-${entry.docType}`}>
                  <div className={`flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-colors ${i > 0 ? "border-t border-border/30" : ""}`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${statusDot(entry.daysRemaining)}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold">{entry.plate}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">{entry.docLabel}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${chip.cls}`}>
                      {chip.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
