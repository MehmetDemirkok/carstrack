"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Car } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanType } from "@/lib/types";

function PlanCard({
  plan,
  currentPlan,
  onSelect,
}: {
  plan: typeof PLANS.pro;
  currentPlan: PlanType;
  onSelect: (plan: PlanType) => void;
}) {
  const isCurrent = currentPlan === plan.id;
  const isDowngrade = plan.id === "free";

  return (
    <div
      className="relative rounded-3xl border p-6 flex flex-col gap-5 transition-all"
      style={{
        borderColor: plan.id === "pro" ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
        background: plan.id === "pro"
          ? "linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(79,70,229,0.04) 100%)"
          : "rgba(255,255,255,0.02)",
        boxShadow: plan.id === "pro" ? "0 0 40px rgba(99,102,241,0.1)" : "none",
      }}
    >
      {plan.badge && plan.id !== "free" && (
        <Badge
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 border-none"
          style={{ background: plan.color, color: "#fff" }}
        >
          {plan.badge}
        </Badge>
      )}

      <div>
        <h3 className="font-black text-lg" style={{ fontFamily: "var(--font-outfit)", color: plan.id === "free" ? undefined : plan.color }}>
          {plan.name}
        </h3>
        <div className="mt-2 flex items-end gap-1">
          {plan.price === 0 ? (
            <span className="text-3xl font-black" style={{ fontFamily: "var(--font-outfit)" }}>Ücretsiz</span>
          ) : (
            <>
              <span className="text-4xl font-black" style={{ fontFamily: "var(--font-outfit)", color: plan.color }}>
                ₺{plan.price}
              </span>
              <span className="text-sm text-muted-foreground mb-1">/ay</span>
            </>
          )}
        </div>
        {plan.price > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Yıllık ödemede ₺{plan.yearlyPrice}/yıl (2 ay hediye)
          </p>
        )}
      </div>

      <div className="flex-1 space-y-2">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: plan.color }} />
            <span className="text-sm">{f}</span>
          </div>
        ))}
        {plan.notFeatures.map((f) => (
          <div key={f} className="flex items-start gap-2 opacity-40">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{f}</span>
          </div>
        ))}
      </div>

      <Button
        className="w-full rounded-xl font-bold h-11"
        disabled={isCurrent || isDowngrade}
        onClick={() => !isCurrent && !isDowngrade && onSelect(plan.id)}
        style={
          !isCurrent && !isDowngrade
            ? { background: `linear-gradient(90deg, ${plan.color}, ${plan.color}cc)`, color: "#fff", border: "none" }
            : undefined
        }
        variant={isCurrent || isDowngrade ? "outline" : "default"}
      >
        {isCurrent ? "Mevcut Plan" : isDowngrade ? "Ücretsiz Plan" : "Planı Seç"}
      </Button>
    </div>
  );
}

function CheckoutModal({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan: PlanType | null;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, phone, address, city, identityNumber }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || data.error) {
        toast.error("Hata", { description: data.error ?? "Ödeme başlatılamadı" });
        return;
      }
      // iyzico checkout sayfasına yönlendir
      window.location.href = data.checkoutUrl!;
    } catch {
      toast.error("Hata", { description: "Bağlantı hatası" });
    } finally {
      setLoading(false);
    }
  };

  const planDef = plan ? PLANS[plan] : null;
  const iLabel = "text-xs font-medium text-muted-foreground";
  const iCls = "rounded-xl h-10 bg-muted/30 border-border/40 text-sm";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-outfit text-lg">
            {planDef?.name} Plan — Ödeme Bilgileri
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            iyzico güvenli ödeme altyapısı kullanılmaktadır. Kart bilgilerinizi bir sonraki adımda iyzico formuna gireceksiniz.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={iLabel}>Telefon <span className="text-destructive">*</span></Label>
              <Input className={iCls} placeholder="05XX XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Şehir <span className="text-destructive">*</span></Label>
              <Input className={iCls} placeholder="İstanbul" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label className={iLabel}>Fatura Adresi <span className="text-destructive">*</span></Label>
            <Input className={iCls} placeholder="Mahalle, cadde, no..." value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label className={iLabel}>TC Kimlik No <span className="text-destructive">*</span></Label>
            <Input className={iCls} placeholder="XXXXXXXXXXX (11 hane)" maxLength={11} value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} required />
            <p className="text-[10px] text-muted-foreground">Yasal ödeme kaydı için zorunludur. Bilgileriniz şifreli olarak saklanır.</p>
          </div>

          <div
            className="rounded-xl p-3 flex items-center justify-between"
            style={{ background: `rgba(99,102,241,0.08)`, border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <span className="text-sm font-medium">{planDef?.name} Plan</span>
            <span className="font-black text-sm" style={{ color: planDef?.color }}>
              ₺{planDef?.price}/ay
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl font-bold gap-2"
              disabled={loading}
              style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff", border: "none" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Ödemeye Geç
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PricingPage() {
  const { company } = useAuth();
  const router = useRouter();
  const currentPlan = (company?.plan ?? "free") as PlanType;
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" style={{ color: "#6366f1" }} />
            <span className="font-bold text-sm">
              Cars<span style={{ color: "#6366f1" }}>Track</span>
            </span>
          </div>
          <span className="text-muted-foreground text-sm">Fiyatlandırma</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Başlık */}
        <div className="text-center space-y-3">
          <h1
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Filonuza Uygun Planı Seçin
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Tüm planlar aylık ödemeli, sözleşme yok. İstediğiniz zaman iptal edebilirsiniz.
          </p>
          {currentPlan !== "free" && (
            <Badge
              className="text-xs font-bold border-none"
              style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}
            >
              Mevcut Plan: {PLANS[currentPlan].name}
            </Badge>
          )}
        </div>

        {/* Plan Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["free", "pro", "fleet"] as PlanType[]).map((planId) => (
            <PlanCard
              key={planId}
              plan={PLANS[planId]}
              currentPlan={currentPlan}
              onSelect={(p) => setSelectedPlan(p)}
            />
          ))}
        </div>

        {/* Güven sembolleri */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            🔒 iyzico ile güvenli ödeme · ↩ İstediğiniz zaman iptal · 🏦 Türk Lirası faturalama
          </p>
          <p className="text-xs text-muted-foreground">
            Sorularınız için:{" "}
            <a href="mailto:destek@carstrack.app" className="text-primary hover:underline">
              destek@carstrack.app
            </a>
          </p>
        </div>
      </div>

      <CheckoutModal
        open={!!selectedPlan}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
}
