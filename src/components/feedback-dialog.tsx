"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bug, Lightbulb, MessageSquare, Send, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitFeedback, getMyFeedback } from "@/lib/db";
import type { Feedback, FeedbackType } from "@/lib/types";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const MAX_LEN = 4000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Feedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Dialog her açıldığında formu sıfırla ve geçmişi tazele.
  useEffect(() => {
    if (open) {
      setType("bug");
      setMessage("");
      loadHistory();
    }
  }, [open]);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Lütfen bir mesaj yazın");
      return;
    }
    setSubmitting(true);
    try {
      const pageUrl = typeof window !== "undefined" ? window.location.pathname : undefined;
      await submitFeedback({ type, message: trimmed, pageUrl });
      toast.success("Geri bildiriminiz iletildi", {
        description: "Teşekkürler! En kısa sürede inceleyeceğiz.",
      });
      setMessage("");
      loadHistory();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Geri bildirim gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-3xl sm:max-w-[480px] w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(90svh,680px)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 shrink-0">
              <MessageSquare className="h-4.5 w-4.5 text-primary" />
            </span>
            <div>
              <p className="font-outfit font-semibold text-base leading-tight">Geri Bildirim</p>
              <p className="text-xs text-muted-foreground">Hata, öneri veya görüşlerinizi paylaşın</p>
            </div>
          </div>
          <DialogClose render={
            <button className="flex items-center justify-center w-7 h-7 rounded-full bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          }>
            <span className="text-sm leading-none">✕</span>
          </DialogClose>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-2 space-y-4 no-scrollbar">
          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Tür
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ id, label, Icon, color }) => {
                const active = type === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition-all",
                      active
                        ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                        : "border-border/40 bg-muted/20 hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? color : "text-muted-foreground")} />
                    <span className={cn("text-xs font-semibold", active && "text-primary")}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Mesajınız
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              placeholder={
                type === "bug"
                  ? "Karşılaştığınız hatayı, hangi adımlarla oluştuğunu yazın…"
                  : type === "suggestion"
                    ? "Önerinizi paylaşın…"
                    : "Görüşlerinizi yazın…"
              }
              rows={5}
              className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">{message.length}/{MAX_LEN}</p>
          </div>

          {/* History */}
          {(loadingHistory || history.length > 0) && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Gönderdiklerim
              </label>
              {loadingHistory ? (
                <div className="h-12 rounded-2xl bg-muted/30 animate-pulse" />
              ) : (
                <div className="space-y-2">
                  {history.map((f) => (
                    <div key={f.id} className="rounded-2xl bg-muted/30 border border-border/30 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {TYPE_LABELS[f.type]} • {formatDate(f.createdAt)}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                          f.status === "resolved"
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {f.status === "resolved"
                            ? <CheckCircle2 className="h-3 w-3" />
                            : <Clock className="h-3 w-3" />}
                          {STATUS_LABELS[f.status]}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-snug line-clamp-2">{f.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 border-t border-border/40">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="w-full h-12 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/20 font-bold gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Gönderiliyor…" : "Gönder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
