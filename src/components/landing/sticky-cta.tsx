"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { track } from "@vercel/analytics";

/**
 * Mobilde ekranın altında duran CTA. Pazarlama sayfalarında alt menü
 * (`BottomNav`) render edilmediği için bu alan boş kalıyordu; hero'daki
 * buton kaydırılınca kaybolduğundan tekrar erişim noktası gerekiyordu.
 * Kapanış CTA'sına yaklaşınca kaybolur ki alt bilgiyi kapatmasın.
 */
export function StickyCta({ href, label }: { href: string; label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setShow(y > 760 && y < max - 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <motion.div
      initial={false}
      animate={show ? { y: 0, opacity: 1 } : { y: 80, opacity: 0 }}
      transition={{ duration: 0.25 }}
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden ${
        show ? "" : "pointer-events-none"
      }`}
    >
      <Link
        href={href}
        tabIndex={show ? 0 : -1}
        onClick={() => track("cta_click", { konum: "mobil_sabit", hedef: href })}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}
