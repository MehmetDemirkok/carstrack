"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationItem } from "@/hooks/use-notifications";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { profile, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
    : user?.email
    ? getInitials(user.email.split("@")[0])
    : "?";
  const greeting = getGreeting();
  
  const { notifications, loading: notifLoading } = useNotifications();
  const hasNotifications = notifications.length > 0;

  const getTypeColor = (type: NotificationItem["type"]) => {
    switch (type) {
      case "error": return "text-destructive bg-destructive/10 border-destructive/20";
      case "urgent": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "warning": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "info": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default: return "text-primary bg-primary/10 border-primary/20";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/30">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 w-full">
        {/* Professional Profile Section */}
        <Link href="/settings" className="flex items-center gap-3.5 tap-highlight-transparent group hover:bg-muted/40 p-1.5 pr-4 rounded-full transition-colors border border-transparent hover:border-border/50">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm transition-transform group-hover:scale-105">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
              {greeting}
            </span>
            <span className="text-sm font-bold font-outfit tracking-tight text-foreground group-hover:text-primary transition-colors">
              {displayName}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-primary/10 transition-transform active:scale-90"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-300" />
          </Button>

          {/* Notification Button & Popover */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className={`relative rounded-full h-10 w-10 transition-colors ${showNotifications ? "bg-primary/10 text-primary" : "hover:bg-primary/10"}`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <>
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background shadow-sm"
                  />
                  <motion.span
                    animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive/60"
                  />
                </>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-14 right-0 w-[320px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden z-50 origin-top-right"
                >
                  <div className="p-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
                    <h3 className="font-outfit font-bold text-sm">Bildirimler</h3>
                    <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                      {notifications.length} Yeni
                    </span>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifLoading ? (
                      <div className="p-10 flex flex-col items-center justify-center text-center">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-2" />
                        <p className="text-[13px] text-muted-foreground">Bildirimler yükleniyor...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center mb-4 shadow-sm">
                          <Bell className="h-7 w-7 text-muted-foreground/60" />
                        </div>
                        <p className="text-[15px] font-semibold text-foreground">Henüz bir bildirim yok</p>
                        <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
                          Size ait yeni bir uyarı veya gelişme olduğunda burada görünecektir.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href={`/vehicles/${notif.vehicleId}`}
                            onClick={() => setShowNotifications(false)}
                            className="p-4 border-b border-border/30 hover:bg-muted/30 transition-colors block"
                          >
                            <div className="flex gap-3">
                              <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${getTypeColor(notif.type).split(' ')[0].replace('text-', 'bg-')}`} />
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
                    <div className="p-3 border-t border-border/40 bg-muted/10 text-center sticky bottom-0">
                      <span className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        Tümünü okundu işaretle
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
