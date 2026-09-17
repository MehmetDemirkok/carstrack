"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo-mark";

/**
 * Route segment hata sınırı. Bir sayfa render sırasında hata fırlattığında
 * kullanıcı beyaz ekran yerine bunu görür ve yeniden deneyebilir.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hata detayını konsola bırak — Vercel runtime loglarında digest ile eşleşir.
    console.error("[carstrack] sayfa hatası:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <LogoMark size={44} />
        </div>

        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h1 className="font-outfit text-2xl font-bold tracking-tight">Bir şeyler ters gitti</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Bu sayfa yüklenirken beklenmedik bir hata oluştu. Verileriniz güvende —
          tekrar denemek çoğu zaman sorunu çözer.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button size="lg" className="rounded-xl gap-2 w-full sm:w-auto" onClick={() => reset()}>
            <RotateCcw className="h-4 w-4" />
            Tekrar dene
          </Button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-xl gap-2 w-full sm:w-auto" })}
          >
            <LayoutDashboard className="h-4 w-4" />
            Panele dön
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-muted-foreground/70">
            Hata kodu: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
