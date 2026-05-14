"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, Car, Users, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  reason?: "vehicle" | "user" | "feature";
  currentPlan?: string;
}

const REASON_TEXT = {
  vehicle: {
    title: "Araç Limitine Ulaştınız",
    desc: "Ücretsiz planda maksimum 2 araç ekleyebilirsiniz. Daha fazla araç için planınızı yükseltin.",
    icon: Car,
  },
  user: {
    title: "Kullanıcı Limitine Ulaştınız",
    desc: "Ücretsiz planda maksimum 3 kullanıcı ekleyebilirsiniz. Ekibinizi büyütmek için planınızı yükseltin.",
    icon: Users,
  },
  feature: {
    title: "Bu Özellik Premium Planlarda",
    desc: "Bu özelliği kullanmak için Profesyonel veya Filo planına geçin.",
    icon: Zap,
  },
};

export function UpgradeModal({ open, onClose, onDismiss, reason = "vehicle" }: UpgradeModalProps) {
  const info = REASON_TEXT[reason];
  const Icon = info.icon;
  const pro = PLANS.pro;
  const dismiss = onDismiss ?? onClose;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden" showCloseButton={false}>
        {/* Header gradient */}
        <div
          className="p-6 pb-4"
          style={{ background: "linear-gradient(135deg, #12122e 0%, #1a1a3e 100%)" }}
        >
          <DialogClose onClick={dismiss} className="absolute top-4 right-4 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </DialogClose>

          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <Icon className="h-6 w-6" style={{ color: "#6366f1" }} />
          </div>

          <DialogTitle className="text-xl font-black text-white" style={{ fontFamily: "var(--font-outfit)" }}>
            {info.title}
          </DialogTitle>
          <p className="text-sm text-white/60 mt-1">{info.desc}</p>
        </div>

        {/* Pro plan highlight */}
        <div className="p-6 space-y-4">
          <div
            className="rounded-2xl p-4 border"
            style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-black text-base" style={{ fontFamily: "var(--font-outfit)" }}>
                  Profesyonel Plan
                </span>
                <Badge className="ml-2 text-[10px]" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "none" }}>
                  En Popüler
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-xl font-black" style={{ color: "#6366f1" }}>
                  ₺{pro.price}
                </span>
                <span className="text-xs text-muted-foreground">/ay</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {pro.features.slice(0, 5).map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#6366f1" }} />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/pricing" onClick={onClose} className="flex-1">
              <Button
                className="w-full rounded-xl gap-2 font-bold"
                style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff" }}
              >
                Planları Gör <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" className="rounded-xl" onClick={dismiss}>
              Şimdi Değil
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Kredi kartı gereklidir. İstediğiniz zaman iptal edebilirsiniz.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
