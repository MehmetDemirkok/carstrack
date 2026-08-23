"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Filter, X, Plus, Inbox, Trash2, AlertTriangle, Sparkles, ImagePlus,
  Check, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTrafficFines, getVehicles, getDrivers, createTrafficFine, updateTrafficFine,
  markTrafficFineStatus, deleteTrafficFine, uploadFinePhoto,
} from "@/lib/db";
import { fileToBase64, SCAN_MAX_FILE_SIZE, SCAN_ALLOWED_TYPES, SCAN_ALLOWED_EXTS } from "@/lib/file-utils";
import type { Vehicle, Profile, TrafficFine, TrafficFineStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FineStatusBadge, STATUS_META, STATUS_ORDER } from "./fine-badges";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatTRY(n: number): string {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}

interface FineExtracted {
  plate?: string; fineNumber?: string; violationType?: string;
  amount?: string; discountedAmount?: string; fineDate?: string; dueDate?: string; location?: string;
}

const emptyForm = {
  vehicleId: "", driverId: "", fineNumber: "", violationType: "",
  amount: "", discountedAmount: "", fineDate: new Date().toISOString().slice(0, 10),
  dueDate: "", location: "", notes: "",
};

// Trafik cezalarında peşin/erken ödeme indirimi standart olarak 1/4'tür
// (KTK m.115) — tutar girildiğinde kullanıcı elle değiştirmediği sürece bu
// oranla otomatik hesaplanır.
const DISCOUNT_RATE = 0.75;

function calcDiscounted(amountStr: string): string {
  const n = parseFloat(amountStr);
  if (!amountStr || Number.isNaN(n) || n <= 0) return "";
  return String(Math.round(n * DISCOUNT_RATE * 100) / 100);
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
  const [form, setForm] = useState(emptyForm);
  // İndirimli tutar kullanıcı tarafından elle değiştirildi mi? true olduğunda
  // tutar değişse bile otomatik yeniden hesaplanmaz.
  const [discountedTouched, setDiscountedTouched] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setForm(emptyForm);
    setDiscountedTouched(false);
    setPhoto(null);
    setShowForm(true);
  }

  function openEdit(f: TrafficFine) {
    setEditing(f);
    const hasDiscount = f.discountedAmount !== undefined;
    setForm({
      vehicleId: f.vehicleId, driverId: f.driverId ?? "",
      fineNumber: f.fineNumber, violationType: f.violationType,
      amount: String(f.amount),
      discountedAmount: hasDiscount ? String(f.discountedAmount) : calcDiscounted(String(f.amount)),
      fineDate: f.fineDate?.slice(0, 10) ?? "", dueDate: f.dueDate?.slice(0, 10) ?? "",
      location: f.location ?? "", notes: f.notes ?? "",
    });
    setDiscountedTouched(hasDiscount);
    setPhoto(null);
    setShowForm(true);
  }

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Tutar değişince, kullanıcı indirimli tutarı elle değiştirmediyse
  // otomatik olarak 1/4 indirimli karşılığını hesaplar.
  function handleAmountChange(value: string) {
    setForm((prev) => ({
      ...prev,
      amount: value,
      discountedAmount: discountedTouched ? prev.discountedAmount : calcDiscounted(value),
    }));
  }

  function handleDiscountedChange(value: string) {
    setDiscountedTouched(true);
    set("discountedAmount", value);
  }

  function resetDiscountedToAuto() {
    setDiscountedTouched(false);
    setForm((prev) => ({ ...prev, discountedAmount: calcDiscounted(prev.amount) }));
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SCAN_ALLOWED_TYPES.includes(file.type) && !SCAN_ALLOWED_EXTS.includes(ext)) {
      toast.error("Desteklenmeyen dosya", { description: "PDF veya görsel (JPG, PNG, WebP) seçin." });
      return;
    }
    if (file.size > SCAN_MAX_FILE_SIZE) {
      toast.error("Dosya çok büyük", { description: "Maks. 5 MB." });
      return;
    }
    setPhoto(file);
  }

  async function handleAiFill() {
    if (!photo) return;
    setScanning(true);
    try {
      const base64 = await fileToBase64(photo);
      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fileData: base64, mimeType: photo.type || "application/octet-stream", documentType: "fine" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json() as { data: FineExtracted };
      if (!data || Object.keys(data).length === 0) {
        toast.warning("Bilgi bulunamadı", { description: "Tebligattan bilgi çıkarılamadı, alanları elle doldurabilirsiniz." });
        return;
      }

      const updates: Partial<typeof emptyForm> = {};
      if (data.fineNumber) updates.fineNumber = data.fineNumber;
      if (data.violationType) updates.violationType = data.violationType;
      if (data.amount) updates.amount = String(parseFloat(data.amount));
      if (data.discountedAmount) updates.discountedAmount = String(parseFloat(data.discountedAmount));
      if (data.fineDate) updates.fineDate = data.fineDate;
      if (data.dueDate) updates.dueDate = data.dueDate;
      if (data.location) updates.location = data.location;

      let matchedVehicle: Vehicle | undefined;
      if (data.plate) {
        const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");
        matchedVehicle = vehicles.find((v) => norm(v.plate) === norm(data.plate!));
        if (matchedVehicle) updates.vehicleId = matchedVehicle.id;
      }

      // Tebligatta indirimli tutar açıkça yazılıysa onu esas al (elle girilmiş
      // sayılır); yazılı değilse ve kullanıcı daha önce elle değiştirmediyse
      // okunan tutardan otomatik hesapla.
      if (updates.discountedAmount) {
        setDiscountedTouched(true);
      } else if (updates.amount && !discountedTouched) {
        updates.discountedAmount = calcDiscounted(updates.amount);
      }

      setForm((prev) => ({ ...prev, ...updates }));
      toast.success("Tebligat okundu", {
        description: matchedVehicle ? `Plaka ${matchedVehicle.plate} otomatik eşleşti.` : "Bulunan bilgileri kontrol edip kaydedin.",
      });
    } catch {
      toast.error("Tebligat okunamadı", { description: "Alanları elle doldurabilirsiniz." });
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit() {
    if (!form.vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) { toast.error("Lütfen geçerli bir tutar girin"); return; }
    if (!form.fineDate) { toast.error("Lütfen ceza tarihini girin"); return; }

    setSubmitting(true);
    try {
      let photoPath = editing?.photoPath;
      if (photo) {
        try {
          photoPath = await uploadFinePhoto(form.vehicleId, photo);
        } catch {
          toast.error("Fotoğraf yüklenemedi, kayıt fotoğrafsız devam ediyor");
        }
      }

      const payload = {
        vehicleId: form.vehicleId,
        driverId: form.driverId || undefined,
        fineNumber: form.fineNumber.trim(),
        violationType: form.violationType.trim(),
        amount,
        discountedAmount: form.discountedAmount ? parseFloat(form.discountedAmount) : undefined,
        fineDate: form.fineDate,
        dueDate: form.dueDate || undefined,
        location: form.location.trim() || undefined,
        photoPath,
        notes: form.notes.trim(),
      };

      if (editing) {
        await updateTrafficFine(editing.id, payload);
        toast.success("Ceza güncellendi");
      } else {
        await createTrafficFine(payload);
        toast.success("Ceza kaydedildi", {
          description: form.driverId ? "Sürücüye bildirim gönderildi." : undefined,
        });
      }
      setShowForm(false);
      setForm(emptyForm);
      setPhoto(null);
      setEditing(null);
      await loadAll();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
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
  const inputCls = "w-full h-11 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

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

      {/* Create/edit modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-lg p-5 space-y-3 my-4 max-h-[94vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl"><Gavel className="h-5 w-5 text-primary" /></div>
                <h2 className="font-bold text-base">{editing ? "Cezayı Düzenle" : "Yeni Trafik Cezası"}</h2>
              </div>

              {/* Tebligat fotoğrafı + AI */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tebligat Fotoğrafı <span className="normal-case font-normal">(isteğe bağlı)</span>
                </label>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handlePhotoSelect} className="hidden" />
                <div className="flex items-center gap-2">
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-10 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-xs font-semibold"
                  >
                    <ImagePlus className="h-4 w-4" /> {photo ? photo.name : "Fotoğraf / PDF Seç"}
                  </button>
                  {photo && (
                    <Button
                      type="button" onClick={handleAiFill} disabled={scanning}
                      className="h-10 rounded-2xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold px-3 gap-1.5 shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> {scanning ? "Okunuyor..." : "AI ile Doldur"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Araç + Sürücü */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Araç</label>
                  <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} className={inputCls}>
                    <option value="">Araç seçin</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Sürücüye Yansıt <span className="normal-case font-normal">(isteğe bağlı)</span>
                  </label>
                  <select value={form.driverId} onChange={(e) => set("driverId", e.target.value)} className={inputCls}>
                    <option value="">Atanmadı</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">İhlal Türü</label>
                  <input value={form.violationType} onChange={(e) => set("violationType", e.target.value)} placeholder="Örn: Hız İhlali" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tebligat No</label>
                  <input value={form.fineNumber} onChange={(e) => set("fineNumber", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutar (₺)</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => handleAmountChange(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">İndirimli Tutar (₺)</label>
                    {discountedTouched && form.amount && (
                      <button type="button" onClick={resetDiscountedToAuto} className="text-[10px] font-semibold text-primary hover:underline">
                        Otomatiğe dön
                      </button>
                    )}
                  </div>
                  <input type="number" min="0" step="0.01" value={form.discountedAmount} onChange={(e) => handleDiscountedChange(e.target.value)} className={inputCls} />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {discountedTouched ? "Elle girildi" : "1/4 indirimli — otomatik hesaplandı"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ceza Tarihi</label>
                  <input type="date" value={form.fineDate} onChange={(e) => set("fineDate", e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Son Ödeme Tarihi</label>
                  <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Konum <span className="normal-case font-normal">(isteğe bağlı)</span></label>
                  <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Not <span className="normal-case font-normal">(isteğe bağlı)</span></label>
                  <input value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)} disabled={submitting}>İptal</Button>
                <Button
                  onClick={handleSubmit} disabled={submitting}
                  className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none font-semibold"
                >
                  {submitting ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
