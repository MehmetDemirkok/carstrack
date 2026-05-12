"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Car, Loader2 } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import type { PlanType } from "@/lib/types";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status");
  const plan   = params.get("plan") as PlanType | null;
  const msg    = params.get("msg");

  const isOk  = status === "ok";
  const planDef = plan ? PLANS[plan] : null;

  useEffect(() => {
    // Başarılı ödeme sonrası auth context'i yenile
    if (isOk) {
      setTimeout(() => router.refresh(), 500);
    }
  }, [isOk, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
          style={{
            background: isOk ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${isOk ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}
        >
          {isOk
            ? <CheckCircle2 className="h-10 w-10" style={{ color: "#10b981" }} />
            : <XCircle className="h-10 w-10" style={{ color: "#ef4444" }} />
          }
        </div>

        {isOk ? (
          <>
            <div>
              <h1 className="text-2xl font-black" style={{ fontFamily: "var(--font-outfit)" }}>
                Ödeme Başarılı!
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {planDef?.name} planına geçişiniz tamamlandı.
                {planDef && ` ${planDef.vehicleLimit === Infinity ? "Sınırsız" : planDef.vehicleLimit} araç`} ile filonuzu yönetebilirsiniz.
              </p>
            </div>

            {planDef && (
              <div
                className="rounded-2xl p-4 text-left space-y-2"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Aktif Plan
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" style={{ color: planDef.color }} />
                    <span className="font-bold" style={{ color: planDef.color }}>{planDef.name}</span>
                  </div>
                  <span className="text-sm font-bold">₺{planDef.price}/ay</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full rounded-xl font-bold" style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff" }}>
                  Dashboard&apos;a Git
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="rounded-xl">
                  Ayarlar
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black" style={{ fontFamily: "var(--font-outfit)" }}>
                Ödeme Başarısız
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {msg === "payment_failed"
                  ? "Ödeme işlemi tamamlanamadı. Kart bilgilerinizi kontrol edip tekrar deneyin."
                  : "Bir hata oluştu. Lütfen tekrar deneyin veya destek ekibiyle iletişime geçin."}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Link href="/pricing">
                <Button className="rounded-xl font-bold" style={{ background: "linear-gradient(90deg, #6366f1, #4f46e5)", color: "#fff" }}>
                  Tekrar Dene
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="rounded-xl">
                  Dashboard
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
