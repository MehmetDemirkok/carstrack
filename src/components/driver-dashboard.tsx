"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Car, ClipboardList, Play, Route, CheckCircle2, Gauge,
  ChevronRight, MapPin, Clock, StopCircle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getMyVehicles, getMyActiveTask, getTasks, getVehicleStatuses } from "@/lib/db";
import type { Vehicle, VehicleTask } from "@/lib/types";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } } };

function formatKm(n: number): string {
  return n.toLocaleString("tr-TR");
}

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa ${mins % 60} dk`;
  const days = Math.floor(hours / 24);
  return `${days} gün ${hours % 24} sa`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function DriverDashboard() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTask, setActiveTask] = useState<VehicleTask | null>(null);
  const [recent, setRecent] = useState<VehicleTask[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [busyInfo, setBusyInfo] = useState<Map<string, { driverName?: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  // Aktif seyahat için canlı sayaç
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeTask) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [activeTask]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [v, active, completed, statuses] = await Promise.all([
          getMyVehicles(),
          getMyActiveTask(),
          getTasks({ status: "completed" }),
          getVehicleStatuses(),
        ]);
        if (cancelled) return;
        setVehicles(v);
        setActiveTask(active);
        setRecent(completed.slice(0, 5));
        setBusyIds(statuses.activeVehicleIds);
        const m = new Map<string, { driverName?: string }>();
        for (const a of statuses.active) m.set(a.vehicleId, { driverName: a.driverName });
        setBusyInfo(m);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeVehicle = activeTask ? vehicles.find((v) => v.id === activeTask.vehicleId) : null;

  const todayStr = new Date().toDateString();
  const todayTrips = recent.filter((t) => new Date(t.startTime).toDateString() === todayStr);
  const totalKm = recent.reduce((s, t) => s + (t.distance ?? 0), 0);

  const initials = profile?.fullName
    ?.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") ?? "?";

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-5 max-w-3xl mx-auto">
        <div className="h-40 rounded-3xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
        {[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-28 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />
      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-5">

        {/* ── Karşılama ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-3xl bg-mesh glow shimmer overflow-hidden relative p-5 md:p-6 shadow-xl shadow-primary/25">
            <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start justify-between relative">
              <div className="min-w-0">
                <p className="text-primary-foreground/70 text-xs">Hoş geldin,</p>
                <h1 className="text-2xl md:text-3xl font-black font-outfit text-primary-foreground mt-0.5 truncate">
                  {profile?.fullName ?? "Sürücü"}
                </h1>
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className="text-[11px] bg-white/15 text-primary-foreground px-2.5 py-0.5 rounded-full font-semibold">
                    Sürücü
                  </span>
                  {activeTask ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] bg-green-500/25 text-white px-2.5 py-0.5 rounded-full font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" /> Görevde
                    </span>
                  ) : (
                    <span className="text-[11px] bg-white/15 text-primary-foreground px-2.5 py-0.5 rounded-full font-semibold">
                      Müsait
                    </span>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-white font-bold">{initials}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Aktif Seyahat / CTA ── */}
        {activeTask ? (
          <motion.div variants={fadeUp}>
            <div className="glass rounded-3xl border border-green-500/30 shadow-lg shadow-green-500/10 overflow-hidden">
              <div className="bg-green-500/10 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">Aktif Seyahat</span>
                </div>
                <span className="font-bold tabular-nums text-green-600 dark:text-green-400">
                  {formatDuration(activeTask.startTime)}
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">
                      {activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : (activeTask.vehicleName ?? "Araç")}
                    </p>
                    <p className="text-sm text-muted-foreground">{activeVehicle?.plate ?? activeTask.vehiclePlate ?? ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Başl. KM</p>
                    <p className="font-bold">{formatKm(activeTask.startKm)}</p>
                  </div>
                </div>
                <Link href="/tasks" className="block">
                  <div className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-lg font-bold flex items-center justify-center gap-2 transition-colors">
                    <StopCircle className="h-5 w-5" /> Seyahati Bitir
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <Link href="/tasks" className="block">
              <div className="glass rounded-3xl p-5 border border-border/40 flex items-center gap-4 hover:border-primary/40 transition-colors">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">Yeni Seyahat Başlat</p>
                  <p className="text-xs text-muted-foreground">Müsait bir araç seçip yola çıkın</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── İstatistik ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
          {[
            { icon: Car, value: String(vehicles.length), label: "Aracım", color: "text-violet-500", bg: "bg-violet-500/10" },
            { icon: ClipboardList, value: String(activeTask ? todayTrips.length + 1 : todayTrips.length), label: "Bugünkü Sefer", color: "text-sky-500", bg: "bg-sky-500/10" },
            { icon: Route, value: `${formatKm(totalKm)}`, label: "Toplam KM", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-3.5 border border-border/30 flex flex-col items-center text-center gap-1.5">
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <span className="text-lg md:text-xl font-bold font-outfit leading-none">{s.value}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Araçlarım (durum) ── */}
        <motion.div variants={fadeUp} className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Araçlarım</h2>
            <Link href="/vehicles">
              <span className="text-[11px] text-primary font-medium flex items-center gap-0.5">Tümü <ChevronRight className="h-3 w-3" /></span>
            </Link>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-2xl border border-border/20">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Henüz araç atanmamış</p>
              <p className="text-xs mt-0.5">Şirket yetkilisinden araç ataması isteyin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map((v) => {
                const busy = busyIds.has(v.id);
                const mine = activeTask?.vehicleId === v.id;
                return (
                  <Link key={v.id} href={`/vehicles/${v.id}`} className="block">
                    <div className="glass rounded-2xl px-4 py-3 border border-border/30 flex items-center gap-3 hover:border-primary/30 transition-colors">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${busy ? "bg-red-500/10" : "bg-green-500/10"}`}>
                        <Car className={`h-4 w-4 ${busy ? "text-red-500" : "text-green-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{v.plate}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.brand} {v.model}
                          <span className="inline-flex items-center gap-1 ml-1.5">
                            <Gauge className="h-3 w-3" /> {formatKm(v.mileage)} km
                          </span>
                        </p>
                      </div>
                      {busy ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 rounded-lg px-2 py-1 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          {mine ? "Sizde" : "Görevde"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-2 py-1 shrink-0">
                          Müsait
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Son Seyahatlerim ── */}
        {recent.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">Son Seyahatlerim</h2>
            <div className="space-y-2">
              {recent.map((task) => {
                const v = vehicles.find((x) => x.id === task.vehicleId);
                return (
                  <div key={task.id} className="glass rounded-2xl px-4 py-3 border border-border/30 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {v ? `${v.brand} ${v.model}` : (task.vehicleName ?? "Araç")}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(task.startTime)}
                        {task.endTime && ` • ${formatDuration(task.startTime, task.endTime)}`}
                      </p>
                    </div>
                    {task.distance != null && (
                      <span className="text-sm font-bold text-primary shrink-0 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> +{formatKm(task.distance)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
