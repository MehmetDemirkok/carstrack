"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, Shield, Wrench, Disc3, Calendar, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVehicles } from "@/lib/db";
import { getFleetAlerts } from "@/lib/store";
import type { FleetAlert } from "@/lib/types";
import { useAuth } from "@/context/auth-context";

const categoryIcon = {
  insurance: Shield,
  inspection: Calendar,
  maintenance: Wrench,
  tire: Disc3,
};

const severityRing = {
  critical: "bg-red-500/15 text-red-500",
  warning: "bg-orange-500/15 text-orange-500",
  info: "bg-blue-500/15 text-blue-500",
};

const severityLabel = {
  critical: "Kritik",
  warning: "Uyarı",
  info: "Bilgi",
};

const severityBar = {
  critical: "bg-red-500",
  warning: "bg-orange-500",
  info: "bg-blue-500",
};

export function NotificationsPopover() {
  const { user, profile, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !profile) return;
    let cancelled = false;
    (async () => {
      try {
        const vehicles = await getVehicles();
        if (cancelled) return;
        setAlerts(getFleetAlerts(vehicles));
        setLoaded(true);
      } catch {
        // Silently degrade — bell still clickable
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, profile]);

  const unreadCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-9 w-9 hover:bg-primary/10"
            aria-label="Bildirimler"
          />
        }
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <>
            <motion.span
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-background shadow-sm ${
                criticalCount > 0 ? "bg-destructive" : "bg-orange-500"
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
            <motion.span
              animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              className={`absolute top-1 right-1 h-[16px] w-[16px] rounded-full ${
                criticalCount > 0 ? "bg-destructive/60" : "bg-orange-500/60"
              }`}
            />
          </>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={10}>
          <Popover.Popup className="z-50 w-[340px] max-w-[92vw] rounded-2xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl shadow-primary/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 origin-top-right">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                </div>
                <Popover.Title className="text-sm font-bold font-outfit">Bildirimler</Popover.Title>
              </div>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                  {unreadCount} aktif
                </span>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {!loaded ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 text-center text-xs text-muted-foreground"
                  >
                    Yükleniyor…
                  </motion.div>
                ) : alerts.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-2 px-6 py-10"
                  >
                    <div className="p-3 rounded-2xl bg-emerald-500/10">
                      <Inbox className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold">Her şey yolunda</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px]">
                      Şu an aktif bildirim yok. Bakım veya belge süresi yaklaşan olursa burada görürsünüz.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-2 space-y-1.5"
                  >
                    {alerts.slice(0, 8).map((alert) => {
                      const Icon = categoryIcon[alert.category] ?? AlertTriangle;
                      return (
                        <Popover.Close
                          key={alert.id}
                          render={
                            <Link
                              href={`/vehicles/${alert.vehicleId}`}
                              className="relative block px-3 py-2.5 pl-4 rounded-xl hover:bg-muted/50 transition-colors group"
                            />
                          }
                        >
                          <span className={`absolute left-1.5 top-3 bottom-3 w-1 rounded-r ${severityBar[alert.severity]}`} />
                          <div className="flex gap-2.5 items-start">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${severityRing[alert.severity]}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-xs font-bold truncate">{alert.title}</p>
                                <span className="text-[9px] font-bold text-muted-foreground shrink-0">{alert.vehiclePlate}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{alert.description}</p>
                              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                {severityLabel[alert.severity]}
                              </span>
                            </div>
                          </div>
                        </Popover.Close>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {alerts.length > 0 && (
              <div className="border-t border-border/40 p-2">
                <Popover.Close
                  render={
                    <Link
                      href="/"
                      className="block w-full text-center text-xs font-bold text-primary hover:bg-primary/5 rounded-xl py-2 transition-colors"
                    />
                  }
                >
                  Tüm uyarıları gör
                </Popover.Close>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
