"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getVehicles, calculateHealthScore, getMaintenanceStatusForItem, getMaintenanceProgress, getFleetAlerts } from "@/lib/store";
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
    const v = getVehicles();
    setVehicles(v);
    setAlerts(getFleetAlerts(v));
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
          return (
            <motion.div variants={fadeUp} key={vehicle.id} className="space-y-3">
              <Link href={`/vehicles/${vehicle.id}`} className="flex items-center justify-between px-1 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${score >= 85 ? "bg-emerald-500/10" : score >= 65 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                    <Car className={`h-4 w-4 ${score >= 85 ? "text-emerald-500" : score >= 65 ? "text-amber-500" : "text-red-500"}`} />
                  </div>
                  <div>
                    <span className="text-sm font-bold">{vehicle.plate}</span>
                    <span className="text-xs text-muted-foreground ml-2">{vehicle.brand} {vehicle.model}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs font-black font-outfit px-2 py-0.5 rounded-lg ${score >= 85 ? "bg-emerald-500/10 text-emerald-600" : score >= 65 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}>
                    {score}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>

              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {/* Documents */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Belgeler</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Shield, label: "Sigorta", days: insDays, date: vehicle.insuranceExpiry },
                        { icon: Calendar, label: "Muayene", days: muaDays, date: vehicle.inspectionExpiry },
                      ].map((doc) => {
                        const st = docStatus(doc.days);
                        const Icon = StatusIcon[st];
                        return (
                          <div key={doc.label} className={`p-2.5 rounded-xl border ${statusBadge[st]}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <doc.icon className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-semibold">{doc.label}</span>
                            </div>
                            <p className="text-xs font-bold">{doc.date ? doc.date.split("-").reverse().join(".") : "—"}</p>
                            {doc.days !== null && (
                              <p className="text-[10px] mt-0.5">
                                {doc.days < 0 ? `${Math.abs(doc.days)}g geçti` : `${doc.days}g kaldı`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tire & Battery */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ekipman</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-muted/50 border border-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          {vehicle.tireStatus === "Yazlık" ? <Sun className="h-3.5 w-3.5 text-orange-500" /> : vehicle.tireStatus === "Kışlık" ? <Snowflake className="h-3.5 w-3.5 text-blue-500" /> : <Layers className="h-3.5 w-3.5 text-teal-500" />}
                          <span className="text-[10px] font-semibold">Lastik</span>
                        </div>
                        <p className="text-xs font-bold truncate">{vehicle.tireStatus}</p>
                        {vehicle.tireBrand && <p className="text-[10px] text-muted-foreground truncate">{vehicle.tireBrand}</p>}
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/50 border border-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BatteryCharging className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="text-[10px] font-semibold">Akü</span>
                        </div>
                        <p className="text-xs font-bold truncate">{vehicle.batteryBrand || "—"}</p>
                        {vehicle.batteryInstallDate && <p className="text-[10px] text-muted-foreground">{vehicle.batteryInstallDate.split("-")[0]}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Maintenance items */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bakım Kalemleri</p>
                    <div className="space-y-2">
                      {vehicle.maintenanceItems.map((item) => {
                        const st = getMaintenanceStatusForItem(item, vehicle.mileage);
                        const prog = getMaintenanceProgress(item, vehicle.mileage);
                        const Icon = StatusIcon[st];
                        return (
                          <div key={item.id} className="flex items-center gap-3">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${st === "good" ? "text-emerald-500" : st === "warning" ? "text-amber-500" : "text-red-500"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[11px] font-medium truncate">{item.name}</span>
                                <Badge className={`text-[9px] font-bold border ml-2 shrink-0 ${statusBadge[st]}`}>{statusLabel[st]}</Badge>
                              </div>
                              <Progress value={prog} className="h-1.5" indicatorClassName={statusColor[st]} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
