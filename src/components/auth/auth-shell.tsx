"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { LogoMark } from "@/components/brand/logo-mark";

/**
 * Giriş ve kayıt ekranlarının ORTAK iskeleti.
 *
 * Önceden iki ekran birbirinden bağımsızdı: login koyu lacivert üç sütun,
 * register açık gri üç sütun, ikisinde de aynı pazarlama paneli farklı
 * tasarımla iki kez yazılmıştı. Artık tek sütun, tek iskelet — ikna işi
 * landing'in, bu ekranların işi kullanıcıyı hızla içeri almak.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-hero relative flex min-h-[100dvh] w-full flex-1 flex-col overflow-x-hidden">
      <div
        aria-hidden
        className="bg-hero-grid pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden
        className="orb -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2"
        style={{ background: "color-mix(in oklab, var(--brand-1) 14%, transparent)" }}
      />

      {/* üst çubuk — ana sayfaya dönüş ve tema */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={mounted ? (theme === "dark" ? "Açık tema" : "Koyu tema") : undefined}
          aria-label="Tema değiştir"
          suppressHydrationWarning
          className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16 pt-4">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[27rem]"
        >
          <div className="mb-8 space-y-4 text-center">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="font-outfit text-lg font-extrabold tracking-tight">
                Cars<span className="text-gradient">Track</span>
              </span>
            </Link>
            <div className="space-y-2">
              <h1 className="font-outfit text-3xl font-black tracking-tight text-balance">
                {title}
              </h1>
              {description && (
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-sm sm:p-7">
            {children}
          </div>

          {footer && (
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
