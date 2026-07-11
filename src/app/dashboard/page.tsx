"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import Image from "next/image";
import { calculateHealthScore, getFleetAlerts } from "@/lib/store";
import type { FleetAlert } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useData } from "@/context/data-context";
import { HealthScoreBreakdown } from "@/components/health-score-breakdown";
import { FleetRiskOverview } from "@/components/fleet-risk-overview";
import { ServiceActivityChart } from "@/components/service-activity-chart";
import { FleetComposition } from "@/components/fleet-composition";
import { AnimatedCounter } from "@/components/animated-counter";
import { DriverDashboard } from "@/components/driver-dashboard";
import { PWAInstallCard } from "@/components/pwa-install";
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
  BatteryCharging,
  CheckCircle2,
  Send,
  X,
  History,
  FileWarning,
  Wallet,
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
  info: "bg-violet-500/5 border-violet-500/20 dark:bg-violet-500/10",
};
const severityIconStyle = {
  critical: "bg-red-500/15 text-red-500",
  warning: "bg-orange-500/15 text-orange-500",
  info: "bg-violet-500/15 text-violet-500",
};

const categoryIcon = {
  insurance: Shield,
  "green-card": Shield,
  inspection: Calendar,
  maintenance: Wrench,
  tire: Disc3,
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { vehicles, records, loading: dataLoading } = useData();
  const [telegramBannerDismissed, setTelegramBannerDismissed] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);

  const showTelegramBanner = !telegramBannerDismissed && !profile?.telegramChatId;

  // GÜVENLİK: Telegram bağlama, tahmin edilebilir user.id yerine sunucuda
  // üretilen tek-kullanımlık koda dayanır (C-3).
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const handleTelegramConnect = async () => {
    const tab = window.open("", "_blank");
    setTelegramConnecting(true);
    try {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.url) {
        if (tab) tab.location.href = json.url as string;
        else window.location.href = json.url as string;
      } else {
        tab?.close();
        toast.error("Bağlantı oluşturulamadı", { description: json?.error || "Tekrar deneyin." });
      }
    } catch {
      tab?.close();
      toast.error("Bağlantı hatası");
    } finally {
      setTelegramConnecting(false);
    }
  };

  const vehicleIds = new Set(vehicles.map((x) => x.id));
  const alerts: FleetAlert[] = getFleetAlerts(vehicles);
  const filteredRecords = records.filter((rec) => vehicleIds.has(rec.vehicleId));

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

  const recentRecords = [...filteredRecords]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const unpaidRecords = filteredRecords.filter((r) => r.paymentStatus === "unpaid");
  const unpaidTotal = unpaidRecords.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  // Sürücü rolü kısıtlı kendi panelini görür (bakım/servis/telegram/filo skoru yok)
  if (profile?.role === "user") return <DriverDashboard />;

  if (dataLoading) return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
        <div className="lg:col-span-7 space-y-5">
          <div className="h-40 md:h-52 rounded-3xl bg-muted/40 animate-pulse" />
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />)}
          </div>
        </div>
        <div className="lg:col-span-5 space-y-5">
          <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}
          </div>
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />)}
          </div>
        </div>
      </div>
    </div>
  );

  const hasVehicles = vehicles.length > 0;
  const heroStatus =
    !hasVehicles
      ? { label: "ARAÇ BEKLENİYOR", dot: "bg-white/60", desc: "Henüz araç eklenmedi" }
      : fleetScore >= 85
      ? { label: "MÜKEMMEL DURUM", dot: "bg-[oklch(0.85_0.15_162)]", desc: "Filonuz tepe verimlilikte çalışıyor. Tüm kritik sistemler güncel." }
      : fleetScore >= 65
      ? { label: "İYİ DURUMDA", dot: "bg-amber-300", desc: "Filonuz genel olarak iyi durumda, bazı araçlar dikkat gerektiriyor." }
      : { label: "ACİL BAKIM", dot: "bg-red-300", desc: "Acil bakım gerektiren araçlar var." };

  return (
    <div className="p-4 md:p-8 relative">
      {/* Ambient page background */}
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 lg:space-y-6">
        {/* PWA Yükleme kartı */}
        <motion.div variants={fadeUp}>
          <PWAInstallCard />
        </motion.div>

        {/* Telegram bağlantı banner */}
        {showTelegramBanner && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl px-4 py-3">
              <div className="p-2 bg-sky-500/15 rounded-xl shrink-0">
                <Send className="h-4 w-4 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Telegram Bildirimlerini Aç</p>
                <p className="text-[11px] text-muted-foreground">Filo uyarılarını anında Telegram&apos;dan al</p>
              </div>
              {user?.id ? (
                <button
                  type="button"
                  onClick={handleTelegramConnect}
                  disabled={telegramConnecting}
                  className="shrink-0 text-xs font-semibold text-sky-500 border border-sky-500/30 rounded-xl px-3 py-1.5 hover:bg-sky-500/10 transition-colors disabled:opacity-50"
                >
                  {telegramConnecting ? "..." : "Bağla"}
                </button>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-sky-500/40 border border-sky-500/15 rounded-xl px-3 py-1.5 cursor-not-allowed">
                  Bağla
                </span>
              )}
              <button
                onClick={() => setTelegramBannerDismissed(true)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Hızlı Eylemler ──────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2 md:gap-3">
          {[
            { icon: Plus, label: "Araç Ekle", href: "/vehicles/new", gradient: "from-blue-400 via-blue-500 to-indigo-600", shadow: "shadow-blue-500/30" },
            { icon: Car, label: "Filo", href: "/vehicles", gradient: "from-cyan-300 via-teal-500 to-emerald-600", shadow: "shadow-teal-500/30" },
            { icon: History, label: "Servis", href: "/history", gradient: "from-amber-300 via-amber-500 to-orange-600", shadow: "shadow-amber-500/30" },
            { icon: FileWarning, label: "Arıza Bildir", href: "/reports", gradient: "from-rose-400 via-red-500 to-red-600", shadow: "shadow-red-500/30" },
          ].map((action) => (
            <Link href={action.href} key={action.href} className="tap-highlight-transparent">
              <motion.div whileTap={{ scale: 0.96 }}>
                <Card className="rounded-2xl border-border/40 shadow-sm hover-lift group cursor-pointer">
                  <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center text-center gap-1.5 md:gap-2.5">
                    <div
                      className={`relative overflow-hidden w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg ${action.shadow} ring-1 ring-white/15 flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_60%)]" />
                      <action.icon className="h-5 w-5 md:h-6 md:w-6 text-white relative z-10 drop-shadow-sm" strokeWidth={2.25} />
                    </div>
                    <span className="text-[10px] md:text-xs font-semibold leading-tight">{action.label}</span>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* ── ROW 1: Hero score + Skor dağılımı ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <motion.div variants={fadeUp} className={hasVehicles ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card className="h-full rounded-[2rem] border-none shadow-2xl shadow-primary/30 overflow-hidden relative bg-mesh glow shimmer group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_55%)]" />
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float-slow" />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 group-hover:scale-110 transition-transform duration-700 hidden md:block">
                <Sparkles className="h-28 w-28 text-white" />
              </div>
              <CardContent className="relative z-10 p-6 md:p-10 h-full flex items-center min-h-[14rem]">
                <div className="flex items-center gap-6 md:gap-10">
                  {/* Ring */}
                  <div className="relative shrink-0">
                    <svg className="w-28 h-28 md:w-36 md:h-36 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
                      {hasVehicles && (
                        <motion.circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke="oklch(0.85 0.15 162)" strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray="264"
                          initial={{ strokeDashoffset: 264 }}
                          animate={{ strokeDashoffset: 264 - fleetScore * 2.64 }}
                          transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl md:text-6xl font-black font-outfit text-white tracking-tight leading-none">
                        {hasVehicles ? <AnimatedCounter value={fleetScore} /> : "—"}
                      </span>
                      {hasVehicles && <span className="text-[10px] font-mono text-white/60 mt-1">/100</span>}
                    </div>
                  </div>
                  {/* Copy */}
                  <div className="min-w-0">
                    <h2 className="font-outfit text-xl md:text-3xl font-bold text-white mb-1">Filo Sağlık Skoru</h2>
                    <p className="text-white/80 text-xs md:text-sm max-w-sm leading-relaxed">{heroStatus.desc}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur rounded-full text-white text-[10px] font-mono tracking-wide">
                        <span className={`w-2 h-2 rounded-full ${heroStatus.dot} animate-pulse`} />
                        {heroStatus.label}
                      </span>
                      {criticalCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAlertsDialog(true)}
                          className="text-[10px] bg-red-500/25 text-red-100 px-2.5 py-1 rounded-full font-semibold self-center hover:bg-red-500/40 transition-colors cursor-pointer"
                        >
                          {criticalCount} kritik
                        </button>
                      )}
                      {warningCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAlertsDialog(true)}
                          className="text-[10px] bg-orange-500/25 text-orange-100 px-2.5 py-1 rounded-full font-semibold self-center hover:bg-orange-500/40 transition-colors cursor-pointer"
                        >
                          {warningCount} uyarı
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {hasVehicles && (
            <motion.div variants={fadeUp}>
              <HealthScoreBreakdown vehicles={vehicles} />
            </motion.div>
          )}
        </div>

        {/* ── ROW 2: Filo risk + hızlı istatistikler ─────────────────── */}
        {hasVehicles && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 lg:gap-6">
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <FleetRiskOverview vehicles={vehicles} />
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-2 grid grid-cols-3 gap-3 md:gap-4">
              {[
                { icon: Car, value: vehicles.length, label: "Araç", color: "text-primary", bg: "bg-primary/10", ring: "from-primary/40 to-primary/0", onClick: undefined },
                { icon: AlertTriangle, value: criticalCount + warningCount, label: "Uyarı", color: "text-orange-500", bg: "bg-orange-500/10", ring: "from-orange-500/40 to-orange-500/0", onClick: criticalCount + warningCount > 0 ? () => setShowAlertsDialog(true) : undefined },
                { icon: CheckCircle2, value: records.length, label: "Servis", color: "text-[var(--success)] dark:text-emerald-400", bg: "bg-[var(--success)]/10", ring: "from-emerald-500/40 to-emerald-500/0", onClick: undefined },
              ].map((stat, i) => (
                <Card
                  key={i}
                  onClick={stat.onClick}
                  className={`rounded-[1.5rem] border-border/40 shadow-sm hover-lift relative overflow-hidden group ${stat.onClick ? "cursor-pointer" : ""}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${stat.ring} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center text-center gap-1.5 h-full">
                    <div className={`p-2.5 md:p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <span className="text-xl md:text-3xl font-bold font-outfit leading-none tracking-tight">
                      <AnimatedCounter value={stat.value} />
                    </span>
                    <span className="text-[10px] md:text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        )}

        {/* ── ROW 2b: Servis aktivitesi + filo kompozisyonu ───────────── */}
        {hasVehicles && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
            <motion.div variants={fadeUp} className="lg:col-span-3">
              <ServiceActivityChart records={filteredRecords} />
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <FleetComposition vehicles={vehicles} />
            </motion.div>
          </div>
        )}

        {/* ── ROW 3: Aktif filo + yan kolon ──────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-8">
          {/* Active fleet */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-outfit text-lg md:text-xl font-bold">Aktif Filo Durumu</h3>
              <Link href="/vehicles">
                <Button variant="ghost" size="sm" className="text-[11px] md:text-xs text-primary h-7 px-2 gap-1 hover:bg-primary/10">
                  Tümünü Gör <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {!hasVehicles ? (
              <Link href="/vehicles/new">
                <Card className="rounded-2xl border-dashed border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <CardContent className="p-10 flex flex-col items-center text-center gap-3">
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
              <div className="space-y-3 md:space-y-4">
                {vehicles.map((vehicle) => {
                  const score = calculateHealthScore(vehicle);
                  const tone =
                    score >= 85
                      ? { text: "text-[var(--success)] dark:text-emerald-400", bar: "bg-mint", chip: "bg-[var(--success)] text-white", chipLabel: "İyi" }
                      : score >= 65
                      ? { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", chip: "bg-amber-500 text-white", chipLabel: "Dikkat" }
                      : { text: "text-red-600 dark:text-red-400", bar: "bg-red-500", chip: "bg-red-500 text-white", chipLabel: "Kritik" };
                  return (
                    <Link href={`/vehicles/${vehicle.id}`} key={vehicle.id} className="block tap-highlight-transparent">
                      <motion.div whileTap={{ scale: 0.99 }}>
                        <Card className="rounded-2xl overflow-hidden shadow-sm border-border/40 hover-lift group">
                          <div className="flex h-[120px] md:h-40">
                            <div className="w-[34%] max-w-[180px] relative shrink-0 bg-muted overflow-hidden">
                              {vehicle.image ? (
                                <Image src={vehicle.image} alt={vehicle.plate} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="180px" />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-primary/10 flex items-center justify-center">
                                  <Car className="h-10 w-10 text-primary/30" />
                                </div>
                              )}
                              <span className={`absolute top-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded-full ${tone.chip}`}>
                                {tone.chipLabel}
                              </span>
                            </div>
                            <div className="flex-1 p-3.5 md:p-5 flex flex-col justify-between min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <span className="font-outfit font-bold text-sm md:text-lg tracking-tight block truncate">{vehicle.plate}</span>
                                  <span className="text-[11px] md:text-sm text-muted-foreground">{vehicle.brand} {vehicle.model} • {vehicle.year}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`text-xl md:text-2xl font-bold font-outfit leading-none ${tone.text}`}>
                                    <AnimatedCounter value={score} />
                                  </span>
                                  <span className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Skor</span>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] md:text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                                  <span>{vehicle.mileage.toLocaleString("tr-TR")} km</span>
                                  <span className="text-foreground font-semibold normal-case">{vehicle.color}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                  <motion.div
                                    className={`${tone.bar} h-full rounded-full`}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: score / 100 }}
                                    transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                                    style={{ originX: 0, transformOrigin: "left" }}
                                  />
                                </div>
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
          </div>

          {/* Side column: alerts + upcoming + recent service */}
          <div className="space-y-5 lg:space-y-6">
            {/* Alerts */}
            {alerts.length > 0 && (
              <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
                <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">Uyarılar</h3>
                <div className="space-y-2 md:space-y-2.5">
                  {alerts.slice(0, 4).map((alert) => {
                    const Icon = categoryIcon[alert.category];
                    const accentBar = alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-orange-500" : "bg-primary";
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
                              <h4 className="font-semibold text-xs">{alert.title}</h4>
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

            {/* Ödemeler — ödenmemiş servis masrafları */}
            {unpaidRecords.length > 0 && (
              <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">Ödemeler</h3>
                  <Link href="/history">
                    <Button variant="ghost" size="sm" className="text-[11px] text-primary h-7 px-2 gap-1 hover:bg-primary/10">
                      Tümü <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <Card className="rounded-2xl border-destructive/20 shadow-sm bg-destructive/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-destructive/10 shrink-0">
                        <Wallet className="h-4.5 w-4.5 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold font-outfit text-destructive leading-none">₺{unpaidTotal.toLocaleString("tr-TR")}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{unpaidRecords.length} ödenmemiş servis kaydı</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {unpaidRecords.slice(0, 3).map((r) => {
                        const v = vehicles.find((x) => x.id === r.vehicleId);
                        return (
                          <Link href={v ? `/vehicles/${v.id}` : "/history"} key={r.id} className="flex items-center justify-between gap-2 bg-card/60 rounded-xl px-3 py-2 hover:bg-card transition-colors">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{r.title}{v ? ` • ${v.plate}` : ""}</p>
                              {r.unpaidReason && <p className="text-[10px] text-muted-foreground truncate">{r.unpaidReason}</p>}
                            </div>
                            <span className="text-xs font-bold text-destructive shrink-0">₺{(r.cost ?? 0).toLocaleString("tr-TR")}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Upcoming Maintenance */}
            {upcomingMaintenance.length > 0 && (
              <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
                <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">Yaklaşan Bakımlar</h3>
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

            {/* Recent Activity — timeline */}
            {recentRecords.length > 0 && (
              <motion.div variants={fadeUp} className="space-y-2.5 md:space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">Son Servis</h3>
                  <Link href="/history">
                    <Button variant="ghost" size="sm" className="text-[11px] text-primary h-7 px-2 gap-1 hover:bg-primary/10">
                      Tümü <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <Card className="rounded-2xl border-border/40 shadow-sm">
                  <CardContent className="p-5 space-y-5">
                    {recentRecords.map((record, i) => {
                      const vehicle = vehicles.find((v) => v.id === record.vehicleId);
                      const last = i === recentRecords.length - 1;
                      return (
                        <div
                          key={record.id}
                          className={`relative pl-7 ${last ? "" : "before:content-[''] before:absolute before:left-[9px] before:top-7 before:-bottom-5 before:w-px before:bg-border/60"}`}
                        >
                          <div className="absolute left-0 top-0.5 w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center">
                            <Wrench className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold truncate">{record.title}</p>
                            <span className="text-[9px] font-mono text-muted-foreground shrink-0">{record.date.split("-").reverse().join(".")}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle?.plate}</p>
                          <p className="text-[10px] font-mono font-bold text-primary mt-1">{record.mileage.toLocaleString("tr-TR")} KM</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {!hasVehicles && alerts.length === 0 && (
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-primary/20 shadow-sm bg-primary/5">
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
        </div>
      </motion.div>

      {/* Uyarı detayları — hero rozetleri ve "Uyarı" istatistik kartından açılır */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" /> Filo Uyarıları ({alerts.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 md:space-y-2.5 py-1">
            {alerts.map((alert) => {
              const Icon = categoryIcon[alert.category];
              const accentBar = alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-orange-500" : "bg-primary";
              return (
                <Link href={`/vehicles/${alert.vehicleId}`} key={alert.id} onClick={() => setShowAlertsDialog(false)}>
                  <div
                    className={`relative p-3.5 pl-4 rounded-2xl border flex gap-3 items-start transition-all cursor-pointer overflow-hidden hover-lift ${severityStyle[alert.severity]}`}
                  >
                    <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${accentBar}`} />
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${severityIconStyle[alert.severity]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-xs">{alert.title}</h4>
                        <span className="text-[9px] font-bold text-muted-foreground shrink-0">{alert.vehiclePlate}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <DialogClose render={<Button variant="outline" className="w-full rounded-xl" />}>Kapat</DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
