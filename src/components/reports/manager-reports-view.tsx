"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, Filter, X, CircleDot, Loader2, CheckCircle2, ChevronDown, Inbox, ArrowRight, Trash2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { getReports, getVehicles, getMembers, updateReportStatus, deleteReport } from "@/lib/db";
import type { Vehicle, Profile, VehicleReport, ReportStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  StatusBadge, SeverityBadge, CategoryIcon, CATEGORY_META, STATUS_META, STATUS_ORDER,
} from "./report-badges";
import { ReportTimeline, StatusStepper } from "./report-timeline";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Çözerken not zorunlu, diğer geçişlerde isteğe bağlı
function noteRequired(status: ReportStatus): boolean {
  return status === "resolved";
}

export function ManagerReportsView() {
  const [reports, setReports] = useState<VehicleReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fVehicle, setFVehicle] = useState("");
  const [fMember, setFMember] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fSeverity, setFSeverity] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Status modal
  const [target, setTarget] = useState<VehicleReport | null>(null);
  const [nextStatus, setNextStatus] = useState<ReportStatus>("acknowledged");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [toDelete, setToDelete] = useState<VehicleReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [r, v, m] = await Promise.all([
        getReports(),
        vehicles.length ? Promise.resolve(vehicles) : getVehicles(),
        members.length ? Promise.resolve(members) : getMembers(),
      ]);
      setReports(r);
      setVehicles(v as Vehicle[]);
      setMembers(m as Profile[]);
    } catch {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = fVehicle || fMember || fStatus || fSeverity;

  const filtered = useMemo(() => reports.filter((r) =>
    (!fVehicle || r.vehicleId === fVehicle) &&
    (!fMember || r.reporterId === fMember) &&
    (!fStatus || r.status === fStatus) &&
    (!fSeverity || r.severity === fSeverity)
  ), [reports, fVehicle, fMember, fStatus, fSeverity]);

  function clearFilters() {
    setFVehicle(""); setFMember(""); setFStatus(""); setFSeverity("");
  }

  function openStatusModal(r: VehicleReport) {
    const idx = STATUS_ORDER.indexOf(r.status);
    setTarget(r);
    setNextStatus(STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)]);
    setNote("");
  }

  async function confirmStatus() {
    if (!target) return;
    if (noteRequired(nextStatus) && !note.trim()) {
      toast.error("Çözüm notu girmeniz gerekiyor");
      return;
    }
    setSubmitting(true);
    try {
      await updateReportStatus(target.id, nextStatus, note.trim() || undefined);
      setReports((prev) => prev.map((r) =>
        r.id === target.id
          ? { ...r, status: nextStatus, resolutionNote: nextStatus === "resolved" ? note.trim() : r.resolutionNote, resolvedAt: nextStatus === "resolved" ? new Date().toISOString() : undefined }
          : r
      ));
      setTarget(null);
      toast.success("Durum güncellendi", { description: `${STATUS_META[nextStatus].label} olarak işaretlendi.` });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Durum güncellenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteReport(toDelete.id);
      setReports((prev) => prev.filter((r) => r.id !== toDelete.id));
      if (expandedId === toDelete.id) setExpandedId(null);
      setToDelete(null);
      toast.success("Bildirim silindi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Bildirim silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  const counts = {
    total: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    inProgress: reports.filter((r) => r.status === "in_progress" || r.status === "acknowledged").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  const selCls = "h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam", value: counts.total, Icon: Wrench, accent: "border-border/30", color: "text-muted-foreground" },
          { label: "Açık", value: counts.open, Icon: CircleDot, accent: counts.open > 0 ? "border-red-500/30" : "border-border/30", color: "text-red-500" },
          { label: "İşlemde", value: counts.inProgress, Icon: Loader2, accent: "border-border/30", color: "text-sky-500" },
          { label: "Çözüldü", value: counts.resolved, Icon: CheckCircle2, accent: "border-border/30", color: "text-emerald-500" },
        ].map(({ label, value, Icon, accent, color }) => (
          <div key={label} className={`glass rounded-2xl p-4 border ${accent}`}>
            <Icon className={`h-4 w-4 mb-2 ${color}`} />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={fVehicle} onChange={(e) => setFVehicle(e.target.value)} className={selCls}>
            <option value="">Tüm Araçlar</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
          </select>
          <select value={fMember} onChange={(e) => setFMember(e.target.value)} className={selCls}>
            <option value="">Tüm Sürücüler</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selCls}>
            <option value="">Tüm Durumlar</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select value={fSeverity} onChange={(e) => setFSeverity(e.target.value)} className={selCls}>
            <option value="">Tüm Öncelikler</option>
            <option value="critical">Kritik</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
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
          <p className="font-medium">Bildirim bulunamadı</p>
          {hasFilters && <p className="text-sm mt-1">Filtreleri temizleyerek tekrar deneyin</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            const isResolved = r.status === "resolved";
            return (
              <div key={r.id} className="glass rounded-2xl border border-border/40 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${STATUS_META[r.status].bg}`}>
                      <CategoryIcon category={r.category} className={`h-5 w-5 ${STATUS_META[r.status].text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{r.title}</p>
                        <SeverityBadge severity={r.severity} />
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground/70">{r.vehiclePlate ?? "—"}</span>
                        {" · "}{r.reporterName ?? "—"}{r.reporterDepartment ? ` (${r.reporterDepartment})` : ""}
                        {" · "}{CATEGORY_META[r.category].label}{" · "}{formatDateTime(r.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {!isResolved && (
                      <Button
                        onClick={() => openStatusModal(r)}
                        className="h-9 rounded-xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold px-3 gap-1.5"
                      >
                        Durumu İlerlet <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <button
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="h-9 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 text-xs font-semibold px-3 flex items-center gap-1.5 transition-colors"
                    >
                      Detay & Geçmiş <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      onClick={() => setToDelete(r)}
                      title="Bildirimi Sil"
                      className="h-9 w-9 ml-auto rounded-xl border border-border/50 bg-muted/30 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

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
                        {isResolved && r.resolutionNote && (
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
              </div>
            );
          })}
        </div>
      )}

      {/* Status modal */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setTarget(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-md p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl"><Wrench className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0">
                <h2 className="font-bold text-base truncate">{target.title}</h2>
                <p className="text-xs text-muted-foreground">{target.vehiclePlate ?? "—"} · {target.reporterName ?? "—"}</p>
              </div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-3">
              <StatusStepper status={target.status} />
            </div>

            {/* Hedef durum seçimi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yeni Durum</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ORDER.map((s) => {
                  const meta = STATUS_META[s];
                  const selected = nextStatus === s;
                  const isCurrent = s === target.status;
                  return (
                    <button
                      key={s} type="button" disabled={isCurrent} onClick={() => setNextStatus(s)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        selected ? `${meta.bg} ${meta.text} border-current` : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} /> {meta.label}
                      {isCurrent && <span className="ml-auto text-[9px] font-normal">(mevcut)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Not */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {noteRequired(nextStatus) ? "Çözüm Notu" : "Not"}{" "}
                <span className="normal-case font-normal">{noteRequired(nextStatus) ? "(zorunlu)" : "(isteğe bağlı)"}</span>
              </label>
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder={noteRequired(nextStatus) ? "Sorun nasıl çözüldü?" : "Sürücüye iletilecek bir not..."}
                className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {nextStatus === "resolved" && (
              <div className="flex items-start gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl px-3 py-2 leading-snug">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" />
                <span>Çözüldü olarak işaretlendiğinde, aracın <b>servis geçmişine</b> otomatik bir tamir kaydı eklenecek.</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setTarget(null)} disabled={submitting}>İptal</Button>
              <Button
                onClick={confirmStatus} disabled={submitting}
                className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none font-semibold"
              >
                {submitting ? "Kaydediliyor..." : "Güncelle"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

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
                <h2 className="font-bold text-base text-red-600 dark:text-red-400">Bildirimi Sil</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <span className="font-semibold text-foreground">{toDelete.title}</span> bildirimi ve tüm durum geçmişi <span className="font-semibold text-red-500">kalıcı olarak</span> silinecek. Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="w-full bg-muted/40 rounded-2xl p-3 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Araç</span><span className="font-semibold">{toDelete.vehiclePlate ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sürücü</span><span className="font-semibold">{toDelete.reporterName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Durum</span><span className="font-semibold">{STATUS_META[toDelete.status].label}</span></div>
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
