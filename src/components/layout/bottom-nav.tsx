"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CarFront, Activity, Settings, ClipboardList, Users, Wrench, History, Gavel, Fuel, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { isDriverRole } from "@/lib/types";
import { useProfileCompleteness } from "@/components/profile-completion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavItem = { href: string; icon: React.ElementType; label: string };

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

/**
 * Mobil alt menü. Telefonda en fazla 5 yuva: en sık kullanılan 4 sayfa +
 * "Menü". Geri kalan sayfalar alttan açılan bir panelde ızgara olarak durur.
 *
 * Önceden yöneticide 10, sürücüde 7 sekme tek satıra sığdırılmaya çalışılıyordu:
 * 375 px ekranda yatay kayıyor, etiketler 8 px'e düşüyordu.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, loading } = useAuth();
  const { missing } = useProfileCompleteness();
  const [moreOpen, setMoreOpen] = useState(false);
  const isDriver = isDriverRole(profile?.role);
  const needsProfileCompletion = missing.length > 0;

  const primary: NavItem[] = isDriver
    ? [
        { href: "/dashboard", icon: LayoutDashboard, label: "Panelim" },
        { href: "/tasks", icon: ClipboardList, label: "Seyahatler" },
        { href: "/yakit", icon: Fuel, label: "Yakıt" },
        { href: "/reports", icon: Wrench, label: "Arıza" },
      ]
    : [
        { href: "/dashboard", icon: LayoutDashboard, label: t("nav_dashboard") },
        { href: "/vehicles", icon: CarFront, label: t("nav_vehicles").split(" ")[0] },
        { href: "/tasks", icon: ClipboardList, label: t("nav_tasks") },
        { href: "/reports", icon: Wrench, label: "Arıza" },
      ];

  const more: NavItem[] = isDriver
    ? [
        { href: "/traffic-fines", icon: Gavel, label: "Cezalarım" },
        { href: "/vehicles", icon: CarFront, label: t("nav_vehicles").split(" ")[0] },
        { href: "/settings", icon: Settings, label: t("nav_settings") },
      ]
    : [
        { href: "/yakit", icon: Fuel, label: "Yakıt" },
        { href: "/traffic-fines", icon: Gavel, label: "Cezalar" },
        { href: "/users", icon: Users, label: "Ekip" },
        { href: "/history", icon: History, label: "Servis" },
        { href: "/analytics", icon: Activity, label: t("nav_analytics").split(" ")[0] },
        { href: "/settings", icon: Settings, label: t("nav_settings") },
      ];

  const moreActive = more.some((item) => isActivePath(pathname, item.href));
  const settingsInMore = more.some((item) => item.href === "/settings");

  return (
    <nav aria-label="Alt menü" className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden">
      <div className="max-w-md mx-auto px-3 pb-2">
        <div
          className="overflow-hidden relative rounded-3xl border border-border/50 bg-background/90 shadow-2xl"
          style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 35%, transparent), transparent)" }}
          />

          <div className="grid grid-cols-5 h-16 px-1">
            {!loading && primary.map((item) => (
              <NavButton key={item.href} item={item} active={isActivePath(pathname, item.href)} />
            ))}
            {!loading && (
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                className="relative flex flex-col items-center justify-center h-full gap-0.5 tap-highlight-transparent"
              >
                {moreActive && <ActivePill />}
                <span className="relative z-10">
                  <LayoutGrid className="w-5 h-5" style={{ color: moreActive ? "var(--primary)" : undefined }} />
                  {settingsInMore && needsProfileCompletion && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-1 ring-background" aria-hidden />
                  )}
                </span>
                <span className={cn("text-[10px] leading-tight font-semibold relative z-10", moreActive ? "text-primary" : "text-muted-foreground")}>
                  Menü
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle className="font-outfit">Menü</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4">
            {more.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-semibold transition-colors tap-highlight-transparent",
                    active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 bg-muted/30 text-foreground hover:bg-muted/60",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {item.href === "/settings" && needsProfileCompletion && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-500" aria-label="Profil eksik" />
                  )}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function ActivePill() {
  return (
    <motion.div
      layoutId="navPill"
      className="absolute inset-y-2 inset-x-0.5 rounded-2xl"
      style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--primary) 22%, transparent)" }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
    />
  );
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center justify-center h-full gap-0.5 tap-highlight-transparent"
    >
      {active && <ActivePill />}
      <item.icon className="relative z-10 w-5 h-5 transition-colors duration-300" style={{ color: active ? "var(--primary)" : undefined }} />
      <span
        className={cn(
          "text-[10px] leading-tight font-semibold transition-colors duration-300 relative z-10 whitespace-nowrap max-w-full truncate px-0.5",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
