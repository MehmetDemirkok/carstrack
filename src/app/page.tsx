"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { calculateHealthScore, getFleetAlerts } from "@/lib/store";
import { getVehicles, getRecords } from "@/lib/db";
import type { Vehicle, ServiceRecord, FleetAlert } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { HealthScoreBreakdown } from "@/components/health-score-breakdown";
import { FleetRiskOverview } from "@/components/fleet-risk-overview";
import {
  Car,
  ChevronRight,
  AlertTriangle,
  Info,
  Shield,
  Wrench,
  Plus,
  Disc3,
  Calendar,
  Sparkles,
  Clock,
  BatteryCharging,
  CheckCircle2,
} from "lucide-react";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const severityIcon = { critical: AlertTriangle, warning: AlertTriangle, info: Info };
const severityStyle = {
  critical: "bg-red-500/5 border-red-500/20 dark:bg-red-500/10",
  warning: "bg-orange-500/5 border-orange-500/20 dark:bg-orange-500/10",
  info: "bg-blue-500/5 border-blue-500/20 dark:bg-blue-500/10",
};
const severityIconStyle = {
  critical: "bg-red-500/15 text-red-500",
  warning: "bg-orange-500/15 text-orange-500",
  info: "bg-blue-500/15 text-blue-500",
};

const categoryIcon = {
  insurance: Shield,
  inspection: Calendar,
  maintenance: Wrench,
  tire: Disc3,
};

export default function Dashboard() {
  const { loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const [v, r] = await Promise.all([getVehicles(), getRecords()]);
        if (cancelled) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVehicles(v);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecords(r);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAlerts(getFleetAlerts(v));
      } catch (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        console.error("Dashboard load failed:", msg);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading]);

  const scores = vehicles.map((v) => calculateHealthScore(v));
  const fleetScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const upcomingMaintenance = vehicles.flatMap((v) =>
    v.maintenanceItems
      .filter((item) => {
        if (item.intervalKm && item.lastDoneMileage !== undefined) {
          const remaining = (item.lastDoneMileage + item.intervalKm) - v.mileage;
          if (remaining <= 3000) return true;
        }
        return false;
      })
      .map((item) => ({
        vehicle: v,
        item,
        remaining: item.lastDoneMileage !== undefined && item.intervalKm
          ? (item.lastDoneMileage + item.intervalKm) - v.mileage
          : null,
      }))
  ).slice(0, 4);

  const recentRecords = [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="p-4 md:p-8 space-y-6 relative">
      {/* Ambient page background */}
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
        {/* LEFT */}
        <div className="lg:col-span-7 space-y-5 lg:space-y-8">
          {/* Fleet Health Hero */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-3xl border-none shadow-2xl shadow-primary/30 overflow-hidden relative bg-mesh glow shimmer">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_55%)]" />
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/8 rounded-full blur-3xl animate-float-slow" />
              <div className="absolute -left-12 top-1/2 w-32 h-32 bg-[color:var(--primary-3)]/30 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
              <CardContent className="p-5 md:p-8 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-primary-foreground/70 text-xs md:text-sm font-medium">Filo Sağlık Skoru</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl md:text-7xl font-black font-outfit text-primary-foreground tracking-tight">
                        {vehicles.length > 0 ? fleetScore : "—"}
                      </span>
                      {vehicles.length > 0 && (
                        <span className="text-primary-foreground/60 text-sm md:text-base font-medium">/100</span>
                      )}
                    </div>
                    <p className="text-primary-foreground/60 text-[11px] md:text-sm">
                      {vehicles.length === 0
                        ? "Henüz araç eklenmedi"
                        : fleetScore >= 85
                        ? "Filonuz genel olarak iyi durumda"
                        : fleetScore >= 65
                        ? "Bazı araçlar dikkat gerektiriyor"
                        : "Acil bakım gerektiren araçlar var"}
                    </p>
                    {(criticalCount > 0 || warningCount > 0) && (
                      <div className="flex gap-2 mt-2">
                        {criticalCount > 0 && (
                          <span className="text-[10px] bg-red-500/20 text-red-200 px-2 py-0.5 rounded-full font-semibold">
                            {criticalCount} kritik
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="text-[10px] bg-orange-500/20 text-orange-200 px-2 py-0.5 rounded-full font-semibold">
                            {warningCount} uyarı
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <svg className="w-20 h-20 md:w-32 md:h-32 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                      {vehicles.length > 0 && (
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke="rgba(255,255,255,0.9)" strokeWidth="8"
                          strokeDasharray={`${fleetScore * 2.64} ${264 - fleetScore * 2.64}`}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 md:h-10 md:w-10 text-primary-foreground/80" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Vehicle Cards */}
          <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs md:text-sm font-semibold uppercase tracking-widest"><span className="text-gradient">Araçlarım</span></h2>
              <Link href="/vehicles">
                <Button variant="ghost" size="sm" className="text-[11px] md:text-xs text-primary h-7 px-2 gap-1 hover:bg-primary/10">
                  Tümünü Gör <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {vehicles.length === 0 ? (
              <Link href="/vehicles/new">
                <Card className="rounded-2xl border-dashed border-2 border-border/40 hover:border-primary/40 transition-colors">
                  <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">İlk aracını ekle</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Filonu yönetmeye başla</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                {vehicles.map((vehicle) => {
                  const score = calculateHealthScore(vehicle);
                  return (
                    <Link href={`/vehicles/${vehicle.id}`} key={vehicle.id} className="block tap-highlight-transparent">
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Card className="rounded-2xl overflow-hidden shadow-sm border-border/40 hover-lift">
                          <div className="flex h-[108px] md:h-32">
                            <div className="w-[120px] md:w-[160px] relative shrink-0 bg-muted">
                              {vehicle.image ? (
                                <Image src={vehicle.image} alt={vehicle.plate} fill className="object-cover" sizes="160px" />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-primary/10 flex items-center justify-center">
                                  <Car className="h-10 w-10 text-primary/30" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card" />
                            </div>
                            <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <span className="font-outfit font-bold text-sm md:text-base tracking-tight block truncate">{vehicle.plate}</span>
                                  <span className="text-[11px] md:text-xs text-muted-foreground">{vehicle.brand} {vehicle.model} • {vehicle.year}</span>
                                </div>
                                <Badge variant="outline" className={`text-[10px] md:text-xs h-5 md:h-6 px-1.5 rounded-lg font-bold shrink-0 border-none ${score >= 85 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : score >= 65 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                  {score}
                                </Badge>
                              </div>
                              <div className="space-y-1 md:space-y-1.5">
                                <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                                  <span>{vehicle.mileage.toLocaleString("tr-TR")} km</span>
                                  <span className="font-semibold text-foreground">{vehicle.color}</span>
                                </div>
                                <Progress
                                  value={score}
                                  className="h-1.5 md:h-2"
                                  indicatorClassName={score >= 85 ? "bg-emerald-500" : score >= 65 ? "bg-amber-500" : "bg-red-500"}
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-5 space-y-5 lg:space-y-8">
          {/* Health Score Breakdown */}
          {vehicles.length > 0 && (
            <motion.div variants={fadeUp}>
              <HealthScoreBreakdown vehicles={vehicles} />
            </motion.div>
          )}

          {/* Fleet Risk Overview */}
          {vehicles.length > 0 && (
            <motion.div variants={fadeUp}>
              <FleetRiskOverview vehicles={vehicles} />
            </motion.div>
          )}

          {/* Quick stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { icon: Car, value: String(vehicles.length), label: "Araç", color: "text-blue-500", bg: "bg-blue-500/10", ring: "from-blue-500/40 to-blue-500/0" },
              { icon: AlertTriangle, value: String(criticalCount + warningCount), label: "Uyarı", color: "text-orange-500", bg: "bg-orange-500/10", ring: "from-orange-500/40 to-orange-500/0" },
              { icon: CheckCircle2, value: String(records.length), label: "Servis", color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "from-emerald-500/40 to-emerald-500/0" },
            ].map((stat, i) => (
              <Card key={i} className="rounded-2xl border-border/40 shadow-sm hover-lift relative overflow-hidden group">
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${stat.ring} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-1.5">
                  <div className={`p-2 md:p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </div>
                  <span className="text-lg md:text-2xl font-bold font-outfit leading-none tracking-tight">{stat.value}</span>
                  <span className="text-[10px] md:text-xs text-muted-foreground font-medium">{stat.label}</span>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
              <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">Uyarılar</h2>
              <div className="space-y-2 md:space-y-2.5">
                {alerts.slice(0, 4).map((alert) => {
                  const Icon = categoryIcon[alert.category];
                  const accentBar = alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-orange-500" : "bg-blue-500";
                  return (
                    <Link href={`/vehicles/${alert.vehicleId}`} key={alert.id}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`relative p-3.5 pl-4 rounded-2xl border flex gap-3 items-start transition-all cursor-pointer overflow-hidden hover-lift ${severityStyle[alert.severity]}`}
                      >
                        <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${accentBar}`} />
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${severityIconStyle[alert.severity]}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-xs">{alert.title}</h3>
                            <span className="text-[9px] font-bold text-muted-foreground shrink-0">{alert.vehiclePlate}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
                {alerts.length > 4 && (
                  <Link href="/history">
                    <p className="text-[11px] text-center text-primary font-medium py-1">{alerts.length - 4} uyarı daha →</p>
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {/* Upcoming Maintenance */}
          {upcomingMaintenance.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
              <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">Yaklaşan Bakımlar</h2>
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-0">
                  {upcomingMaintenance.map((um, i) => (
                    <div key={`${um.vehicle.id}-${um.item.id}`}>
                      {i > 0 && <div className="h-px bg-border/40 mx-4" />}
                      <Link href={`/vehicles/${um.vehicle.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors rounded-2xl">
                        <div className={`p-2 rounded-xl shrink-0 ${um.remaining !== null && um.remaining <= 500 ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                          <Wrench className={`h-4 w-4 ${um.remaining !== null && um.remaining <= 500 ? "text-red-500" : "text-amber-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{um.item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{um.vehicle.plate}</p>
                        </div>
                        {um.remaining !== null && (
                          <span className={`text-xs font-bold shrink-0 ${um.remaining <= 500 ? "text-red-500" : "text-amber-500"}`}>
                            {um.remaining <= 0 ? "Gecikmeli" : `${um.remaining.toLocaleString("tr-TR")} km`}
                          </span>
                        )}
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity */}
          {recentRecords.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">Son Servis</h2>
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-[11px] text-primary h-7 px-2 gap-1 hover:bg-primary/10">
                    Tümü <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-0">
                  {recentRecords.map((record, i) => {
                    const vehicle = vehicles.find((v) => v.id === record.vehicleId);
                    return (
                      <div key={record.id}>
                        {i > 0 && <div className="h-px bg-border/40 mx-4" />}
                        <div className="flex items-center gap-3 p-4">
                          <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{record.title}</p>
                            <p className="text-[10px] text-muted-foreground">{vehicle?.plate} • {record.date.split("-").reverse().join(".")}</p>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0">{record.mileage.toLocaleString("tr-TR")} km</span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {vehicles.length === 0 && alerts.length === 0 && (
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/40 shadow-sm bg-primary/5 border-primary/20">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                    <BatteryCharging className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Başlamaya hazır!</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      İlk aracını ekleyerek filonu yönetmeye başla.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
