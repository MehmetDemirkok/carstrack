"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Car, LayoutDashboard, History, Activity, Settings, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, company } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: t("nav_dashboard"), href: "/" },
    { icon: Car, label: t("nav_vehicles"), href: "/vehicles" },
    { icon: History, label: t("nav_history"), href: "/history" },
    { icon: Activity, label: t("nav_analytics"), href: "/analytics" },
    { icon: Settings, label: t("nav_settings"), href: "/settings" },
  ];

  const initials = profile?.fullName ? getInitials(profile.fullName) : "?";

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border/30 bg-background/60 glass z-40 fixed top-0 bottom-0 left-0 overflow-hidden">
      {/* Ambient orbs */}
      <div className="orb w-56 h-56 bg-primary/30 -top-20 -left-16 animate-float-slow" />
      <div className="orb w-40 h-40 bg-[color:var(--primary-2)]/25 bottom-32 -right-12 animate-float-slow" style={{ animationDelay: "1.5s" }} />

      <div className="p-6 relative">
        <Link href="/" className="flex items-center gap-3 tap-highlight-transparent group">
          <div className="relative">
            <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              <Car className="h-5 w-5 text-white drop-shadow" />
            </div>
            <Sparkles className="h-3 w-3 text-[color:var(--primary-3)] absolute -top-0.5 -right-0.5 drop-shadow" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-outfit font-black text-xl tracking-tight text-gradient">CarsTrack</span>
            <span className="text-[10px] text-muted-foreground font-medium mt-1">Filo Asistanı</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar relative">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group ${
                isActive ? "text-primary-foreground font-bold" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground font-medium"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-mesh rounded-2xl shadow-lg shadow-primary/30"
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <item.icon className={`h-5 w-5 relative z-10 transition-transform ${isActive ? "scale-110 drop-shadow" : "group-hover:scale-105"}`} />
              <span className="relative z-10 text-sm">{item.label}</span>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-dot"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-white relative z-10 shadow-md"
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 space-y-3 border-t border-border/30 relative">
        {profile && (
          <Link
            href="/settings"
            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/40 transition-colors group"
          >
            <Avatar className="h-9 w-9 ring-gradient">
              <AvatarFallback className="bg-mesh text-white font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1 leading-none">
              <span className="text-sm font-semibold truncate">{profile.fullName}</span>
              <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                {company?.name ?? (profile.role === "manager" ? "Yönetici" : "Şoför")}
              </span>
            </div>
          </Link>
        )}
        <Link href="/vehicles/new" className="block w-full">
          <Button className="w-full rounded-2xl gap-2 font-semibold h-12 bg-mesh hover:opacity-95 text-white border-none shadow-lg shadow-primary/30">
            <Plus className="h-4 w-4" />
            {t("nav_add_vehicle")}
          </Button>
        </Link>
      </div>
    </aside>
  );
}
