"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Gavel, Filter, X, Plus, Inbox, Trash2, AlertTriangle,
  Check, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTrafficFines, getVehicles, getDrivers,
  markTrafficFineStatus, deleteTrafficFine,
} from "@/lib/db";
import type { Vehicle, Profile, TrafficFine, TrafficFineStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FineStatusBadge, STATUS_META, STATUS_ORDER } from "./fine-badges";
import { FineFormDialog } from "./fine-form-dialog";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatTRY(n: number): string {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}

export function ManagerFinesView() {
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fVehicle, setFVehicle] = useState("");
  const [fDriver, setFDriver] = useState("");
  const [fStatus, setFStatus] = useState("");

  // Create/edit modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TrafficFine | null>(null);

  // Delete confirm
  const [toDelete, setToDelete] = useState<TrafficFine | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [f, v, d] = await Promise.all([getTrafficFines(), getVehicles(), getDrivers()]);
      setFines(f);
      setVehicles(v);
      setDrivers(d);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = fVehicle || fDriver || fStatus;
  const filtered = useMemo(() => fines.filter((f) =>
    (!fVehicle || f.vehicleId === fVehicle) &&
    (!fDriver || f.driverId === fDriver) &&
    (!fStatus || f.status === fStatus)
  ), [fines, fVehicle, fDriver, fStatus]);

  function clearFilters() { setFVehicle(""); setFDriver(""); setFStatus(""); }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(f: TrafficFine) {
    setEditing(f);
    setShowForm(true);
  }

  async function handleStatusChange(f: TrafficFine, status: TrafficFineStatus) {
    try {
      await markTrafficFineStatus(f.id, status);
      setFines((prev) => prev.map((x) => x.id === f.id ? { ...x, status, paidAt: status === "paid" ? new Date().toISOString() : undefined } : x));
      toast.success("Durum güncellendi", { description: STATUS_META[status].label });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Durum güncellenemedi");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTrafficFine(toDelete.id);
      setFines((prev) => prev.filter((f) => f.id !== toDelete.id));
      setToDelete(null);
      toast.success("Ceza kaydı silindi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  const counts = {
    total: fines.length,
    unpaid: fines.filter((f) => f.status === "unpaid").length,
    paid: fines.filter((f) => f.status === "paid").length,
    totalUnpaidAmount: fines.filter((f) => f.status === "unpaid").reduce((s, f) => s + f.amount, 0),
  };

  const selCls = "h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam", value: counts.total, accent: "border-border/30", color: "text-muted-foreground" },
          { label: "Ödenmedi", value: counts.unpaid, accent: counts.unpaid > 0 ? "border-red-500/30" : "border-border/30", color: "text-red-500" },
          { label: "Ödendi", value: counts.paid, accent: "border-border/30", color: "text-emerald-500" },
          { label: "Bekleyen Tutar", value: formatTRY(counts.totalUnpaidAmount), accent: "border-border/30", color: "text-amber-500" },
        ].map(({ label, value, accent, color }) => (
          <div key={label} className={`glass rounded-2xl p-4 border ${accent}`}>
            <Gavel className={`h-4 w-4 mb-2 ${color}`} />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Yeni ceza CTA */}
      <button onClick={openCreate} className="w-full text-left">
        <div className="rounded-3xl bg-mesh glow shimmer overflow-hidden relative p-5 shadow-xl shadow-primary/25 flex items-center gap-4">
          <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 relative">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative">
            <p className="font-bold text-white">Yeni Trafik Cezası</p>
            <p className="text-xs text-white/70">Tebligat fotoğrafı yükleyip AI ile doldurun veya elle girin</p>
          </div>
        </div>
      </button>

      {/* Filters */}
      <div className="glass rounded-3xl p-4 border border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4" /> Filtreler</div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
              <X className="h-3 w-3" /> Temizle
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={fVehicle} onChange={(e) => setFVehicle(e.target.value)} className={selCls}>
            <option value="">Tüm Araçlar</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
          </select>
          <select value={fDriver} onChange={(e) => setFDriver(e.target.value)} className={selCls}>
            <option value="">Tüm Sürücüler</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selCls}>
            <option value="">Tüm Durumlar</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Ceza kaydı bulunamadı</p>
          {hasFilters && <p className="text-sm mt-1">Filtreleri temizleyerek tekrar deneyin</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const overdue = f.status === "unpaid" && f.dueDate && new Date(f.dueDate) < new Date();
            return (
              <div key={f.id} className="glass rounded-2xl border border-border/40 p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${STATUS_META[f.status].bg}`}>
                    <Gavel className={`h-5 w-5 ${STATUS_META[f.status].text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{f.violationType || "Trafik cezası"}</p>
                      <FineStatusBadge status={f.status} />
                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" /> Vade Geçti
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold text-foreground/70">{f.vehiclePlate ?? "—"}</span>
                      {" · "}{formatTRY(f.amount)}
                      {f.driverName ? ` · ${f.driverName}` : " · Sürücü atanmadı"}
                      {" · "}{formatDate(f.fineDate)}
                      {f.dueDate ? ` · Son ödeme: ${formatDate(f.dueDate)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {f.status !== "paid" && (
                    <Button
                      onClick={() => handleStatusChange(f, "paid")}
                      className="h-9 rounded-xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold px-3 gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Ödendi İşaretle
                    </Button>
                  )}
                  <select
                    value={f.status}
                    onChange={(e) => handleStatusChange(f, e.target.value as TrafficFineStatus)}
                    className="h-9 rounded-xl border border-border/50 bg-muted/30 text-xs font-semibold px-2"
                  >
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                  <button
                    onClick={() => openEdit(f)}
                    title="Düzenle"
                    className="h-9 w-9 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground flex items-center justify-center transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setToDelete(f)}
                    title="Sil"
                    className="h-9 w-9 ml-auto rounded-xl border border-border/50 bg-muted/30 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FineFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        vehicles={vehicles}
        drivers={drivers}
        onSaved={loadAll}
      />

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setToDelete(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-3xl border border-red-500/30 shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl"><AlertTriangle className="h-8 w-8 text-red-500" /></div>
              <div>
                <h2 className="font-bold text-base text-red-600 dark:text-red-400">Ceza Kaydını Sil</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <span className="font-semibold text-foreground">{toDelete.vehiclePlate}</span> aracına ait ceza kaydı <span className="font-semibold text-red-500">kalıcı olarak</span> silinecek.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setToDelete(null)} disabled={deleting}>İptal</Button>
              <Button
                onClick={confirmDelete} disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-none font-semibold"
              >
                {deleting ? "Siliniyor..." : "Evet, Sil"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
