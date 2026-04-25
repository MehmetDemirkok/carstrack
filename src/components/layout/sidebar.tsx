"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Car, LayoutDashboard, History, Activity, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { icon: LayoutDashboard, label: t("nav_dashboard"), href: "/" },
    { icon: Car, label: t("nav_vehicles"), href: "/vehicles" },
    { icon: History, label: t("nav_history"), href: "/history" },
    { icon: Activity, label: t("nav_analytics"), href: "/analytics" },
    { icon: Settings, label: t("nav_settings"), href: "/settings" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border/30 bg-background/50 glass z-40 fixed top-0 bottom-0 left-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 tap-highlight-transparent">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <span className="font-outfit font-black text-xl tracking-tight">CarsTrack</span>
        </Link>
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative ${
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:bg-muted/50 font-medium"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <item.icon className="h-5 w-5 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/30">
        <Link href="/vehicles/new" className="block w-full">
          <Button className="w-full rounded-xl gap-2 font-semibold h-12 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            {t("nav_add_vehicle")}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
