"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Wrench, Plus, Check, Send, ChevronDown, CheckCircle2, Clock, Inbox, RefreshCw,
  ImagePlus, X,
} from "lucide-react";
import { toast } from "sonner";
import { getMyVehicles, getMyReports, createReport, uploadReportPhoto, MAX_REPORT_PHOTOS } from "@/lib/db";
import type { Vehicle, VehicleReport, ReportCategory, ReportSeverity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  StatusBadge, SeverityBadge, CategoryIcon, CATEGORY_META, CATEGORY_OPTIONS, SEVERITY_META, STATUS_META,
} from "./report-badges";
import { ReportTimeline, StatusStepper } from "./report-timeline";
import { ReportPhotoGallery } from "./report-photos";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } } };

const SEVERITIES: ReportSeverity[] = ["low", "medium", "high", "critical"];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function DriverReportsView({ initialVehicleId }: { initialVehicleId?: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reports, setReports] = useState<VehicleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReportCategory>("other");
  const [severity, setSeverity] = useState<ReportSeverity>("medium");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded timeline
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadAll() {
    try {
      const [v, r] = await Promise.all([getMyVehicles(), getMyReports()]);
      setVehicles(v);
      setReports(r);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    if (initialVehicleId) setShowForm(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadAll(); } finally { setRefreshing(false); }
  }

  function resetForm() {
    setVehicleId(""); setTitle(""); setCategory("other"); setSeverity("medium"); setDescription("");
    setPhotos([]);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const images = selected.filter((f) => f.type.startsWith("image/"));
    if (images.length < selected.length) {
      toast.error("Yalnızca görsel dosyalar eklenebilir");
    }
    const tooBig = images.find((f) => f.size > 8 * 1024 * 1024);
    if (tooBig) {
      toast.error("Her fotoğraf en fazla 8 MB olabilir");
    }
    const valid = images.filter((f) => f.size <= 8 * 1024 * 1024);
    setPhotos((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_REPORT_PHOTOS);
      if (prev.length + valid.length > MAX_REPORT_PHOTOS) {
        toast.error(`En fazla ${MAX_REPORT_PHOTOS} fotoğraf ekleyebilirsiniz`);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    if (!title.trim()) { toast.error("Lütfen bir başlık girin"); return; }
    setSubmitting(true);
    try {
      // Önce fotoğrafları yükle (varsa), sonra bildirimi oluştur.
      let photoPaths: string[] = [];
      if (photos.length > 0) {
        try {
          photoPaths = await Promise.all(photos.map((f) => uploadReportPhoto(vehicleId, f)));
        } catch {
          toast.error("Fotoğraflar yüklenemedi, bildirim fotoğrafsız oluşturuluyor");
        }
      }
      const report = await createReport({
        vehicleId,
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        photoPaths,
      });
      setReports((prev) => [report, ...prev]);
      resetForm();
      setShowForm(false);
      toast.success("Arıza bildirimi oluşturuldu", { description: "Yöneticiniz en kısa sürede inceleyecek." });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Bildirim oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full h-12 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const openCount = reports.filter((r) => r.status !== "resolved").length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

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
      {/* ── İstatistik şeridi ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
        {[
          { value: openCount, label: "Açık", Icon: Wrench, color: "text-red-500", bg: "bg-red-500/10" },
          { value: inProgressCount, label: "Çözülüyor", Icon: Clock, color: "text-sky-500", bg: "bg-sky-500/10" },
          { value: resolvedCount, label: "Çözüldü", Icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp} whileHover={{ y: -3 }}
            className="glass rounded-2xl p-3.5 border border-border/30 flex flex-col items-center text-center gap-1.5">
            <div className={`p-2 rounded-xl ${s.bg}`}><s.Icon className={`h-4 w-4 ${s.color}`} /></div>
            <span className="text-xl font-bold font-outfit leading-none">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Yeni bildirim CTA / form ── */}
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.button
            key="cta"
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(true)}
            className="w-full text-left"
          >
            <div className="rounded-3xl bg-mesh glow shimmer overflow-hidden relative p-5 shadow-xl shadow-primary/25 flex items-center gap-4">
              <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 relative">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 relative">
                <p className="font-bold text-white">Yeni Arıza / Durum Bildir</p>
                <p className="text-xs text-white/70">Araçta fark ettiğin bir arızayı yöneticine ilet</p>
              </div>
              <Send className="h-5 w-5 text-white/80 shrink-0 relative" />
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <div className="glass rounded-3xl p-5 border border-border/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold">Arıza / Durum Bildir</h2>
                  <p className="text-xs text-muted-foreground">Araç ve sorunu seç, açıklamanı yaz</p>
                </div>
              </div>

              {/* Araç seçimi */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Araç</label>
                {vehicles.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-2xl">
                    <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Henüz araç atanmamış</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((v) => {
                      const selected = vehicleId === v.id;
                      return (
                        <button
                          key={v.id} type="button" onClick={() => setVehicleId(v.id)}
                          className={`w-full text-left rounded-2xl border px-4 py-3 transition-all flex items-center gap-3 ${
                            selected ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10" : "border-border/40 bg-muted/20 hover:border-primary/30"
                          }`}
                        >
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-primary/15" : "bg-muted/50"}`}>
                            <Car className={`h-4 w-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${selected ? "text-primary" : ""}`}>{v.plate}</p>
                            <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                          </div>
                          {selected && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Başlık */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Başlık</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Fren sesi geliyor" className={inputCls} />
              </div>

              {/* Kategori */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kategori</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const selected = category === opt.value;
                    return (
                      <button
                        key={opt.value} type="button" onClick={() => setCategory(opt.value)}
                        className={`rounded-2xl border px-1 py-2.5 flex flex-col items-center gap-1 transition-all ${
                          selected ? "border-primary/60 bg-primary/5 text-primary" : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <CategoryIcon category={opt.value} className="h-4 w-4" />
                        <span className="text-[9px] font-semibold text-center leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Önem */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Önem Derecesi</label>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITIES.map((sv) => {
                    const meta = SEVERITY_META[sv];
                    const selected = severity === sv;
                    return (
                      <button
                        key={sv} type="button" onClick={() => setSeverity(sv)}
                        className={`rounded-xl border px-1 py-2 text-xs font-semibold transition-all ${
                          selected ? `${meta.bg} ${meta.text} border-transparent ring-2 ${meta.ring}` : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Açıklama */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Açıklama <span className="normal-case font-normal">(isteğe bağlı)</span>
                </label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  placeholder="Sorunu detaylı anlat..." className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              {/* Fotoğraflar */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Fotoğraflar <span className="normal-case font-normal">(isteğe bağlı · en fazla {MAX_REPORT_PHOTOS})</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((file, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-border/40 bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(file)} alt={`Fotoğraf ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                        aria-label="Fotoğrafı kaldır"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_REPORT_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Ekle</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => { setShowForm(false); resetForm(); }} disabled={submitting}>
                  İptal
                </Button>
                <Button
                  onClick={handleSubmit} disabled={submitting || !vehicleId || !title.trim()}
                  className="flex-[2] rounded-2xl h-12 bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/20 font-bold gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Gönderiliyor..." : "Bildirimi Gönder"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bildirimlerim ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bildirimlerim</h2>
          <button onClick={handleRefresh} disabled={refreshing}
            className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl border border-border/20">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz bildirim yok</p>
            <p className="text-xs mt-0.5">Bir arıza fark edersen yukarıdan bildir</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5">
            {reports.map((r) => {
              const expanded = expandedId === r.id;
              return (
                <motion.div key={r.id} variants={fadeUp} className="glass rounded-2xl border border-border/30 overflow-hidden">
                  <button onClick={() => setExpandedId(expanded ? null : r.id)} className="w-full text-left p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${STATUS_META[r.status].bg}`}>
                        <CategoryIcon category={r.category} className={`h-4 w-4 ${STATUS_META[r.status].text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{r.title}</p>
                          <SeverityBadge severity={r.severity} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {r.vehiclePlate ?? "Araç"} · {CATEGORY_META[r.category].label} · {formatDateTime(r.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <StatusBadge status={r.status} />
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }} className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                          <StatusStepper status={r.status} />
                          {r.description && (
                            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">{r.description}</p>
                          )}
                          {r.photoPaths.length > 0 && <ReportPhotoGallery paths={r.photoPaths} />}
                          {r.status === "resolved" && r.resolutionNote && (
                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Çözüm Notu</p>
                              <p className="text-sm text-foreground/80">{r.resolutionNote}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Geçmiş</p>
                            <ReportTimeline reportId={r.id} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
