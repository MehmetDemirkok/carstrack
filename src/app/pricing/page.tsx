"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Car, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import type { PlanType } from "@/lib/types";

const DEMO_EMAIL = "demo@carstrack.app";
const PAYMENT_ENABLED = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true";

function PlanCard({
  plan,
  currentPlan,
  loading,
  onSelect,
  paymentEnabled,
}: {
  plan: typeof PLANS.pro;
  currentPlan: PlanType;
  loading: boolean;
  onSelect: (plan: PlanType) => void;
  paymentEnabled: boolean;
}) {
  const isCurrent  = currentPlan === plan.id;
  const isDowngrade = plan.id === "free";
  const isHighlighted = plan.id === "pro";

  return (
    <div
      className="relative rounded-3xl border p-6 flex flex-col gap-5 transition-all duration-200"
      style={{
        borderColor: isHighlighted ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)",
        background: isHighlighted
          ? "linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(79,70,229,0.04) 100%)"
          : "rgba(255,255,255,0.02)",
        boxShadow: isHighlighted ? "0 0 40px rgba(99,102,241,0.1)" : "none",
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
        <h3
          className="font-black text-lg"
          style={{ fontFamily: "var(--font-outfit)", color: plan.id !== "free" ? plan.color : undefined }}
        >
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
            Yıllık ödemede ₺{plan.yearlyPrice}/yıl — 2 ay ücretsiz
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

      {!paymentEnabled && !isCurrent && !isDowngrade ? (
        <Button
          className="w-full rounded-xl font-bold h-11 gap-2 opacity-70"
          variant="outline"
          onClick={() =>
            toast.info("Ödeme sistemi çok yakında!", {
              description: "PayTR entegrasyonu tamamlanıyor. Hazır olduğunda buradan geçiş yapabilirsiniz.",
              duration: 4000,
            })
          }
        >
          <Clock className="h-4 w-4" />
          Yakında Aktif
        </Button>
      ) : (
        <Button
          className="w-full rounded-xl font-bold h-11 gap-2"
          disabled={isCurrent || isDowngrade || loading}
          onClick={() => !isCurrent && !isDowngrade && onSelect(plan.id)}
          style={
            !isCurrent && !isDowngrade
              ? { background: `linear-gradient(90deg, ${plan.color}, ${plan.color}cc)`, color: "#fff", border: "none" }
              : undefined
          }
          variant={isCurrent || isDowngrade ? "outline" : "default"}
        >
          {loading && !isCurrent && !isDowngrade && <Loader2 className="h-4 w-4 animate-spin" />}
          {isCurrent ? "Mevcut Plan" : isDowngrade ? "Ücretsiz Plan" : "Planı Seç →"}
        </Button>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { company, user } = useAuth();
  const router = useRouter();
  const currentPlan = (company?.plan ?? "free") as PlanType;
  const [loading, setLoading] = useState(false);

  const handleSelect = async (plan: PlanType) => {
    if (user?.email === DEMO_EMAIL) {
      toast.warning("Demo Hesabı", {
        description: "Demo hesabında ödeme yapılamaz. Gerçek bir hesap oluşturun.",
        action: { label: "Kayıt Ol", onClick: () => router.push("/register") },
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };

      if (!res.ok || data.error) {
        toast.error("Hata", { description: data.error ?? "Ödeme başlatılamadı" });
        return;
      }

      // PayTR ödeme sayfasına yönlendir
      window.location.href = data.checkoutUrl!;
    } catch {
      toast.error("Bağlantı hatası", { description: "Lütfen tekrar deneyin." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <Car className="h-4 w-4" style={{ color: "#6366f1" }} />
            <span className="font-bold text-sm">
              Cars<span style={{ color: "#6366f1" }}>Track</span>
            </span>
          </Link>
          <span className="text-muted-foreground text-sm">/ Fiyatlandırma</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10 pb-24">
        {/* Başlık */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "var(--font-outfit)" }}>
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

        {/* Ödeme sistemi yakında banner */}
        {!PAYMENT_ENABLED && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}
          >
            <Clock className="h-5 w-5 shrink-0" style={{ color: "#ca8a04" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#ca8a04" }}>Ödeme sistemi yakında aktif olacak</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Şu an tüm özellikler ücretsiz kullanılabilir. Ücretli planlar kısa sürede açılacak.
              </p>
            </div>
          </div>
        )}

        {/* Plan Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["free", "pro", "fleet"] as PlanType[]).map((planId) => (
            <PlanCard
              key={planId}
              plan={PLANS[planId]}
              currentPlan={currentPlan}
              loading={loading}
              onSelect={handleSelect}
              paymentEnabled={PAYMENT_ENABLED}
            />
          ))}
        </div>

        {/* PayTR güven sembolleri */}
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <ShieldCheck className="h-6 w-6" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <p className="text-sm font-bold">PayTR ile Güvenli Ödeme</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kart bilgileriniz PayTR güvenli altyapısında 256-bit SSL ile şifreli olarak işlenir.
              CarsTrack kart numaranıza erişemez. Visa ve Mastercard desteklenir.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 opacity-60">
            {["VISA", "MC", "PayTR"].map((c) => (
              <div
                key={c}
                className="px-2 py-1 rounded-md text-[10px] font-black border"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Sorularınız için:{" "}
          <a href="mailto:destek@carstrack.app" className="text-primary hover:underline">
            destek@carstrack.app
          </a>
        </p>
      </div>
    </div>
  );
}
