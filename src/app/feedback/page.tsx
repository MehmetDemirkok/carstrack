"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bug, Lightbulb, MessageSquare, Send, CheckCircle2, Clock, Eye, Loader2, Inbox, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitFeedback, getMyFeedback } from "@/lib/db";
import type { Feedback, FeedbackType } from "@/lib/types";
import { toast } from "sonner";

const TYPES: { id: FeedbackType; label: string; Icon: React.ElementType; color: string }[] = [
  { id: "bug",        label: "Hata",  Icon: Bug,           color: "text-red-500" },
  { id: "suggestion", label: "Öneri", Icon: Lightbulb,     color: "text-amber-500" },
  { id: "other",      label: "Diğer", Icon: MessageSquare, color: "text-primary" },
];

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Hata", suggestion: "Öneri", other: "Diğer",
};

const STATUS_LABELS: Record<Feedback["status"], string> = {
  new: "İletildi", seen: "Görüldü", resolved: "Çözüldü",
};

const STATUS_STYLES: Record<Feedback["status"], string> = {
  new: "bg-primary/10 text-primary",
  seen: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  resolved: "bg-green-500/15 text-green-600 dark:text-green-400",
};

const STATUS_ICONS: Record<Feedback["status"], React.ElementType> = {
  new: Clock, seen: Eye, resolved: CheckCircle2,
};

const FILTERS: { id: "all" | Feedback["status"]; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "new", label: "İletildi" },
  { id: "seen", label: "Görüldü" },
  { id: "resolved", label: "Çözüldü" },
];

const MAX_LEN = 4000;
const COLLAPSE_LEN = 150;
const BUG_DETAIL_MIN = 30;

const BUG_TIPS = [
  "Hangi sayfada ve tam olarak ne yaparken karşılaştınız?",
  "İzlediğiniz adımları sırayla yazın (1, 2, 3…)",
  "Ne olmasını bekliyordunuz, bunun yerine ne oldu?",
  "Varsa hata mesajını veya ekran görüntüsü tarifini ekleyin",
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });
  if (seconds < 60) return rtf.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return formatDate(iso);
}

function FeedbackCard({ f }: { f: Feedback }) {
  const [expanded, setExpanded] = useState(false);
  const typeMeta = TYPES.find((t) => t.id === f.type) ?? TYPES[2];
  const StatusIcon = STATUS_ICONS[f.status];
  const long = f.message.length > COLLAPSE_LEN;

  return (
    <div className="glass rounded-2xl border border-border/40 p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-muted/50 shrink-0">
          <typeMeta.Icon className={cn("h-4 w-4", typeMeta.color)} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">{TYPE_LABELS[f.type]}</span>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
              STATUS_STYLES[f.status]
            )}>
              <StatusIcon className="h-3 w-3" />
              {STATUS_LABELS[f.status]}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5" title={formatDate(f.createdAt)}>
            {relativeTime(f.createdAt)}
          </p>
          <p className={cn(
            "text-xs text-foreground/80 leading-snug whitespace-pre-wrap break-words mt-1.5",
            !expanded && long && "line-clamp-3"
          )}>
            {f.message}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-semibold text-primary hover:underline mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
            >
              {expanded ? "Daha az göster" : "Devamını gör"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Feedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filter, setFilter] = useState<"all" | Feedback["status"]>("all");
  const [pageUrl, setPageUrl] = useState("");

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      setHistory(await getMyFeedback());
    } catch {
      /* sessizce yoksay — geçmiş kritik değil */
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
    setPageUrl(window.location.pathname);
  }, []);

  const stats = useMemo(() => ({
    total: history.length,
    resolved: history.filter((f) => f.status === "resolved").length,
    pending: history.filter((f) => f.status !== "resolved").length,
  }), [history]);

  const filtered = useMemo(
    () => (filter === "all" ? history : history.filter((f) => f.status === filter)),
    [history, filter]
  );

  const nearLimit = message.length > MAX_LEN * 0.9;
  const trimmedLen = message.trim().length;
  const bugTooShort = type === "bug" && trimmedLen > 0 && !submitting && trimmedLen < BUG_DETAIL_MIN;

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Lütfen bir mesaj yazın");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ type, message: trimmed, pageUrl: pageUrl || undefined });
      toast.success("Geri bildiriminiz iletildi", {
        description: "Teşekkürler! En kısa sürede inceleyeceğiz.",
      });
      setMessage("");
      setType("bug");
      setFilter("all");
      loadHistory();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Geri bildirim gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Başlık */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Geri Bildirim</h1>
            <p className="text-sm text-muted-foreground">Hata, öneri veya görüşlerinizi paylaşın</p>
          </div>
        </motion.div>

        {/* Özet */}
        {!loadingHistory && history.length > 0 && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
            {[
              { label: "Toplam", value: stats.total },
              { label: "Bekleyen", value: stats.pending },
              { label: "Çözülen", value: stats.resolved },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-border/40 bg-card/60 px-3 py-2.5 text-center">
                <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Form */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-5 space-y-4">
              {/* Tür */}
              <div className="space-y-1.5" role="group" aria-label="Geri bildirim türü">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
                  Tür
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(({ id, label, Icon, color }) => {
                    const active = type === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setType(id)}
                        className={cn(
                          "group relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          active
                            ? "border-primary/60 bg-primary/[0.07] shadow-sm shadow-primary/10"
                            : "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
                        )}
                      >
                        {active && (
                          <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5 text-primary" />
                        )}
                        <span className={cn(
                          "flex items-center justify-center h-9 w-9 rounded-xl transition-colors",
                          active ? "bg-background shadow-sm" : "bg-muted/50 group-hover:bg-muted"
                        )}>
                          <Icon className={cn("h-4 w-4", active ? color : "text-muted-foreground")} />
                        </span>
                        <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hata detayı yönlendirmesi */}
              <AnimatePresence initial={false}>
                {type === "bug" && (
                  <motion.div
                    key="bug-tips"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-3.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Info className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-red-500">
                          Hatayı çözebilmemiz için lütfen detaylı anlatın
                        </p>
                      </div>
                      <ul className="space-y-1">
                        {BUG_TIPS.map((tip) => (
                          <li key={tip} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-red-400/70 shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mesaj */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label
                    htmlFor="feedback-message"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-widest"
                  >
                    Mesajınız
                  </label>
                  {pageUrl && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[50%]" title="Bildirim bu sayfaya bağlanacak">
                      Konum: {pageUrl}
                    </span>
                  )}
                </div>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                  placeholder={
                    type === "bug"
                      ? "Karşılaştığınız hatayı adım adım yazın — ne yapıyordunuz, ne bekliyordunuz, ne oldu?"
                      : type === "suggestion"
                        ? "Önerinizi paylaşın…"
                        : "Görüşlerinizi yazın…"
                  }
                  rows={6}
                  className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className={cn(
                    "text-[10px] transition-opacity",
                    bugTooShort ? "text-amber-500 font-semibold opacity-100" : "opacity-0"
                  )}>
                    Daha detaylı anlatırsanız daha hızlı çözebiliriz
                  </span>
                  <p className={cn(
                    "text-[10px] text-right tabular-nums shrink-0",
                    nearLimit ? "text-amber-500 font-semibold" : "text-muted-foreground"
                  )}>
                    {message.length}/{MAX_LEN}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="w-full h-12 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/20 font-bold gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Gönderiliyor…" : "Gönder"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Geçmiş */}
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
              Gönderdiklerim
            </h3>
          </div>

          {!loadingHistory && history.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active
                        ? "bg-primary text-white shadow-sm shadow-primary/20"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          {loadingHistory ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-12 text-center gap-3"
            >
              <div className="p-5 bg-primary/10 rounded-3xl">
                <Inbox className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold">Henüz geri bildirim göndermediniz</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Yukarıdaki formu doldurarak ilk geri bildiriminizi iletebilirsiniz.
                </p>
              </div>
            </motion.div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Bu durumda kayıt yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {filtered.map((f) => (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <FeedbackCard f={f} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
