"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, LogOut, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationItem } from "@/hooks/use-notifications";
import { useCommandPalette } from "@/context/command-palette-context";
import { useTheme } from "next-themes";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "İyi Geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi Günler";
  return "İyi Akşamlar";
}

export function TopBar() {
  const { profile, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const notifRef = useRef<HTMLDivElement>(null);
  const { setOpen: openPalette } = useCommandPalette();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = profile?.fullName || user?.email?.split("@")[0] || "Değerli Üyemiz";
  const initials = profile?.fullName
    ? getInitials(profile.fullName)
    : user?.email ? getInitials(user.email.split("@")[0]) : "?";

  const { notifications, loading: notifLoading, unreadCount, markAllRead, markRead } = useNotifications();

  const getTypeDot = (type: NotificationItem["type"]) => {
    switch (type) {
      case "error": return "#ef4444";
      case "urgent": return "#f59e0b";
      case "warning": return "#eab308";
      case "info": return "#3b82f6";
      default: return "var(--primary)";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="flex h-14 items-center justify-between px-4 md:px-6 w-full">

        {/* Left: search */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon"
            className="rounded-xl h-9 !w-auto px-3 hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            onClick={() => openPalette(true)}
            suppressHydrationWarning>
            <Search className="h-4 w-4" />
            <span className="text-sm">Ara…</span>
            <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted border border-border text-muted-foreground"
              style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
              ⌘K
            </kbd>
          </Button>
          <Button variant="ghost" size="icon"
            className="rounded-xl h-9 w-9 flex md:hidden text-muted-foreground hover:text-foreground hover:bg-muted/60"
            onClick={() => openPalette(true)}
            suppressHydrationWarning>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: actions + user */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle — suppressHydrationWarning prevents title mismatch */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={mounted ? (theme === "dark" ? "Açık tema" : "Koyu tema") : undefined}
            suppressHydrationWarning
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Logout — mobil; masaüstünde sidebar kartında */}
          {profile && (
            <Button variant="ghost" size="icon"
              className="rounded-xl h-9 w-9 flex md:hidden text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Çıkış Yap" onClick={signOut} suppressHydrationWarning>
              <LogOut className="h-4 w-4" />
            </Button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className={`relative rounded-xl h-9 w-9 transition-colors ${showNotifications ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              suppressHydrationWarning
              onClick={() => setShowNotifications((v) => !v)}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <>
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border border-background"
                    style={{ background: "var(--primary)" }}
                  />
                  <motion.span
                    animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                    style={{ background: "color-mix(in oklab, var(--primary) 60%, transparent)" }}
                  />
                </>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute top-12 right-0 w-[300px] max-w-[calc(100vw-1rem)] overflow-hidden z-50 origin-top-right bg-card border border-border/50 shadow-2xl"
                  style={{ borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px color-mix(in oklab, var(--primary) 5%, transparent)" }}
                >
                  <div className="px-4 py-3 flex justify-between items-center border-b border-border/50 bg-muted/30">
                    <h3 className="text-sm font-bold text-foreground tracking-wider"
                      style={{ fontFamily: "var(--font-barlow), sans-serif" }}>
                      BİLDİRİMLER
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)", color: "var(--primary)", fontFamily: "var(--font-ibm-mono), monospace" }}>
                        {unreadCount} YENİ
                      </span>
                    )}
                  </div>

                  <div className="max-h-[280px] overflow-y-auto">
                    {notifLoading ? (
                      <div className="p-8 flex flex-col items-center justify-center text-center">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="h-5 w-5 border-2 rounded-full mb-2"
                          style={{ borderColor: "color-mix(in oklab, var(--primary) 30%, transparent)", borderTopColor: "var(--primary)" }} />
                        <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
                          Yükleniyor...
                        </p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-muted border border-border">
                          <Bell className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Bildirim yok</p>
                        <p className="text-xs text-muted-foreground mt-1">Yeni uyarılar burada görünecek.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((notif) => (
                          <Link key={notif.id} href={notif.url || (notif.vehicleId ? `/vehicles/${notif.vehicleId}` : "/dashboard")}
                            onClick={() => { markRead(notif.id); setShowNotifications(false); }}
                            className="px-4 py-3 block hover:bg-muted/40 transition-colors border-b border-border/30 last:border-0">
                            <div className="flex gap-3">
                              <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: getTypeDot(notif.type) }} />
                              <div>
                                <h4 className="text-sm font-semibold text-foreground leading-tight">{notif.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-snug">{notif.description}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 text-center border-t border-border/40 bg-muted/20">
                      <button onClick={markAllRead}
                        className="text-xs font-medium cursor-pointer hover:text-foreground transition-colors"
                        style={{ color: "var(--primary)", background: "none", border: "none", fontFamily: "var(--font-ibm-mono), monospace" }}>
                        Tümünü okundu işaretle
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider + kullanıcı (sağ köşe) */}
          <div className="h-7 w-px bg-border mx-1.5 hidden sm:block" />
          <Link href="/settings" className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/60 transition-colors group">
            <div className="text-right leading-none hidden sm:flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1"
                style={{ fontFamily: "var(--font-ibm-mono), monospace" }} suppressHydrationWarning>
                {getGreeting()}
              </span>
              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors"
                style={{ fontFamily: "var(--font-barlow), sans-serif" }}>
                {displayName}
              </span>
            </div>
            <Avatar className="h-8 w-8 transition-transform group-hover:scale-105" style={{ border: "1px solid color-mix(in oklab, var(--primary) 35%, transparent)" }}>
              {profile?.avatarUrl && (
                <AvatarImage src={profile.avatarUrl} alt={displayName} className="object-cover" />
              )}
              <AvatarFallback className="text-xs font-bold" style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)", color: "var(--primary)" }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
