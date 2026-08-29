"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Inbox, RefreshCw, ChevronDown, ImageIcon, X, MapPin, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { getMyTrafficFines, getFinePhotoSignedUrl } from "@/lib/db";
import type { TrafficFine } from "@/lib/types";
import { FineStatusBadge } from "./fine-badges";
import { GovFineQueryLink } from "./gov-fine-query-link";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } } };

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatTRY(n: number): string {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}

function FinePhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFinePhotoSignedUrl(path)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [path]);

  if (loading) return <div className="h-20 w-20 rounded-xl bg-muted/50 animate-pulse" />;
  if (!url) return null;

  return (
    <>
      <button type="button" onClick={() => setActive(true)}
        className="h-20 w-20 rounded-xl overflow-hidden border border-border/40 bg-muted/30 hover:opacity-90 transition-opacity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Ceza tebligatı" className="h-full w-full object-cover" />
      </button>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(false)}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button type="button" onClick={() => setActive(false)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Kapat">
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Ceza tebligatı" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-full rounded-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function DriverFinesView() {
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadAll() {
    try {
      setFines(await getMyTrafficFines());
    } catch {
      toast.error("Cezalar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadAll(); } finally { setRefreshing(false); }
  }

  const unpaidCount = fines.filter((f) => f.status === "unpaid").length;
  const unpaidAmount = fines.filter((f) => f.status === "unpaid").reduce((s, f) => s + f.amount, 0);

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
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
        {[
          { value: unpaidCount, label: "Ödenmemiş Ceza", color: "text-red-500", bg: "bg-red-500/10" },
          { value: formatTRY(unpaidAmount), label: "Bekleyen Tutar", color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp}
            className="glass rounded-2xl p-3.5 border border-border/30 flex flex-col items-center text-center gap-1.5">
            <div className={`p-2 rounded-xl ${s.bg}`}><Gavel className={`h-4 w-4 ${s.color}`} /></div>
            <span className="text-xl font-bold font-outfit leading-none">{s.value}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Resmi e-Devlet sorgulama */}
      <GovFineQueryLink />

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cezalarım</h2>
          <button onClick={handleRefresh} disabled={refreshing}
            className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {fines.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl border border-border/20">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Size yansıtılmış bir ceza yok</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2.5">
            {fines.map((f) => {
              const expanded = expandedId === f.id;
              return (
                <motion.div key={f.id} variants={fadeUp} className="glass rounded-2xl border border-border/30 overflow-hidden">
                  <button onClick={() => setExpandedId(expanded ? null : f.id)} className="w-full text-left p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-muted/50">
                        <Gavel className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{f.violationType || "Trafik cezası"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {f.vehiclePlate ?? "Araç"} · {formatTRY(f.amount)} · {formatDate(f.fineDate)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <FineStatusBadge status={f.status} />
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
                        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-4">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-muted/30 px-3 py-2">
                              <p className="text-muted-foreground">Tutar</p>
                              <p className="font-bold">{formatTRY(f.amount)}</p>
                            </div>
                            {f.discountedAmount !== undefined && (
                              <div className="rounded-xl bg-emerald-500/10 px-3 py-2">
                                <p className="text-emerald-600 dark:text-emerald-400">İndirimli</p>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatTRY(f.discountedAmount)}</p>
                              </div>
                            )}
                          </div>
                          {f.dueDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CalendarClock className="h-3.5 w-3.5" /> Son ödeme tarihi: {formatDate(f.dueDate)}
                            </p>
                          )}
                          {f.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" /> {f.location}
                            </p>
                          )}
                          {f.notes && (
                            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">{f.notes}</p>
                          )}
                          {f.photoPath && (
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <ImageIcon className="h-3 w-3" /> Tebligat
                              </p>
                              <FinePhoto path={f.photoPath} />
                            </div>
                          )}
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
