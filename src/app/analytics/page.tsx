"use client";

import { motion } from "framer-motion";
import {
  calculateHealthScore,
  getMaintenanceStatusForItem,
  getFleetAlerts,
} from "@/lib/store";
import { useData } from "@/context/data-context";
import type { Vehicle, FleetAlert } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Shield, Calendar, Disc3, Wrench, CheckCircle2, AlertTriangle,
  XCircle, Car, ChevronRight, Activity, FileDown,
} from "lucide-react";
import { exportFleetStatusPDF } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { DocumentAutomation } from "@/components/document-automation";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function docStatus(days: number | null): "good" | "warning" | "overdue" {
  if (days === null) return "good";
  if (days < 0) return "overdue";
  if (days < 30) return "warning";
  return "good";
}

const statusColors = {
  good:    { pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "#10b981" },
  warning: { pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400",       dot: "#f59e0b" },
  overdue: { pill: "bg-red-500/10 text-red-600 dark:text-red-400",             dot: "#ef4444" },
};

const statusIcon = {
  good:    CheckCircle2,
  warning: AlertTriangle,
  overdue: XCircle,
};

const categoryIcon: Record<FleetAlert["category"], typeof Shield> = {
  insurance: Shield,
  "green-card": Shield,
  inspection: Calendar,
  maintenance: Wrench,
  tire: Disc3,
};

const severityBadge = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  warning:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  info:     "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

function scoreBar(score: number) {
  if (score >= 85) return "#10b981";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
}

export default function FleetStatusPage() {
  const { vehicles } = useData();
  const alerts: FleetAlert[] = getFleetAlerts(vehicles);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount  = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5 pb-28">
      {/* ── Başlık ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-outfit font-bold tracking-tight">Filo Durumu</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Bakım ve belge özeti</p>
        </div>
        {vehicles.length > 0 && (
          <div className="flex gap-2 shrink-0 items-center">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <XCircle className="h-3 w-3" /> {criticalCount} kritik
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-3 w-3" /> {warningCount} uyarı
              </span>
            )}
            {criticalCount === 0 && warningCount === 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Filo sağlıklı
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 shadow-sm border-border/50 shrink-0"
              title="PDF Raporu İndir"
              onClick={() => exportFleetStatusPDF(vehicles)}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

        {/* ── Araç kartları ── */}
        {vehicles.map((vehicle) => {
          const score = calculateHealthScore(vehicle);
          const barColor = scoreBar(score);

          const insDays = daysUntil(vehicle.insuranceExpiry);
          const muaDays = daysUntil(vehicle.inspectionExpiry);
          const insStatus = docStatus(insDays);
          const muaStatus = docStatus(muaDays);

          const critMaint = vehicle.maintenanceItems
            .map((item) => ({ ...item, status: getMaintenanceStatusForItem(item, vehicle.mileage) }))
            .filter((item) => item.status !== "good");

          const maintStatus: "good" | "warning" | "overdue" =
            critMaint.some((m) => m.status === "overdue") ? "overdue"
            : critMaint.length > 0 ? "warning"
            : "good";

          const hasIssue = insStatus !== "good" || muaStatus !== "good" || maintStatus !== "good";

          const statusItems = [
            { label: "Sigorta",  icon: Shield,   status: insStatus,   info: insDays !== null ? (insDays < 0 ? "Gecikti" : `${insDays} gün`) : "—" },
            { label: "Muayene", icon: Calendar,  status: muaStatus,   info: muaDays !== null ? (muaDays < 0 ? "Gecikti" : `${muaDays} gün`) : "—" },
            { label: "Bakım",   icon: Wrench,    status: maintStatus, info: critMaint.length > 0 ? `${critMaint.length} uyarı` : "Tamam" },
            { label: "Lastik",  icon: Disc3,     status: "good" as const, info: vehicle.tireStatus },
          ];

          const vehicleAlerts = alerts.filter((a) => a.vehicleId === vehicle.id);

          return (
            <motion.div variants={fadeUp} key={vehicle.id}>
              <Link href={`/vehicles/${vehicle.id}`} className="block group">
                <div className="bg-card rounded-2xl border border-border/40 overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200">

                  {/* Üst skor çubuğu */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${barColor}33, ${barColor})` }} />

                  <div className="p-4 space-y-4">
                    {/* ── Kimlik satırı ── */}
                    <div className="flex items-center gap-3">
                      {/* Küçük skor dairesi */}
                      <div className="relative w-11 h-11 shrink-0">
                        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted/40" />
                          <circle
                            cx="22" cy="22" r="18" fill="none"
                            stroke={barColor}
                            strokeWidth="3.5"
                            strokeDasharray={`${score * 1.131} 113.1`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-black font-outfit leading-none">{score}</span>
                        </div>
                      </div>

                      {/* Plaka + model */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-outfit font-black text-sm tracking-tight">{vehicle.plate}</span>
                          <span className="text-xs text-muted-foreground truncate">{vehicle.brand} {vehicle.model} • {vehicle.year}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{vehicle.mileage.toLocaleString("tr-TR")} km</span>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                    </div>

                    {/* ── 4 durum pill'i ── */}
                    <div className="grid grid-cols-4 gap-2">
                      {statusItems.map((item) => {
                        const Icon = statusIcon[item.status];
                        return (
                          <div
                            key={item.label}
                            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl ${statusColors[item.status].pill}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">{item.label}</span>
                            <span className="text-[10px] font-bold leading-none text-center">{item.info}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Uyarı satırı ── */}
                    {hasIssue ? (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                        {vehicleAlerts.map((alert) => {
                          const Icon = categoryIcon[alert.category];
                          return (
                            <span
                              key={alert.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${severityBadge[alert.severity]}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              {alert.title}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/30 text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold">Tüm kontroller tamam</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* ── Document Automation ── */}
        {vehicles.length > 0 && (
          <motion.div variants={fadeUp}>
            <DocumentAutomation vehicles={vehicles} />
          </motion.div>
        )}

        {/* ── Boş durum ── */}
        {vehicles.length === 0 && (
          <motion.div variants={fadeUp} className="text-center py-16 flex flex-col items-center gap-4">
            <div className="p-5 bg-mesh rounded-3xl shadow-lg shadow-primary/20">
              <Activity className="h-10 w-10 text-primary-foreground/80" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold">Henüz Araç Yok</p>
              <p className="text-sm text-muted-foreground max-w-xs">Filo analizi için araçlarınızı ekleyin.</p>
            </div>
            <Link href="/vehicles/new">
              <span className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                Araç ekle <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
