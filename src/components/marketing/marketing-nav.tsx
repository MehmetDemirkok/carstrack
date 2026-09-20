"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";
import { EASE } from "./motion-primitives";

const LINKS = [
  { href: "/ozellikler", label: "Özellikler" },
  { href: "/arac-bakim-takip", label: "Rehber" },
  { href: "/sss", label: "SSS" },
];

/**
 * Giriş öncesi tüm sayfaların ortak üst çubuğu.
 * Daha önce yalnızca ana sayfada vardı; /ozellikler, /sss ve /arac-bakim-takip
 * sayfalarında hiç nav yoktu — arama motorundan gelen ziyaretçi siteye
 * dönemiyordu.
 */
export function MarketingNav() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sayfa kaydırıldığında çubuk hafifçe "oturur" — zemin koyulaşır, gölge gelir.
  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 12);
  });

  // Menü açıkken Esc ile kapansın ve arka plan kaymasın.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <motion.nav
      initial={reduce ? false : { y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow,height] duration-300",
        scrolled || menuOpen
          ? "border-border/70 bg-background/90 shadow-sm"
          : "border-transparent bg-background/60"
      )}
    >
      {/* Klavye kullanıcıları için ilk durak */}
      <a
        href="#icerik"
        className="skip-link rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        İçeriğe atla
      </a>

      <div
        className={cn(
          "container-marketing flex items-center justify-between gap-4 transition-[height] duration-300",
          scrolled ? "h-14" : "h-16"
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark size={34} />
          <span className="font-outfit text-lg font-extrabold tracking-tight">
            Cars<span className="text-gradient">Track</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
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
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:inline-flex"
          >
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
          >
            Ücretsiz Başla
          </Link>

          {/* Mobil menü düğmesi — bağlantılar md altında gizli olduğu için
              telefondan gelen ziyaretçinin alt sayfalara tek erişim yolu. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobil-menu"
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobil-menu"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden border-t border-border/60 bg-background/95 md:hidden"
          >
            <div className="container-marketing flex flex-col gap-1 py-4">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/60"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:hidden"
              >
                Giriş Yap
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
