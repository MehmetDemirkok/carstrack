"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Bell, Inbox, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getNotifications, markAllNotificationsRead, markNotificationsRead,
  type AppNotification,
} from "@/lib/db";

const PAGE_SIZE = 30;

const severityDot: Record<AppNotification["severity"], string> = {
  critical: "#ef4444",
  warning: "#eab308",
  info: "#3b82f6",
};

const severityLabel: Record<AppNotification["severity"], string> = {
  critical: "Kritik",
  warning: "Uyarı",
  info: "Bilgi",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  async function loadInitial() {
    setLoading(true);
    try {
      const data = await getNotifications(PAGE_SIZE);
      setItems(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      toast.error("Bildirimler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInitial(); }, []);

  async function loadMore() {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const more = await getNotifications(PAGE_SIZE, last.createdAt);
      setItems((prev) => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
    } catch {
      toast.error("Daha fazla bildirim yüklenemedi");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkRead(n: AppNotification) {
    if (n.readAt) return;
    setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
    void markNotificationsRead([n.id]);
  }

  async function handleMarkAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => x.readAt ? x : { ...x, readAt: now }));
    try {
      await markAllNotificationsRead();
      toast.success("Tüm bildirimler okundu işaretlendi");
    } catch {
      toast.error("İşaretlenemedi");
    }
  }

  const unreadCount = items.filter((n) => !n.readAt).length;
  const visible = filter === "unread" ? items.filter((n) => !n.readAt) : items;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tüm Bildirimler</h1>
          <p className="text-sm text-muted-foreground">Aldığınız tüm bildirimlerin geçmişi</p>
        </div>
      </motion.div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`h-9 rounded-xl px-3 text-xs font-semibold border transition-colors ${filter === "all" ? "bg-primary/10 text-primary border-primary/30" : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"}`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`h-9 rounded-xl px-3 text-xs font-semibold border transition-colors ${filter === "unread" ? "bg-primary/10 text-primary border-primary/30" : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"}`}
          >
            Okunmamış {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="h-9 rounded-xl px-3 text-xs font-semibold border border-border/40 bg-muted/20 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Tümünü okundu işaretle
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{filter === "unread" ? "Okunmamış bildirim yok" : "Henüz bildirim yok"}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((n) => (
            <Link
              key={n.id}
              href={n.url || (n.vehicleId ? `/vehicles/${n.vehicleId}` : "/dashboard")}
              onClick={() => handleMarkRead(n)}
              className={`block glass rounded-2xl border p-4 transition-colors ${n.readAt ? "border-border/30 opacity-70" : "border-primary/30 bg-primary/[0.03]"}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full" style={{ background: severityDot[n.severity] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold">{n.title}</h3>
                    {!n.readAt && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">YENİ</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                    {severityLabel[n.severity]} · {formatDateTime(n.createdAt)}
                    {n.vehiclePlate ? ` · ${n.vehiclePlate}` : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {hasMore && filter === "all" && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full h-11 rounded-2xl border border-border/40 bg-muted/20 text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loadingMore ? "Yükleniyor…" : "Daha Fazla Yükle"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
