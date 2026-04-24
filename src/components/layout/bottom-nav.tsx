"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CarFront, Wrench, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Özet" },
  { href: "/vehicles", icon: CarFront, label: "Araçlarım" },
  { href: "/history", icon: Wrench, label: "Bakım" },
  { href: "/analytics", icon: PieChart, label: "Analiz" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden">
      <div className="max-w-md mx-auto px-4 pb-2">
        <div className="glass rounded-2xl border border-border/50 shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center justify-center w-16 h-full gap-1 tap-highlight-transparent"
                >
                  <div className="relative">
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-all duration-300",
                        isActive
                          ? "text-primary scale-110"
                          : "text-muted-foreground"
                      )}
                    />
                    {isActive && (
                      <motion.div
                        layoutId="navGlow"
                        className="absolute -inset-3 bg-primary/15 rounded-xl blur-sm"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium transition-colors duration-300 relative z-10",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
