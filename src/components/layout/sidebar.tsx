"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Car, LayoutDashboard, History, Activity, Settings, ClipboardList, Users, Wrench, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { LogoMark } from "@/components/brand/logo-mark";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { profile, company, loading, signOut } = useAuth();
  const isDriver = profile?.role === "user";

  const navItems = isDriver
    ? [
        { icon: LayoutDashboard, label: "Panelim", href: "/dashboard" },
        { icon: ClipboardList, label: "Seyahatlerim", href: "/tasks" },
        { icon: Wrench, label: "Arıza Bildir", href: "/reports" },
        { icon: Car, label: t("nav_vehicles"), href: "/vehicles" },
        { icon: Settings, label: t("nav_settings"), href: "/settings" },
      ]
    : [
        { icon: LayoutDashboard, label: t("nav_dashboard"), href: "/dashboard" },
        { icon: Car, label: t("nav_vehicles"), href: "/vehicles" },
        { icon: ClipboardList, label: t("nav_tasks"), href: "/tasks" },
        { icon: Wrench, label: "Arızalar", href: "/reports" },
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
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0 L60 17.3 L60 34.7 L30 52 L0 34.7 L0 17.3Z' fill='none' stroke='rgba(0,74,198,0.06)' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />
      {/* Ambient top glow */}
      <div className="absolute -top-16 -left-8 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 7%, transparent) 0%, transparent 70%)" }} />

      {/* Logo */}
      <div className="p-6 relative">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <LogoMark size={40} className="shrink-0 transition-transform group-hover:scale-105" />
          <div className="flex flex-col leading-none">
            <span className="text-foreground font-extrabold text-lg tracking-tight"
              style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif" }}>
              Cars<span style={{ color: "var(--primary)" }}>Track</span>
            </span>
            <span className="text-muted-foreground mt-0.5"
              style={{ fontSize: "0.6rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
              Filo Yönetim Sistemi
            </span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px mb-2" style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }} />

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
                    background: "color-mix(in oklab, var(--primary) 12%, transparent)",
                    borderLeft: "2px solid var(--primary)",
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <div className="relative shrink-0">
                <item.icon
                  className="relative z-10 transition-all"
                  style={{ width: 18, height: 18, color: isActive ? "var(--primary)" : undefined }}
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
                  style={{ background: "var(--primary)" }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom: user + add vehicle */}
      <div className="p-3 space-y-2 relative">
        <div className="mx-1 h-px mb-3" style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }} />

        {profile && (
          <div className="flex items-center gap-3 bg-accent rounded-2xl p-3">
            <Link href="/settings"
              className="flex items-center gap-3 min-w-0 flex-1 group"
              title={profile.fullName}>
              <Avatar className="h-9 w-9 shrink-0" style={{ border: "2px solid color-mix(in oklab, var(--primary) 30%, transparent)" }}>
                {profile.avatarUrl && (
                  <AvatarImage src={profile.avatarUrl} alt={profile.fullName || "Profil"} className="object-cover" />
                )}
                <AvatarFallback className="text-xs font-bold"
                  style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 leading-none">
                <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{profile.fullName || "Kullanıcı"}</span>
                <span className="text-muted-foreground truncate mt-1"
                  style={{ fontSize: "0.58rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.04em" }}>
                  {[company?.name, profile.role === "manager" ? "ADMIN" : profile.role === "operator" ? "OPERATÖR" : "KULLANICI"].filter(Boolean).join(" · ")}
                </span>
              </div>
            </Link>
            <button
              onClick={signOut}
              title="Çıkış Yap"
              className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
