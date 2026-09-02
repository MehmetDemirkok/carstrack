"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fuel, Inbox, Plus, Pencil, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getMyFuelRecords, getMyVehicles, deleteFuelRecord } from "@/lib/db";
import { FUEL_TYPE_LABELS, formatTRY, formatLiters, formatConsumption } from "@/lib/fuel";
import type { FuelRecord, Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FuelFormDialog } from "./fuel-form-dialog";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } } };

/**
 * Sürücü/kullanıcı rolü için yakıt alımı ekranı — yalnızca kendi eklediği
 * kayıtları görür/düzenler/siler (RLS: created_by = kendisi) ve yalnızca
 * kendisine atanmış araç(lar) için yakıt kaydı girebilir. Trafik cezaları
 * sürücü görünümüyle aynı görsel dili paylaşır.
 */
export function DriverFuelView() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FuelRecord | null>(null);
  const [toDelete, setToDelete] = useState<FuelRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [r, v] = await Promise.all([getMyFuelRecords(), getMyVehicles()]);
      setRecords(r);
      setVehicles(v);
    } catch {
      toast.error("Yakıt kayıtları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadAll(); } finally { setRefreshing(false); }
  }

  function openAdd() { setEditing(null); setShowForm(true); }
  function openEdit(r: FuelRecord) { setEditing(r); setShowForm(true); }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteFuelRecord(toDelete.id);
      toast.success("Yakıt kaydı silindi");
      setToDelete(null);
      await loadAll();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  const now = new Date();
  const thisMonth = records.filter((r) => {
    const d = new Date(r.fueledAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthCost = thisMonth.reduce((s, r) => s + r.totalAmount, 0);
  const monthLiters = thisMonth.reduce((s, r) => s + r.liters, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-3xl bg-muted/40 animate-pulse" />
        {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* İstatistik şeridi */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
        {[
          { value: formatTRY(monthCost), label: "Bu Ay Harcamam", color: "text-primary", bg: "bg-primary/10" },
          { value: formatLiters(monthLiters), label: "Bu Ay Aldığım Litre", color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp}
            className="glass rounded-2xl p-3.5 border border-border/30 flex flex-col items-center text-center gap-1.5">
            <div className={`p-2 rounded-xl ${s.bg}`}><Fuel className={`h-4 w-4 ${s.color}`} /></div>
            <span className="text-xl font-bold font-outfit leading-none">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Yakıt Ekle CTA */}
      {vehicles.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-2xl border border-border/20 text-sm">
          Yakıt ekleyebilmeniz için önce size bir araç atanmalı.
        </div>
      ) : (
        <button onClick={openAdd} className="w-full text-left">
          <div className="rounded-3xl bg-mesh glow shimmer overflow-hidden relative p-5 shadow-xl shadow-primary/25 flex items-center gap-4">
            <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 relative">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0 relative">
              <p className="font-bold text-white">Yakıt Alımı Ekle</p>
              <p className="text-xs text-white/70">Aldığınız yakıtı sisteme kaydedin</p>
            </div>
          </div>
        </button>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Yakıt Kayıtlarım</h2>
          <button onClick={handleRefresh} disabled={refreshing}
            className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl border border-border/20">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz yakıt kaydınız yok</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5">
            {records.map((r) => (
              <motion.div key={r.id} variants={fadeUp} className="glass rounded-2xl border border-border/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                    <Fuel className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {r.vehiclePlate ?? "Araç"} <span className="text-muted-foreground font-normal">— {FUEL_TYPE_LABELS[r.fuelType]}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {new Date(r.fueledAt).toLocaleDateString("tr-TR")} · {formatLiters(r.liters)} · {r.odometer.toLocaleString("tr-TR")} KM
                      {r.consumptionL100km !== undefined ? ` · ${formatConsumption(r.consumptionL100km)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold">{formatTRY(r.totalAmount)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} title="Düzenle" className="h-7 w-7 rounded-lg hover:bg-muted/60 text-muted-foreground flex items-center justify-center transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setToDelete(r)} title="Sil" className="h-7 w-7 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <FuelFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        vehicles={vehicles}
        onSaved={loadAll}
      />

      {/* Silme onayı */}
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
                <h2 className="font-bold text-base text-red-600 dark:text-red-400">Yakıt Kaydını Sil</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Bu yakıt kaydı <span className="font-semibold text-red-500">kalıcı olarak</span> silinecek.
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
