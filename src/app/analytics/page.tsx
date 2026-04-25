"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { calculateHealthScore, getMaintenanceStatusForItem, getMaintenanceProgress, getFleetAlerts } from "@/lib/store";
import { getVehicles } from "@/lib/db";
import type { Vehicle, FleetAlert } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  Shield, Calendar, Disc3, Wrench, CheckCircle2, AlertTriangle,
  XCircle, Car, Sun, Snowflake, Layers, ChevronRight, BatteryCharging,
} from "lucide-react";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const statusColor = { good: "bg-emerald-500", warning: "bg-amber-500", overdue: "bg-red-500" };
const statusBadge = {
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};
const statusLabel = { good: "İyi", warning: "Yaklaşıyor", overdue: "Gecikmeli" };
const StatusIcon = { good: CheckCircle2, warning: AlertTriangle, overdue: XCircle };

const severityStyle = {
  critical: "bg-red-500/5 border-red-500/20",
  warning: "bg-amber-500/5 border-amber-500/20",
  info: "bg-blue-500/5 border-blue-500/20",
};
const severityIconStyle = {
  critical: "bg-red-500/15 text-red-500",
  warning: "bg-amber-500/15 text-amber-500",
  info: "bg-blue-500/15 text-blue-500",
};
const categoryIcon = { insurance: Shield, inspection: Calendar, maintenance: Wrench, tire: Disc3 };

function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function docStatus(days: number | null) {
  if (days === null) return "good";
  if (days < 0) return "overdue";
  if (days < 30) return "warning";
  return "good";
}

export default function FleetStatusPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const v = await getVehicles();
        setVehicles(v);
        setAlerts(getFleetAlerts(v));
      } catch (err) {
        console.error("Failed to load vehicles", err);
      }
    }
    load();
  }, []);

  return (
    <div className="p-4 space-y-6 pb-28">
      <div>
        <h1 className="text-2xl font-outfit font-bold tracking-tight">Filo Durumu</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Tüm araçların bakım ve belge durumu</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Alerts summary */}
        {alerts.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-2.5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Aktif Uyarılar</h2>
            <div className="space-y-2">
              {alerts.map((alert) => {
                const Icon = categoryIcon[alert.category];
                return (
                  <Link href={`/vehicles/${alert.vehicleId}`} key={alert.id}>
                    <div className={`p-3.5 rounded-2xl border flex gap-3 items-start hover:opacity-80 transition-opacity ${severityStyle[alert.severity]}`}>
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${severityIconStyle[alert.severity]}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-xs">{alert.title}</h3>
                          <span className="text-[9px] text-muted-foreground">{alert.vehiclePlate}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Per vehicle breakdown */}
        {vehicles.map((vehicle) => {
          const score = calculateHealthScore(vehicle);
          const insDays = daysUntil(vehicle.insuranceExpiry);
          const muaDays = daysUntil(vehicle.inspectionExpiry);
          
          // Get statuses for a quick overview
          const insStatus = docStatus(insDays);
          const muaStatus = docStatus(muaDays);
          
          // Find critical maintenance items
          const criticalMaintenance = vehicle.maintenanceItems
            .map(item => ({ ...item, status: getMaintenanceStatusForItem(item, vehicle.mileage) }))
            .filter(item => item.status !== "good");

          return (
            <motion.div variants={fadeUp} key={vehicle.id} className="group">
              <Link href={`/vehicles/${vehicle.id}`}>
                <Card className="rounded-[2.5rem] border-border/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden group-hover:border-primary/20">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Left Side: Vehicle Identity & Score */}
                      <div className="p-6 sm:w-1/3 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border/40 flex flex-col items-center justify-center text-center gap-4">
                        <div className="relative">
                          <svg className="w-24 h-24 -rotate-90 drop-shadow-sm" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/50" />
                            <motion.circle
                              initial={{ strokeDasharray: "0 120" }}
                              animate={{ strokeDasharray: `${score * 1.193} 120` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              cx="22" cy="22" r="19" fill="none"
                              stroke={score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444"}
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black font-outfit leading-none">{score}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Puan</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 bg-background border border-border/60 px-3 py-1 rounded-xl shadow-sm">
                            <Car className="h-3 w-3 text-primary" />
                            <span className="text-xs font-black tracking-tight">{vehicle.plate}</span>
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                        </div>
                      </div>

                      {/* Right Side: Status Overview */}
                      <div className="flex-1 p-6 flex flex-col justify-between gap-6">
                        {/* Status Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: "Sigorta", icon: Shield, status: insStatus, info: insDays !== null ? (insDays < 0 ? "Gecikti" : `${insDays} Gün`) : "—" },
                            { label: "Muayene", icon: Calendar, status: muaStatus, info: muaDays !== null ? (muaDays < 0 ? "Gecikti" : `${muaDays} Gün`) : "—" },
                            { label: "Bakım", icon: Wrench, status: criticalMaintenance.length > 0 ? "warning" : "good", info: criticalMaintenance.length > 0 ? `${criticalMaintenance.length} Uyarı` : "Tamam" },
                            { label: "Lastik", icon: Disc3, status: "good", info: vehicle.tireStatus },
                          ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center sm:items-start gap-2">
                              <div className={`p-2 rounded-2xl border ${statusBadge[item.status as keyof typeof statusBadge]} transition-transform group-hover:scale-110`}>
                                <item.icon className="h-4 w-4" />
                              </div>
                              <div className="text-center sm:text-left">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                <p className="text-xs font-bold">{item.info}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Critical Items Strip */}
                        {criticalMaintenance.length > 0 || insStatus !== "good" || muaStatus !== "good" ? (
                          <div className="bg-muted/50 rounded-2xl p-3 border border-border/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] font-bold uppercase tracking-tight">Dikkat Gerekenler</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {insStatus !== "good" && <Badge variant="outline" className="text-[9px] bg-red-500/5 text-red-600 border-red-500/20">Sigorta Yenileme</Badge>}
                              {muaStatus !== "good" && <Badge variant="outline" className="text-[9px] bg-red-500/5 text-red-600 border-red-500/20">Muayene Randevusu</Badge>}
                              {criticalMaintenance.slice(0, 2).map((m, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] bg-amber-500/5 text-amber-600 border-amber-500/20">{m.name}</Badge>
                              ))}
                              {criticalMaintenance.length > 2 && <span className="text-[9px] text-muted-foreground font-medium">+{criticalMaintenance.length - 2} daha</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-bold">Her şey yolunda, tüm kontroller tamam.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}

        {vehicles.length === 0 && (
          <motion.div variants={fadeUp} className="text-center py-16">
            <Car className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Henüz araç eklenmedi.</p>
            <Link href="/vehicles/new" className="mt-4 inline-block text-primary text-sm font-medium hover:underline">Araç ekle →</Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
