"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CarFront, Activity, Settings, ClipboardList, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, loading } = useAuth();
  const needsProfileCompletion = !!profile && !profile.department;
  const isDriver = profile?.role === "driver";

  const navItems = isDriver
    ? [
        { href: "/tasks", icon: ClipboardList, label: "Seyahatler" },
        { href: "/vehicles", icon: CarFront, label: t("nav_vehicles").split(" ")[0] },
        { href: "/settings", icon: Settings, label: t("nav_settings") },
      ]
    : [
        { href: "/", icon: LayoutDashboard, label: t("nav_dashboard") },
        { href: "/vehicles", icon: CarFront, label: t("nav_vehicles").split(" ")[0] },
        { href: "/tasks", icon: ClipboardList, label: t("nav_tasks") },
        { href: "/users", icon: Users, label: "Ekip" },
        { href: "/analytics", icon: Activity, label: t("nav_analytics").split(" ")[0] },
        { href: "/settings", icon: Settings, label: t("nav_settings") },
      ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe md:hidden">
      <div className="max-w-md mx-auto px-3 pb-2">
        <div className="overflow-hidden relative rounded-3xl border border-border/50 bg-background/90 shadow-2xl"
          style={{ backdropFilter: "blur(20px)" }}>
          {/* Top orange edge line */}
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)" }} />

          <div className="flex justify-around items-center h-16 px-1">
            {!loading && navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 tap-highlight-transparent">
                  {isActive && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-y-2 inset-x-1 rounded-2xl"
                      style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <div className="relative z-10">
                    <item.icon
                      className={cn("w-5 h-5 transition-all duration-300")}
                      style={{ color: isActive ? "#6366f1" : undefined }}
                    />
                    {!isActive && <item.icon className="w-5 h-5 hidden" />}
                    {item.href === "/settings" && needsProfileCompletion && !isActive && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-1 ring-background" />
                    )}
                  </div>
                  <span
                    className={cn("text-[9px] font-semibold transition-colors duration-300 relative z-10",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    style={isActive ? { fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.04em" } : undefined}
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
