"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CarFront, Wrench, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/language-context";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: t("nav_dashboard") },
    { href: "/vehicles", icon: CarFront, label: t("nav_vehicles").split(" ")[0] },
    { href: "/history", icon: Wrench, label: t("nav_history").split(" ")[0] },
    { href: "/analytics", icon: Activity, label: t("nav_analytics").split(" ")[0] },
    { href: "/settings", icon: Settings, label: t("nav_settings") },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden">
      <div className="max-w-md mx-auto px-3 pb-2">
        <div className="glass rounded-3xl border border-border/50 shadow-2xl shadow-primary/10 dark:shadow-black/40 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex justify-around items-center h-16 px-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 tap-highlight-transparent"
                >
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-y-1.5 inset-x-2 bg-mesh rounded-2xl shadow-lg shadow-primary/30"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <div className="relative z-10">
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-all duration-300",
                        isActive ? "text-white drop-shadow-md" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-semibold transition-colors duration-300 relative z-10",
                      isActive ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
