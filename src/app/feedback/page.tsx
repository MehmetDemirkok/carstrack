"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bug, Lightbulb, MessageSquare, Send, CheckCircle2, Loader2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitFeedback } from "@/lib/db";
import type { FeedbackType } from "@/lib/types";
import { toast } from "sonner";

const TYPES: { id: FeedbackType; label: string; Icon: React.ElementType; color: string }[] = [
  { id: "bug",        label: "Hata",  Icon: Bug,           color: "text-red-500" },
  { id: "suggestion", label: "Öneri", Icon: Lightbulb,     color: "text-amber-500" },
  { id: "other",      label: "Diğer", Icon: MessageSquare, color: "text-primary" },
];

const MAX_LEN = 4000;
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

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.pathname);
  }, []);

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
      </motion.div>
    </div>
  );
}
