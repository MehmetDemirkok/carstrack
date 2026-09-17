import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LayoutDashboard, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo-mark";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <LogoMark size={44} />
        </div>

        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-6 w-6" />
        </div>

        <p className="font-outfit text-5xl font-black tracking-tight text-primary/30">404</p>
        <h1 className="mt-1 font-outfit text-2xl font-bold tracking-tight">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir. Adresi kontrol edin
          ya da aşağıdan devam edin.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "lg", className: "rounded-xl gap-2 w-full sm:w-auto" })}
          >
            <LayoutDashboard className="h-4 w-4" />
            Panele git
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-xl gap-2 w-full sm:w-auto" })}
          >
            <Home className="h-4 w-4" />
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
