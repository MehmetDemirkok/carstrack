"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Play,
  StopCircle,
  Car,
  Route,
  Filter,
  X,
  CheckCircle2,
  Check,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  Users,
  Flag,
  RefreshCw,
  MapPin,
  Gauge,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  getVehicles,
  getMyVehicles,
  getTasks,
  getMyActiveTask,
  startTask,
  endTask,
  getMembers,
  createTaskAsManager,
  deleteTask,
  getVehicleStatuses,
  MAX_VEHICLE_TASK_KM,
} from "@/lib/db";
import { exportTasksExcel } from "@/lib/export";
import type { Vehicle, VehicleTask, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────

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
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatKm(n: number): string {
  return n.toLocaleString("tr-TR");
}

// ─── Page ────────────────────────────────────────────────────

export default function TasksPage() {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {profile?.role === "user" ? "Seyahatlerim" : "Görev Takibi"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile?.role === "manager" || profile?.role === "operator"
              ? "Tüm görevleri görüntüle ve yönet"
              : "Seyahatlerinizi başlatın ve takip edin"}
          </p>
        </div>
      </motion.div>

      {profile?.role === "manager" || profile?.role === "operator" ? <ManagerView /> : <StaffView />}
    </div>
  );
}

// ─── Staff / Driver View ──────────────────────────────────────

function StaffView() {
  const { profile, company } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTask, setActiveTask] = useState<VehicleTask | null | undefined>(undefined);
  const [recentTasks, setRecentTasks] = useState<VehicleTask[]>([]);
  const [allMyTasks, setAllMyTasks] = useState<VehicleTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<VehicleTask | null>(null);
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());
  const [busyInfo, setBusyInfo] = useState<Map<string, { driverName?: string; since: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  // Start form
  const [vehicleId, setVehicleId] = useState("");
  const [startKm, setStartKm] = useState("");
  const [description, setDescription] = useState("");

  // End form
  const [endKm, setEndKm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Live timer — re-renders every second while a task is active
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeTask) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [activeTask]);

  async function loadAll(opts?: { notify?: boolean }) {
    try {
      const [v, active, recent, statuses] = await Promise.all([
        getMyVehicles(),
        getMyActiveTask(),
        getTasks({ status: "completed" }),
        getVehicleStatuses(),
      ]);
      setVehicles(v);
      setActiveTask(active);
      setAllMyTasks(recent);
      setRecentTasks(recent.slice(0, 10));
      setBusyVehicleIds(statuses.activeVehicleIds);
      const infoMap = new Map<string, { driverName?: string; since: string }>();
      for (const a of statuses.active) infoMap.set(a.vehicleId, { driverName: a.driverName, since: a.since });
      setBusyInfo(infoMap);

      // Atanmış aracı (kendi aktif görevi hariç) başkasında görevdeyse uyar —
      // önceki sürücü görevi kapatmayı unutmuş olabilir.
      if (opts?.notify) {
        const stuck = v.find((veh) => veh.id !== active?.vehicleId && statuses.activeVehicleIds.has(veh.id));
        if (stuck) {
          const info = infoMap.get(stuck.id);
          toast.warning("Aracınız görevde görünüyor", {
            description: `${stuck.plate}: ${info?.driverName ? info.driverName + " " : "önceki sürücü "}görevi kapatmayı unutmuş olabilir. Yöneticinizle iletişime geçin.`,
            duration: 8000,
          });
        }
      }
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll({ notify: true }); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStart() {
    if (!vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    if (busyVehicleIds.has(vehicleId)) {
      toast.error("Bu araç şu an başka bir görevde. Lütfen müsait bir araç seçin.");
      return;
    }
    const km = parseInt(startKm, 10);
    if (!startKm || isNaN(km) || km < 0) { toast.error("Geçerli bir başlangıç KM girin"); return; }

    setSubmitting(true);
    try {
      const task = await startTask({ vehicleId, startKm: km, description: description.trim() });
      setActiveTask(task);
      setVehicleId(""); setStartKm(""); setDescription("");
      toast.success("Seyahat başlatıldı");
    } catch (err: unknown) {
      const pgErr = err as { code?: string; message?: string };
      if (pgErr?.code === "23505") {
        toast.error("Zaten aktif bir seyahatiniz var");
      } else {
        toast.error(pgErr?.message ?? "Seyahat başlatılamadı");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    if (!activeTask) return;
    const km = parseInt(endKm, 10);
    if (!endKm || isNaN(km)) { toast.error("Geçerli bir bitiş KM girin"); return; }
    if (km < activeTask.startKm) {
      toast.error(`Bitiş KM, başlangıç KM'den (${formatKm(activeTask.startKm)}) küçük olamaz`);
      return;
    }
    const tripKm = km - activeTask.startKm;
    if (tripKm > MAX_VEHICLE_TASK_KM) {
      toast.error(`Bir araç tek görevde en fazla ${formatKm(MAX_VEHICLE_TASK_KM)} km yapabilir. Bu seyahat ${formatKm(tripKm)} km — bitiş KM'yi kontrol edin.`);
      return;
    }

    setSubmitting(true);
    try {
      await endTask(activeTask.id, km);
      setActiveTask(null);
      setEndKm("");
      await loadAll();
      toast.success("Seyahat tamamlandı");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Seyahat bitirilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  function handleExport() {
    if (allMyTasks.length === 0) {
      toast.error("Raporlanacak tamamlanmış seyahat yok");
      return;
    }
    try {
      exportTasksExcel(allMyTasks, vehicles);
      toast.success("Rapor indiriliyor", { description: `${allMyTasks.length} seyahat Excel'e aktarıldı.` });
    } catch {
      toast.error("Rapor oluşturulamadı");
    }
  }

  if (loading || activeTask === undefined) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-3xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const activeVehicle = activeTask ? vehicles.find((v) => v.id === activeTask.vehicleId) : null;

  const todayStr = new Date().toDateString();
  const todayTasks = recentTasks.filter((t) => new Date(t.startTime).toDateString() === todayStr);
  const todayKm = todayTasks.reduce((s, t) => s + (t.distance ?? 0), 0);
  const totalKm = recentTasks.reduce((s, t) => s + (t.distance ?? 0), 0);

  const initials = profile?.fullName
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") ?? "?";

  const inputCls =
    "w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-5">

      {/* ── Profil & İstatistik ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="glass rounded-3xl p-5 border border-border/40 overflow-hidden relative">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/6 rounded-full pointer-events-none" />

          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-xs text-muted-foreground">Hoş geldin,</p>
              <h2 className="text-xl font-bold mt-0.5">{profile?.fullName ?? "Sürücü"}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                {company?.name && (
                  <span className="text-xs text-muted-foreground">{company.name}</span>
                )}
                {company?.name && <span className="text-muted-foreground/40 text-xs">•</span>}
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                  Sürücü
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Yenile"
                className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <div className="h-12 w-12 rounded-2xl bg-mesh flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-bold text-base">{initials}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-muted/40 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold">
                {activeTask ? todayTasks.length + 1 : todayTasks.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Bugünkü Sefer</p>
            </div>
            <div className="bg-muted/40 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold">{formatKm(todayKm)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Bugün KM</p>
            </div>
            <div className="bg-muted/40 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold">{formatKm(totalKm)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Toplam KM</p>
            </div>
          </div>
        </div>
      </motion.div>

      {activeTask ? (
        /* ── Aktif Seyahat ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass rounded-3xl border border-green-500/30 shadow-lg shadow-green-500/10 overflow-hidden">
            <div className="bg-green-500/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  Aktif Seyahat
                </span>
              </div>
              <span className="font-bold tabular-nums text-green-600 dark:text-green-400">
                {formatDuration(activeTask.startTime)}
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">
                    {activeVehicle
                      ? `${activeVehicle.brand} ${activeVehicle.model}`
                      : (activeTask.vehicleName ?? "Araç")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeVehicle?.plate ?? activeTask.vehiclePlate ?? ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Başl. KM</p>
                  <p className="font-bold">{formatKm(activeTask.startKm)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/30 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Başlangıç</p>
                  <p className="font-medium">{formatDateTime(activeTask.startTime)}</p>
                </div>
                <div className="bg-muted/30 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Süre</p>
                  <p className="font-bold">{formatDuration(activeTask.startTime)}</p>
                </div>
              </div>

              {activeTask.description && (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">
                  {activeTask.description}
                </p>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-semibold">Bitiş KM</label>
                <input
                  type="number"
                  min={activeTask.startKm}
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value)}
                  placeholder={`${activeTask.startKm} veya daha fazla`}
                  className="w-full h-14 rounded-2xl border border-border bg-background/60 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  onClick={handleEnd}
                  disabled={submitting || !endKm}
                  className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white border-none shadow-lg font-bold gap-2 text-base"
                >
                  <StopCircle className="h-5 w-5" />
                  {submitting ? "Kaydediliyor..." : "Seyahati Bitir"}
                </Button>
              </div>
            </div>
          </div>

          {/* Diğer atanmış araçlar */}
          {vehicles.filter((v) => v.id !== activeTask.vehicleId).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Diğer Araçlarım
              </p>
              <div className="grid grid-cols-1 gap-2">
                {vehicles
                  .filter((v) => v.id !== activeTask.vehicleId)
                  .map((v) => (
                    <div
                      key={v.id}
                      className="glass rounded-2xl px-4 py-3 border border-border/30 flex items-center gap-3"
                    >
                      <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                        <Car className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{v.plate}</p>
                        <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatKm(v.mileage)} km
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        /* ── Yeni Seyahat Formu ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass rounded-3xl p-6 border border-border/40">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold">Yeni Seyahat Başlat</h2>
                <p className="text-xs text-muted-foreground">Araç seçip başlangıç KM&apos;yi girin</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Araç Kartları */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Araçlarım
                </label>
                {vehicles.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-2xl">
                    <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Henüz araç atanmamış</p>
                    <p className="text-xs mt-0.5">Şirket yetkilisinden araç ataması isteyin</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((v) => {
                      const selected = vehicleId === v.id;
                      const busy = busyVehicleIds.has(v.id);
                      if (busy) {
                        // Görevde olan araç — seçilemez, kırmızı "Araç görevde" gösterilir
                        const info = busyInfo.get(v.id);
                        return (
                          <div
                            key={v.id}
                            className="w-full text-left rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-3 cursor-not-allowed"
                            title="Bu araç şu an başka bir görevde"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                <Car className="h-4 w-4 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold">{v.plate}</p>
                                <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                              </div>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 rounded-lg px-2 py-1 shrink-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                Araç görevde
                              </span>
                            </div>
                            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-500/5 rounded-lg px-2.5 py-1.5 leading-snug">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                              <span>
                                {info?.driverName ? `${info.driverName} ` : "Önceki sürücü "}
                                {info ? `${formatDuration(info.since)} önce başladı — ` : ""}
                                görevi kapatmayı unutmuş olabilir. Yöneticinizle iletişime geçin.
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVehicleId(v.id);
                            if (v.mileage > 0) setStartKm(String(v.mileage));
                            else setStartKm("");
                          }}
                          className={`w-full text-left rounded-2xl border px-4 py-3 transition-all flex items-center gap-3 ${
                            selected
                              ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                              : "border-border/40 bg-muted/20 hover:border-primary/30 hover:bg-muted/30"
                          }`}
                        >
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            selected ? "bg-primary/15" : "bg-muted/50"
                          }`}>
                            <Car className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${selected ? "text-primary" : ""}`}>{v.plate}</p>
                            <p className="text-xs text-muted-foreground">{v.brand} {v.model} • {v.mileage.toLocaleString("tr-TR")} km</p>
                          </div>
                          {selected ? (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-2 py-1 shrink-0">
                              Müsait
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {vehicles.every((v) => busyVehicleIds.has(v.id)) && (
                      <p className="text-xs text-center text-muted-foreground bg-muted/20 rounded-2xl py-3">
                        Tüm araçlarınız şu an görevde. Müsait araç olduğunda seçebilirsiniz.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Başlangıç KM
                </label>
                <input
                  type="number"
                  min="0"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  placeholder="Örn: 45000"
                  className={inputCls}
                />
                {vehicleId && vehicles.find((v) => v.id === vehicleId) && (
                  <p className="text-xs text-muted-foreground">
                    Son kayıtlı: {vehicles.find((v) => v.id === vehicleId)!.mileage.toLocaleString("tr-TR")} km
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Açıklama{" "}
                  <span className="normal-case font-normal text-muted-foreground">(isteğe bağlı)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nereye gidiyorsunuz?"
                  rows={2}
                  className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <Button
                onClick={handleStart}
                disabled={submitting || !vehicleId || !startKm}
                className="w-full h-14 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/20 font-bold gap-2 text-base"
              >
                <Play className="h-5 w-5" />
                {submitting ? "Başlatılıyor..." : "Seyahate Başla"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Son Seyahatler ── */}
      {recentTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
              Son Seyahatlerim
            </h3>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground/80 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Rapor Al
              <span className="text-[10px] text-muted-foreground font-normal">({allMyTasks.length})</span>
            </button>
          </div>
          <div className="space-y-2">
            {recentTasks.map((task) => {
              const v = vehicles.find((x) => x.id === task.vehicleId);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left glass rounded-2xl p-4 border border-border/30 space-y-3 hover-lift transition-all hover:border-primary/30 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {v ? `${v.brand} ${v.model}` : (task.vehicleName ?? "Araç")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v?.plate ?? task.vehiclePlate ?? ""}
                        {" • "}
                        {formatDateTime(task.startTime)}
                        {task.endTime && ` • ${formatDuration(task.startTime, task.endTime)}`}
                      </p>
                    </div>
                    {task.distance != null && (
                      <span className="text-sm font-bold text-primary shrink-0">
                        +{formatKm(task.distance)} km
                      </span>
                    )}
                  </div>

                  {/* Gidilen yer */}
                  {task.description && (
                    <div className="flex items-start gap-1.5 text-xs text-foreground/80 bg-muted/30 rounded-xl px-2.5 py-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-px" />
                      <span className="leading-snug">{task.description}</span>
                    </div>
                  )}

                  {/* KM detayı: başlangıç → bitiş */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Gauge className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-foreground/70">{formatKm(task.startKm)}</span>
                    <span>→</span>
                    <span className="font-medium text-foreground/70">
                      {task.endKm != null ? formatKm(task.endKm) : "—"}
                    </span>
                    <span className="text-muted-foreground/60">km</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Seyahat Detay Modalı ── */}
      {selectedTask && (() => {
        const v = vehicles.find((x) => x.id === selectedTask.vehicleId);
        const isActive = selectedTask.status === "active";
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTask(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-sm p-6 space-y-5"
            >
              <button
                onClick={() => setSelectedTask(null)}
                aria-label="Kapat"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base truncate">
                    {v ? `${v.brand} ${v.model}` : (selectedTask.vehicleName ?? "Araç")}
                  </h2>
                  <p className="text-xs text-muted-foreground">{v?.plate ?? selectedTask.vehiclePlate ?? ""}</p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                {isActive ? "Aktif Seyahat" : "Tamamlandı"}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 rounded-2xl px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Başlangıç KM</p>
                  <p className="font-bold text-sm">{formatKm(selectedTask.startKm)}</p>
                </div>
                <div className="bg-muted/40 rounded-2xl px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Bitiş KM</p>
                  <p className="font-bold text-sm">{selectedTask.endKm != null ? formatKm(selectedTask.endKm) : "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-2xl px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Mesafe</p>
                  <p className="font-bold text-sm text-primary">{selectedTask.distance != null ? `${formatKm(selectedTask.distance)} km` : "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-2xl px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Süre</p>
                  <p className="font-bold text-sm">
                    {isActive
                      ? formatDuration(selectedTask.startTime)
                      : selectedTask.endTime
                        ? formatDuration(selectedTask.startTime, selectedTask.endTime)
                        : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Başlangıç</span>
                  <span className="font-medium">{formatDateTime(selectedTask.startTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Bitiş</span>
                  <span className="font-medium">{selectedTask.endTime ? formatDateTime(selectedTask.endTime) : "—"}</span>
                </div>
              </div>

              {selectedTask.description && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Açıklama</p>
                  <p className="text-sm bg-muted/40 rounded-xl px-3 py-2.5 leading-snug">{selectedTask.description}</p>
                </div>
              )}

              <Button
                onClick={() => { exportTasksExcel([selectedTask], vehicles); toast.success("Rapor indiriliyor"); }}
                variant="outline"
                className="w-full rounded-xl gap-2"
              >
                <Download className="h-4 w-4" />
                Bu Seyahatin Raporunu Al
              </Button>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Manager View ─────────────────────────────────────────────

function ManagerView() {
  const [tasks, setTasks]       = useState<VehicleTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [members, setMembers]   = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters
  const [fVehicle, setFVehicle] = useState("");
  const [fMember, setFMember]   = useState("");
  const [fDept, setFDept]       = useState("");
  const [fFrom, setFFrom]       = useState("");
  const [fTo, setFTo]           = useState("");
  const [fStatus, setFStatus]   = useState("");

  // Add task form
  const [showAddForm, setShowAddForm]       = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [addForm, setAddForm] = useState({
    vehicleId: "", driverId: "", startKm: "", description: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Delete task
  const [taskToDelete, setTaskToDelete]       = useState<VehicleTask | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting]   = useState(false);

  // End task (manager)
  const [taskToEnd, setTaskToEnd]         = useState<VehicleTask | null>(null);
  const [showEndTask, setShowEndTask]     = useState(false);
  const [managerEndKm, setManagerEndKm]   = useState("");
  const [endSubmitting, setEndSubmitting] = useState(false);

  const hasFilters = fVehicle || fMember || fDept || fFrom || fTo || fStatus;

  const departments = Array.from(
    new Set(members.map((m) => m.department).filter(Boolean))
  ).sort();

  type TaskFilters = {
    vehicleId?: string; driverId?: string; department?: string;
    dateFrom?: string; dateTo?: string; status?: string;
  };

  // Canlı yenilemenin doğru filtreyle çalışması için son uygulanan filtreyi tut.
  const appliedFilters = useRef<TaskFilters>({});

  async function loadAll(filters?: TaskFilters, opts?: { silent?: boolean }) {
    if (filters) appliedFilters.current = filters;
    const active = filters ?? appliedFilters.current;
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [t, v, m] = await Promise.all([
        getTasks({
          vehicleId:  active.vehicleId  || undefined,
          driverId:   active.driverId   || undefined,
          department: active.department || undefined,
          dateFrom:   active.dateFrom   || undefined,
          dateTo:     active.dateTo     || undefined,
          status:     (active.status as "active" | "completed") || undefined,
        }),
        // Araçları her zaman taze çek: görev bitince araç KM'si (mileage) güncellenir
        // ve db cache temizlenir; böylece bir sonraki görevde başlangıç KM doğru
        // (bir önceki görevin bitiş KM'si) gelir ve yönetici/şoför görünümleri eşleşir.
        getVehicles(),
        members.length  ? Promise.resolve(members)  : getMembers(),
      ]);
      setTasks(t);
      setVehicles(v as Vehicle[]);
      setMembers(m as Profile[]);
      setLastUpdated(new Date());
    } catch {
      // Sessiz yenilemede kullanıcıyı rahatsız etme; sadece manuel/ilk yüklemede uyar.
      if (!opts?.silent) toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      if (opts?.silent) setRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Canlı yenileme — sekme görünürken her 15 sn'de bir sessizce tazele.
  // Güncel loadAll closure'ını ref ile çağır ki taze vehicles/members kullanılsın.
  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadAllRef.current(undefined, { silent: true });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  function handleSearch() {
    loadAll({ vehicleId: fVehicle, driverId: fMember, department: fDept, dateFrom: fFrom, dateTo: fTo, status: fStatus });
  }

  function clearFilters() {
    setFVehicle(""); setFMember(""); setFDept(""); setFFrom(""); setFTo(""); setFStatus("");
    loadAll({});
  }

  function openAddForm() {
    setAddForm({ vehicleId: "", driverId: "", startKm: "", description: "" });
    setShowAddForm(true);
  }

  function submitAddForm() {
    if (!addForm.vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    if (!addForm.driverId)  { toast.error("Lütfen bir personel seçin"); return; }
    const km = parseInt(addForm.startKm, 10);
    if (!addForm.startKm || isNaN(km) || km < 0) { toast.error("Geçerli bir başlangıç KM girin"); return; }
    setShowAddForm(false);
    setShowAddConfirm(true);
  }

  async function confirmAdd() {
    setAddSubmitting(true);
    try {
      await createTaskAsManager({
        vehicleId: addForm.vehicleId,
        driverId:  addForm.driverId,
        startKm:   parseInt(addForm.startKm, 10),
        description: addForm.description.trim(),
      });
      setShowAddConfirm(false);
      toast.success("Görev oluşturuldu", { description: "Personele görev başarıyla atandı." });
      loadAll();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Görev oluşturulamadı");
    } finally {
      setAddSubmitting(false);
    }
  }

  function openEndTask(task: VehicleTask) {
    setTaskToEnd(task);
    setManagerEndKm("");
    setShowEndTask(true);
  }

  async function confirmEndTask() {
    if (!taskToEnd) return;
    const km = parseInt(managerEndKm, 10);
    if (!managerEndKm || isNaN(km)) { toast.error("Geçerli bir bitiş KM girin"); return; }
    if (km < taskToEnd.startKm) {
      toast.error(`Bitiş KM, başlangıç KM'den (${formatKm(taskToEnd.startKm)}) küçük olamaz`);
      return;
    }
    const tripKm = km - taskToEnd.startKm;
    if (tripKm > MAX_VEHICLE_TASK_KM) {
      toast.error(`Bir araç tek görevde en fazla ${formatKm(MAX_VEHICLE_TASK_KM)} km yapabilir. Bu seyahat ${formatKm(tripKm)} km — bitiş KM'yi kontrol edin.`);
      return;
    }
    // Aynı gün toplamı için sunucu (endTask) nihai kontrolü yapar.
    setEndSubmitting(true);
    try {
      await endTask(taskToEnd.id, km);
      setShowEndTask(false);
      setTaskToEnd(null);
      toast.success("Görev tamamlandı");
      loadAll();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Görev bitirilemedi");
    } finally {
      setEndSubmitting(false);
    }
  }

  function requestDelete(task: VehicleTask) {
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (!taskToDelete) return;
    setDeleteSubmitting(true);
    try {
      await deleteTask(taskToDelete.id);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
      toast.success("Görev silindi");
      loadAll();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Görev silinemedi");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const totalKm     = tasks.reduce((s, t) => s + (t.distance ?? 0), 0);

  const selCls = "h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";
  const inpCls = "w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-6">
      {/* Stats + Add button */}
      <div className="flex items-start gap-3">
        <div className="grid grid-cols-3 gap-3 flex-1">
          {[
            { label: "Toplam Görev", value: tasks.length,              Icon: ClipboardList, accent: false },
            { label: "Aktif Görev",  value: activeCount,               Icon: Play,          accent: activeCount > 0 },
            { label: "Toplam KM",    value: `${formatKm(totalKm)} km`, Icon: Route,         accent: false },
          ].map(({ label, value, Icon, accent }) => (
            <div
              key={label}
              className={`glass rounded-2xl p-4 border ${accent ? "border-green-500/30" : "border-border/30"}`}
            >
              <Icon className={`h-4 w-4 mb-2 ${accent ? "text-green-500" : "text-muted-foreground"}`} />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <Button
          onClick={openAddForm}
          className="h-10 rounded-xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold px-4 shrink-0 gap-1.5 self-start mt-0"
        >
          <Plus className="h-4 w-4" /> Görev Ekle
        </Button>
      </div>

      {/* Live status */}
      <div className="flex items-center justify-between -mt-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Canlı
          {lastUpdated && (
            <span className="text-muted-foreground/60">
              • {lastUpdated.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} güncellendi
            </span>
          )}
        </div>
        <button
          onClick={() => loadAll(undefined, { silent: true })}
          disabled={refreshing}
          title="Yenile"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground/80 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-3xl p-4 border border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filtreler
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
            >
              <X className="h-3 w-3" /> Temizle
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <select value={fVehicle} onChange={(e) => setFVehicle(e.target.value)} className={selCls}>
            <option value="">Tüm Araçlar</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
            ))}
          </select>
          <select value={fMember} onChange={(e) => setFMember(e.target.value)} className={selCls}>
            <option value="">Tüm Personel</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}{m.department ? ` — ${m.department}` : ""}
              </option>
            ))}
          </select>
          <select value={fDept} onChange={(e) => setFDept(e.target.value)} className={selCls}>
            <option value="">Tüm Departmanlar</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selCls}>
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="completed">Tamamlandı</option>
          </select>
          <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={selCls} />
          <div className="flex gap-2">
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="flex-1 h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <Button onClick={handleSearch} className="h-10 rounded-xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold px-4 shrink-0">
              Filtrele
            </Button>
          </div>
        </div>
      </div>

      {/* Export row */}
      {tasks.length > 0 && !loading && (
        <div className="flex justify-end">
          <button
            onClick={() => exportTasksExcel(tasks, vehicles)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-sm font-semibold text-foreground/80 hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            Excel&apos;e Aktar
            <span className="text-xs text-muted-foreground font-normal">({tasks.length} kayıt)</span>
          </button>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Görev bulunamadı</p>
          {hasFilters && <p className="text-sm mt-1">Filtreleri temizleyerek tekrar deneyin</p>}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => {
              const v = vehicles.find((x) => x.id === task.vehicleId);
              const isActive = task.status === "active";
              return (
                <div key={task.id} className="glass rounded-2xl p-4 border border-border/40 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{v?.plate ?? task.vehiclePlate ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{v ? `${v.brand} ${v.model}` : (task.vehicleName ?? "")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                        {isActive ? "Aktif" : "Tamamlandı"}
                      </span>
                      <button
                        onClick={() => requestDelete(task)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isActive && (
                    <button
                      onClick={() => openEndTask(task)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-xs py-2.5 transition-colors shadow-sm"
                    >
                      <Flag className="h-4 w-4" /> Görevi Bitir
                    </button>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{task.driverName ?? "—"}</span>
                    {task.driverDepartment && <span className="text-muted-foreground">{task.driverDepartment}</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-muted/40 rounded-xl p-2.5">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Mesafe</p>
                      <p className="text-sm font-bold">{task.distance != null ? `${formatKm(task.distance)} km` : "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Süre</p>
                      <p className="text-sm font-bold">{isActive ? formatDuration(task.startTime) : task.endTime ? formatDuration(task.startTime, task.endTime) : "—"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Başl. KM</p>
                      <p className="text-sm font-bold">{formatKm(task.startKm)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(task.startTime)}</p>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  {["Araç", "Personel", "Başl. KM", "Bitiş KM", "Mesafe", "Süre", "Durum", "Tarih", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {tasks.map((task) => {
                  const v = vehicles.find((x) => x.id === task.vehicleId);
                  const isActive = task.status === "active";
                  return (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium">{v?.plate ?? task.vehiclePlate ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{v ? `${v.brand} ${v.model}` : (task.vehicleName ?? "")}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium">{task.driverName ?? "—"}</p>
                        {task.driverDepartment && <p className="text-xs text-muted-foreground">{task.driverDepartment}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatKm(task.startKm)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{task.endKm != null ? formatKm(task.endKm) : "—"}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{task.distance != null ? `${formatKm(task.distance)} km` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {isActive ? formatDuration(task.startTime) : task.endTime ? formatDuration(task.startTime, task.endTime) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                          {isActive ? "Aktif" : "Tamamlandı"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(task.startTime)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <button
                              onClick={() => openEndTask(task)}
                              className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3 py-1.5 transition-colors shadow-sm whitespace-nowrap"
                              title="Görevi Bitir"
                            >
                              <Flag className="h-3.5 w-3.5" /> Görevi Bitir
                            </button>
                          )}
                          <button
                            onClick={() => requestDelete(task)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Görevi Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ADD TASK FORM DIALOG ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-md p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-base">Yeni Görev Oluştur</h2>
                <p className="text-xs text-muted-foreground">Personele araç görevi atayın</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Araç</label>
                <select
                  value={addForm.vehicleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const v = vehicles.find((x) => x.id === id);
                    setAddForm((f) => ({ ...f, vehicleId: id, startKm: v && v.mileage > 0 ? String(v.mileage) : f.startKm }));
                  }}
                  className={inpCls}
                >
                  <option value="">Araç seçin...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.brand} {v.model} ({formatKm(v.mileage)} km)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Personel
                </label>
                <select
                  value={addForm.driverId}
                  onChange={(e) => setAddForm((f) => ({ ...f, driverId: e.target.value }))}
                  className={inpCls}
                >
                  <option value="">Personel seçin...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}{m.department ? ` — ${m.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Başlangıç KM</label>
                <input
                  type="number"
                  min="0"
                  value={addForm.startKm}
                  onChange={(e) => setAddForm((f) => ({ ...f, startKm: e.target.value }))}
                  placeholder="Örn: 45000"
                  className={inpCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Açıklama <span className="font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Görev açıklaması..."
                  rows={2}
                  className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowAddForm(false)}>
                İptal
              </Button>
              <Button
                className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none"
                onClick={submitAddForm}
              >
                Devam
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── ADD CONFIRMATION POPUP ── */}
      {showAddConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-3xl border border-amber-500/30 shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h2 className="font-bold text-base">Kritik İşlem Onayı</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Şirket yetkilisi olarak görev oluşturmak, seçilen personele <span className="font-semibold text-foreground">araç kullanım yetkisi</span> verir ve kilometre takibini başlatır. Bu işlem sistemde kalıcı bir kayıt oluşturur.
                </p>
              </div>

              {/* Summary */}
              <div className="w-full bg-muted/40 rounded-2xl p-3 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Araç</span>
                  <span className="font-semibold">
                    {vehicles.find((v) => v.id === addForm.vehicleId)?.plate ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Personel</span>
                  <span className="font-semibold">
                    {members.find((m) => m.id === addForm.driverId)?.fullName ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Başl. KM</span>
                  <span className="font-semibold">{formatKm(parseInt(addForm.startKm, 10))} km</span>
                </div>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Devam etmek istediğinize emin misiniz?
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => { setShowAddConfirm(false); setShowAddForm(true); }}
                disabled={addSubmitting}
              >
                Geri Dön
              </Button>
              <Button
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white border-none font-semibold"
                onClick={confirmAdd}
                disabled={addSubmitting}
              >
                {addSubmitting ? "Oluşturuluyor..." : "Evet, Oluştur"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── END TASK DIALOG ── */}
      {showEndTask && taskToEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !endSubmitting && setShowEndTask(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-card rounded-3xl border border-green-500/30 shadow-2xl w-full max-w-sm p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <Flag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-base">Görevi Bitir</h2>
                <p className="text-xs text-muted-foreground">
                  {taskToEnd.vehiclePlate ?? "—"} · {taskToEnd.driverName ?? "—"}
                </p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Başlangıç KM</span>
                <span className="font-semibold">{formatKm(taskToEnd.startKm)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Süre</span>
                <span className="font-semibold">{formatDuration(taskToEnd.startTime)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Bitiş KM</label>
              <input
                type="number"
                min={taskToEnd.startKm}
                value={managerEndKm}
                onChange={(e) => setManagerEndKm(e.target.value)}
                placeholder={`${taskToEnd.startKm} veya daha fazla`}
                className="w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEndTask(false)} disabled={endSubmitting}>
                İptal
              </Button>
              <Button
                className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white border-none font-semibold"
                onClick={confirmEndTask}
                disabled={endSubmitting || !managerEndKm}
              >
                {endSubmitting ? "Kaydediliyor..." : "Görevi Tamamla"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION POPUP ── */}
      {showDeleteConfirm && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleteSubmitting && setShowDeleteConfirm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-3xl border border-red-500/30 shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-base text-red-600 dark:text-red-400">Kritik İşlem — Silme</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Bu görevi silmek tüm kayıt bilgilerini <span className="font-semibold text-foreground">kalıcı olarak siler</span>. Araç kullanım geçmişinden kaldırılır ve bu işlem <span className="font-semibold text-red-500">geri alınamaz</span>.
                </p>
              </div>

              {/* Summary */}
              <div className="w-full bg-muted/40 rounded-2xl p-3 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Araç</span>
                  <span className="font-semibold">{taskToDelete.vehiclePlate ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Personel</span>
                  <span className="font-semibold">{taskToDelete.driverName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarih</span>
                  <span className="font-semibold">{formatDateTime(taskToDelete.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durum</span>
                  <span className={`font-semibold ${taskToDelete.status === "active" ? "text-green-500" : "text-muted-foreground"}`}>
                    {taskToDelete.status === "active" ? "Aktif" : "Tamamlandı"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Bu işlemi onaylamak için emin olmanız gerekiyor.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteSubmitting}
              >
                İptal
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-none font-semibold"
                onClick={confirmDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? "Siliniyor..." : "Evet, Sil"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
