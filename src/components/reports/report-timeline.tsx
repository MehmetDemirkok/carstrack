"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getReportLogs } from "@/lib/db";
import type { ReportStatus, VehicleReportLog } from "@/lib/types";
import { STATUS_ORDER, STATUS_META } from "./report-badges";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** 4 aşamalı yatay ilerleme göstergesi: Açık → İncelendi → Çözülüyor → Çözüldü */
export function StatusStepper({ status }: { status: ReportStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center">
      {STATUS_ORDER.map((s, i) => {
        const meta = STATUS_META[s];
        const done = i < currentIdx;
        const active = i === currentIdx;
        const reached = i <= currentIdx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  reached ? meta.dot : "bg-muted"
                } ${active ? "ring-4 ring-offset-0 " + meta.bg : ""}`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${reached ? "bg-white" : "bg-muted-foreground/40"} ${active ? "animate-pulse" : ""}`} />
                )}
              </motion.div>
              <span className={`text-[9px] font-semibold whitespace-nowrap ${reached ? meta.text : "text-muted-foreground"}`}>
                {meta.label}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 -mt-4 rounded-full overflow-hidden bg-muted">
                <motion.div
                  initial={false}
                  animate={{ width: i < currentIdx ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`h-full ${STATUS_META[STATUS_ORDER[i + 1]].dot}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Bildirimin durum geçmişi (audit log) — eski→yeni dikey liste. */
export function ReportTimeline({ reportId }: { reportId: string }) {
  const [logs, setLogs] = useState<VehicleReportLog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReportLogs(reportId)
      .then((l) => { if (!cancelled) setLogs(l); })
      .catch(() => { if (!cancelled) setLogs([]); });
    return () => { cancelled = true; };
  }, [reportId]);

  if (logs === null) {
    return (
      <div className="space-y-2 py-1">
        {[0, 1].map((i) => <div key={i} className="h-10 rounded-xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Henüz geçmiş kaydı yok.</p>;
  }

  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border/60" />
      <div className="space-y-3">
        {logs.map((log, i) => {
          const meta = log.toStatus ? STATUS_META[log.toStatus] : null;
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative"
            >
              <span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full ring-2 ring-background ${meta?.dot ?? "bg-muted-foreground"}`} />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold">
                  {log.fromStatus == null
                    ? "Bildirim oluşturuldu"
                    : meta
                    ? `Durum: ${meta.label}`
                    : "Güncellendi"}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(log.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {log.actorName && (
                  <span className="text-[10px] text-muted-foreground">{log.actorName}</span>
                )}
              </div>
              {log.note && (
                <p className="text-[11px] text-muted-foreground mt-1 bg-muted/40 rounded-lg px-2.5 py-1.5 leading-snug">
                  {log.note}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
