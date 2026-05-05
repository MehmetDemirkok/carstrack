"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Play,
  StopCircle,
  Car,
  Clock,
  Route,
  Filter,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  getVehicles,
  getTasks,
  getMyActiveTask,
  startTask,
  endTask,
  getDrivers,
} from "@/lib/db";
import type { Vehicle, VehicleTask, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} dk`;
  return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
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
          <h1 className="text-2xl font-bold">Görev Takibi</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.role === "manager"
              ? "Tüm görevleri görüntüle ve yönet"
              : "Araç görevlerini başlat ve bitir"}
          </p>
        </div>
      </motion.div>

      {profile?.role === "manager" ? <ManagerView /> : <DriverView />}
    </div>
  );
}

// ─── Driver View ──────────────────────────────────────────────

function DriverView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTask, setActiveTask] = useState<VehicleTask | null | undefined>(undefined);
  const [recentTasks, setRecentTasks] = useState<VehicleTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Start form
  const [vehicleId, setVehicleId] = useState("");
  const [startKm, setStartKm] = useState("");
  const [description, setDescription] = useState("");

  // End form
  const [endKm, setEndKm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    try {
      const [v, active, recent] = await Promise.all([
        getVehicles(),
        getMyActiveTask(),
        getTasks({ status: "completed" }),
      ]);
      setVehicles(v);
      setActiveTask(active);
      setRecentTasks(recent.slice(0, 10));
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    if (!vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    const km = parseInt(startKm, 10);
    if (!startKm || isNaN(km) || km < 0) { toast.error("Geçerli bir başlangıç KM girin"); return; }

    setSubmitting(true);
    try {
      const task = await startTask({ vehicleId, startKm: km, description: description.trim() });
      setActiveTask(task);
      setVehicleId(""); setStartKm(""); setDescription("");
      toast.success("Görev başlatıldı");
    } catch (err: unknown) {
      const pgErr = err as { code?: string; message?: string };
      if (pgErr?.code === "23505") {
        toast.error("Zaten aktif bir göreviniz var");
      } else {
        toast.error(pgErr?.message ?? "Görev başlatılamadı");
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

    setSubmitting(true);
    try {
      await endTask(activeTask.id, km);
      setActiveTask(null);
      setEndKm("");
      await loadAll();
      toast.success("Görev tamamlandı");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Görev bitirilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-48 rounded-3xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const activeVehicle = activeTask
    ? vehicles.find((v) => v.id === activeTask.vehicleId)
    : null;

  return (
    <div className="space-y-6">
      {activeTask ? (
        /* ── Active Task Card ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
              Aktif Görev
            </span>
          </div>

          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold">
                {activeVehicle
                  ? `${activeVehicle.brand} ${activeVehicle.model} • ${activeVehicle.plate}`
                  : (activeTask.vehiclePlate ?? "Araç")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {formatDateTime(activeTask.startTime)} • {formatDuration(activeTask.startTime)} önce
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Route className="h-4 w-4 shrink-0" />
              <span>Başlangıç KM: {formatKm(activeTask.startKm)} km</span>
            </div>
            {activeTask.description && (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
                {activeTask.description}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Bitiş KM</label>
            <input
              type="number"
              min={activeTask.startKm}
              value={endKm}
              onChange={(e) => setEndKm(e.target.value)}
              placeholder={`${activeTask.startKm} veya daha fazla`}
              className="w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button
              onClick={handleEnd}
              disabled={submitting || !endKm}
              className="w-full h-12 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/20 font-semibold gap-2"
            >
              <StopCircle className="h-4 w-4" />
              {submitting ? "Kaydediliyor..." : "Görevi Bitir"}
            </Button>
          </div>
        </motion.div>
      ) : (
        /* ── Start Task Form ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-6 border border-border/40"
        >
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Yeni Görev Başlat
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Araç</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Araç seçin...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Başlangıç KM</label>
              <input
                type="number"
                min="0"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value)}
                placeholder="Örn: 45000"
                className="w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Açıklama{" "}
                <span className="text-muted-foreground font-normal">(isteğe bağlı)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Görev açıklaması..."
                rows={3}
                className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <Button
              onClick={handleStart}
              disabled={submitting || !vehicleId || !startKm}
              className="w-full h-12 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/20 font-semibold gap-2"
            >
              <Play className="h-4 w-4" />
              {submitting ? "Başlatılıyor..." : "Görevi Başlat"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Recent Tasks ── */}
      {recentTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
            Geçmiş Görevlerim
          </h2>
          <div className="space-y-2">
            {recentTasks.map((task) => {
              const v = vehicles.find((x) => x.id === task.vehicleId);
              return (
                <div
                  key={task.id}
                  className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-border/30"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {v
                        ? `${v.brand} ${v.model} • ${v.plate}`
                        : (task.vehiclePlate ?? "Araç")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(task.startTime)}
                      {task.endTime && ` • ${formatDuration(task.startTime, task.endTime)}`}
                    </p>
                  </div>
                  {task.distance != null && (
                    <span className="text-xs font-bold text-primary shrink-0">
                      +{formatKm(task.distance)} km
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Manager View ─────────────────────────────────────────────

type DriverWithAssignment = Profile & { assignedVehicleId: string | null };

function ManagerView() {
  const [tasks, setTasks]     = useState<VehicleTask[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers]  = useState<DriverWithAssignment[]>([]);
  const [loading, setLoading]  = useState(true);

  const [fVehicle, setFVehicle] = useState("");
  const [fDriver, setFDriver]   = useState("");
  const [fFrom, setFFrom]       = useState("");
  const [fTo, setFTo]           = useState("");
  const [fStatus, setFStatus]   = useState("");

  const hasFilters = fVehicle || fDriver || fFrom || fTo || fStatus;

  async function loadAll(filters?: {
    vehicleId?: string; driverId?: string;
    dateFrom?: string; dateTo?: string;
    status?: string;
  }) {
    setLoading(true);
    try {
      const [t, v, d] = await Promise.all([
        getTasks({
          vehicleId: filters?.vehicleId || undefined,
          driverId:  filters?.driverId  || undefined,
          dateFrom:  filters?.dateFrom  || undefined,
          dateTo:    filters?.dateTo    || undefined,
          status:    (filters?.status as "active" | "completed") || undefined,
        }),
        vehicles.length ? Promise.resolve(vehicles) : getVehicles(),
        drivers.length  ? Promise.resolve(drivers)  : getDrivers(),
      ]);
      setTasks(t);
      setVehicles(v as Vehicle[]);
      setDrivers(d as DriverWithAssignment[]);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    loadAll({ vehicleId: fVehicle, driverId: fDriver, dateFrom: fFrom, dateTo: fTo, status: fStatus });
  }

  function clearFilters() {
    setFVehicle(""); setFDriver(""); setFFrom(""); setFTo(""); setFStatus("");
    loadAll();
  }

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const totalKm     = tasks.reduce((s, t) => s + (t.distance ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Toplam Görev", value: tasks.length,            Icon: ClipboardList, accent: false },
          { label: "Aktif Görev",  value: activeCount,             Icon: Play,          accent: activeCount > 0 },
          { label: "Toplam KM",    value: `${formatKm(totalKm)} km`, Icon: Route,       accent: false },
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
          <select
            value={fVehicle}
            onChange={(e) => setFVehicle(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tüm Araçlar</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
            ))}
          </select>
          <select
            value={fDriver}
            onChange={(e) => setFDriver(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tüm Sürücüler</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="completed">Tamamlandı</option>
          </select>
          <input
            type="date"
            value={fFrom}
            onChange={(e) => setFFrom(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="date"
            value={fTo}
            onChange={(e) => setFTo(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button
            onClick={handleSearch}
            className="h-10 rounded-xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold"
          >
            Filtrele
          </Button>
        </div>
      </div>

      {/* Table */}
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
          {hasFilters && (
            <p className="text-sm mt-1">Filtreleri temizleyerek tekrar deneyin</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Araç", "Sürücü", "Başl. KM", "Bitiş KM", "Mesafe", "Süre", "Durum", "Tarih"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
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
                      <p className="text-xs text-muted-foreground">
                        {v ? `${v.brand} ${v.model}` : (task.vehicleName ?? "")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {task.driverName ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatKm(task.startKm)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {task.endKm != null ? formatKm(task.endKm) : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                      {task.distance != null ? `${formatKm(task.distance)} km` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {isActive
                        ? formatDuration(task.startTime)
                        : task.endTime
                        ? formatDuration(task.startTime, task.endTime)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                        {isActive ? "Aktif" : "Tamamlandı"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(task.startTime)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
