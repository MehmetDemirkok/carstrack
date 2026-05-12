"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Car, LayoutDashboard, History, Activity, Settings, Plus, ClipboardList, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, loading } = useAuth();
  const isDriver = profile?.role === "driver";

  const navItems = isDriver
    ? [
        { icon: ClipboardList, label: "Seyahatlerim", href: "/tasks" },
        { icon: Car, label: t("nav_vehicles"), href: "/vehicles" },
        { icon: Settings, label: t("nav_settings"), href: "/settings" },
      ]
    : [
        { icon: LayoutDashboard, label: t("nav_dashboard"), href: "/dashboard" },
        { icon: Car, label: t("nav_vehicles"), href: "/vehicles" },
        { icon: ClipboardList, label: t("nav_tasks"), href: "/tasks" },
        { icon: Users, label: "Ekip", href: "/users" },
        { icon: History, label: t("nav_history"), href: "/history" },
        { icon: Activity, label: t("nav_analytics"), href: "/analytics" },
        { icon: Settings, label: t("nav_settings"), href: "/settings" },
      ];

  const initials = profile?.fullName ? getInitials(profile.fullName) : "?";

  return (
    <aside
      className="hidden md:flex flex-col w-64 border-r border-border/40 z-40 fixed top-0 bottom-0 left-0 overflow-hidden bg-sidebar/95"
      style={{ backdropFilter: "blur(20px)" }}
    >
      {/* Hex grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-100"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0 L60 17.3 L60 34.7 L30 52 L0 34.7 L0 17.3Z' fill='none' stroke='rgba(99,102,241,0.06)' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />
      {/* Ambient top glow */}
      <div className="absolute -top-16 -left-8 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)" }} />

      {/* Logo */}
      <div className="p-6 relative">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="p-2.5 rounded-xl transition-shadow"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.28)" }}>
            <Car className="h-5 w-5" style={{ color: "#6366f1" }} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-foreground font-extrabold text-lg tracking-tight"
              style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif" }}>
              Cars<span style={{ color: "#6366f1" }}>Track</span>
            </span>
            <span className="text-muted-foreground mt-0.5"
              style={{ fontSize: "0.6rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
              Filo Yönetim Sistemi
            </span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px mb-2" style={{ background: "rgba(99,102,241,0.1)" }} />

      <div className="flex-1 px-3 space-y-0.5 overflow-y-auto no-scrollbar relative">
        {!loading && navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative group ${
                isActive ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    borderLeft: "2px solid #6366f1",
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <div className="relative shrink-0">
                <item.icon
                  className="relative z-10 transition-all"
                  style={{ width: 18, height: 18, color: isActive ? "#6366f1" : undefined }}
                />
                {item.href === "/settings" && profile && !profile.department && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-1 ring-background z-20" />
                )}
              </div>
              <span className="relative z-10 text-sm">{item.label}</span>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-dot"
                  className="ml-auto h-1.5 w-1.5 rounded-full relative z-10"
                  style={{ background: "#6366f1" }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom: user + add vehicle */}
      <div className="p-3 space-y-2 relative">
        <div className="mx-1 h-px mb-3" style={{ background: "rgba(99,102,241,0.1)" }} />

        {profile && (
          <Link href="/settings"
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
            title={profile.fullName}>
            <Avatar className="h-8 w-8" style={{ border: "1px solid rgba(99,102,241,0.28)" }}>
              <AvatarFallback className="text-xs font-bold"
                style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1 leading-none">
              <span className="text-sm font-semibold text-foreground truncate">{profile.fullName || "Kullanıcı"}</span>
              <span className="text-muted-foreground mt-0.5"
                style={{ fontSize: "0.58rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
                {profile.role === "manager" ? "YÖNETİCİ" : "ŞOFÖR"}
              </span>
            </div>
          </Link>
        )}

        {!isDriver && (
          <Link href="/vehicles/new" className="block w-full">
            <button className="w-full h-11 rounded-xl flex items-center justify-center gap-2 transition-all font-bold"
              style={{
                background: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                color: "#fff",
                border: "none",
                fontSize: "0.82rem",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-barlow), sans-serif",
                clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
              }}>
              <Plus className="h-4 w-4" />
              {t("nav_add_vehicle")}
            </button>
          </Link>
        )}
      </div>
    </aside>
  );
}
