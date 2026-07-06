import { useState, useEffect, useCallback } from "react";
import { getVehicles, getNotifications, markAllNotificationsRead, markNotificationsRead, type AppNotification } from "@/lib/db";
import { useAuth } from "@/context/auth-context";
import { getOverallLicenseStatus, getMostUrgentEntry, daysUntilDate } from "@/lib/license";

const STORAGE_KEY = "carstrack_read_notif_ids";

export type NotificationType = "warning" | "error" | "info" | "urgent";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
  /** Tıklanınca gidilecek yol. Yoksa araç sayfasına düşülür. */
  url?: string;
  /** "db" = kalıcı olay bildirimi (okundu DB'de). Tanımsız = türetilen hatırlatma (localStorage). */
  source?: "db" | "derived";
  /** db kaynaklı bildirimler için okundu bilgisi. */
  read?: boolean;
}

// DB olay önemini zil tipine eşler.
function severityToType(s: AppNotification["severity"]): NotificationType {
  if (s === "critical") return "error";
  if (s === "warning") return "warning";
  return "info";
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    if (!profile?.companyId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const [vehicles, dbNotifs] = await Promise.all([
          getVehicles(),
          getNotifications().catch(() => [] as AppNotification[]),
        ]);
        const notifs: NotificationItem[] = [];
        const today = new Date();

        // --- Ehliyet Kontrolü (yalnızca sürücü rolü, kendi profili) ---
        if (profile?.role === "user") {
          const status = getOverallLicenseStatus(profile.licenses);
          const urgent = getMostUrgentEntry(profile.licenses);
          if (status === "missing") {
            notifs.push({
              id: "license_missing",
              title: "Ehliyet Bilgilerinizi Ekleyin",
              description: "Süre takibi yapabilmemiz için Ayarlar'dan ehliyet bilgilerinizi eklemenizi rica ederiz.",
              type: "info",
              date: new Date().toISOString(),
              vehicleId: "",
              vehiclePlate: "",
              url: "/settings",
            });
          } else if (status === "expired" && urgent) {
            const days = Math.abs(daysUntilDate(urgent.expiryDate!));
            notifs.push({
              id: "license_expired",
              title: "Ehliyetinizin Süresi Doldu!",
              description: `${urgent.class} sınıfı ehliyetiniz ${days} gün önce doldu. Lütfen yenileyin ve bilgilerinizi güncelleyin.`,
              type: "error",
              date: new Date().toISOString(),
              vehicleId: "",
              vehiclePlate: "",
              url: "/settings",
            });
          } else if (status === "expiring" && urgent) {
            const days = daysUntilDate(urgent.expiryDate!);
            notifs.push({
              id: "license_expiring",
              title: "Ehliyet Yenileme Yaklaşıyor",
              description: `${urgent.class} sınıfı ehliyetinizin süresine ${days} gün kaldı. Yenilemeyi unutmayın.`,
              type: days <= 7 ? "urgent" : "warning",
              date: new Date().toISOString(),
              vehicleId: "",
              vehiclePlate: "",
              url: "/settings",
            });
          }
        }

        vehicles.forEach((v) => {
          // --- Sigorta Kontrolü ---
          if (v.insuranceExpiry) {
            const expDate = new Date(v.insuranceExpiry);
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
              notifs.push({
                id: `ins_exp_${v.id}`,
                title: "Sigorta Süresi Doldu!",
                description: `${v.plate} plakalı aracın sigortası ${Math.abs(diffDays)} gün önce bitti.`,
                type: "error",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            } else if (diffDays <= 7) {
              notifs.push({
                id: `ins_urg_${v.id}`,
                title: "Sigorta Yenileme Yaklaştı",
                description: `${v.plate} plakalı aracın sigorta bitimine son ${diffDays} gün!`,
                type: "urgent",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            } else if (diffDays <= 30) {
              notifs.push({
                id: `ins_warn_${v.id}`,
                title: "Sigorta Yenileme Yaklaşıyor",
                description: `${v.plate} plakalı aracın sigortasının bitmesine ${diffDays} gün kaldı.`,
                type: "warning",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            }
          }

          // --- Muayene Kontrolü ---
          if (v.inspectionExpiry) {
            const expDate = new Date(v.inspectionExpiry);
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
              notifs.push({
                id: `insp_exp_${v.id}`,
                title: "Muayene Süresi Doldu!",
                description: `${v.plate} plakalı aracın muayenesi ${Math.abs(diffDays)} gün önce bitti. Lütfen yenileyin.`,
                type: "error",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            } else if (diffDays <= 7) {
              notifs.push({
                id: `insp_urg_${v.id}`,
                title: "Muayene Yaklaştı",
                description: `${v.plate} plakalı aracın muayenesine son ${diffDays} gün kaldı!`,
                type: "urgent",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            } else if (diffDays <= 30) {
              notifs.push({
                id: `insp_warn_${v.id}`,
                title: "Muayene Yaklaşıyor",
                description: `${v.plate} plakalı aracın muayenesine ${diffDays} gün kaldı. Randevu alın.`,
                type: "warning",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            }
          }

          // --- Lastik Kontrolü ---
          const currentMonth = today.getMonth() + 1; // 1-12
          const currentDay = today.getDate();

          // Kış lastiği uyarısı: 15 Kasım'dan sonra, araçta hala yazlık varsa
          if (v.tireStatus === "Yazlık" || v.tireStatus === "Dört Mevsim") {
            if (currentMonth === 11 && currentDay >= 15 || currentMonth === 12) {
              notifs.push({
                id: `tire_win_${v.id}`,
                title: "Kış Lastiği Değişim Zamanı",
                description: `${v.plate} plakalı araca kış lastiği taktırma tarihi yaklaştı (1 Aralık).`,
                type: "info",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            }
          }

          // Yaz lastiği uyarısı: 15 Mart'tan sonra, araçta kışlık varsa
          if (v.tireStatus === "Kışlık") {
            if (currentMonth === 3 && currentDay >= 15 || currentMonth === 4) {
              notifs.push({
                id: `tire_sum_${v.id}`,
                title: "Yaz Lastiği Değişim Zamanı",
                description: `${v.plate} plakalı araca yaz lastiği taktırma tarihi geldi.`,
                type: "info",
                date: new Date().toISOString(),
                vehicleId: v.id,
                vehiclePlate: v.plate,
              });
            }
          }

          // --- Bakım Verisi Eksik Kontrolü ---
          const hasMaintData = v.maintenanceItems?.some(
            (m) => m.lastDoneDate !== undefined || m.lastDoneMileage !== undefined
          ) ?? false;
          if (!hasMaintData) {
            notifs.push({
              id: `maint_empty_${v.id}`,
              title: "İlk Periyodik Bakımı Ekleyin",
              description: `${v.plate} plakalı aracın bakım takibi henüz başlamadı. Servis Geçmişi'nden "Periyodik Bakım" türünde bir kayıt ekleyin; yağ değişimi ve sonraki servis kilometresi otomatik hesaplanır.`,
              type: "info",
              date: new Date().toISOString(),
              vehicleId: v.id,
              vehiclePlate: v.plate,
            });
          }
        });

        // Türetilen hatırlatmalar: en aciller (error -> urgent -> warning -> info) üstte
        const typeWeight = { error: 4, urgent: 3, warning: 2, info: 1 };
        notifs.sort((a, b) => typeWeight[b.type] - typeWeight[a.type]);

        // Kalıcı olay bildirimleri (DB) — en yeniden eskiye, türetilenlerin üstünde
        const dbItems: NotificationItem[] = dbNotifs.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.body,
          type: severityToType(n.severity),
          date: n.createdAt,
          vehicleId: n.vehicleId ?? "",
          vehiclePlate: n.vehiclePlate ?? "",
          url: n.url ?? undefined,
          source: "db",
          read: n.readAt != null,
        }));

        if (!cancelled) setNotifications([...dbItems, ...notifs]);
      } catch (error) {
        console.error("Bildirimler yüklenemedi:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadNotifications();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.companyId, profile?.role, JSON.stringify(profile?.licenses ?? [])]);

  const markAllRead = useCallback(() => {
    // Türetilenler: localStorage; DB olayları: read_at güncelle + optimistik işaretle
    const derivedIds = notifications.filter((n) => n.source !== "db").map((n) => n.id);
    const next = new Set<string>([...readIds, ...derivedIds]);
    setReadIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {}

    const hasUnreadDb = notifications.some((n) => n.source === "db" && !n.read);
    if (hasUnreadDb) {
      setNotifications((prev) => prev.map((n) => n.source === "db" ? { ...n, read: true } : n));
      void markAllNotificationsRead();
    }
  }, [notifications, readIds]);

  // Tek bir bildirimi okundu işaretle (üzerine tıklanınca).
  const markRead = useCallback((id: string) => {
    const item = notifications.find((n) => n.id === id);
    if (!item) return;
    if (item.source === "db") {
      if (item.read) return;
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      void markNotificationsRead([id]);
    } else {
      if (readIds.has(id)) return;
      const next = new Set<string>([...readIds, id]);
      setReadIds(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
    }
  }, [notifications, readIds]);

  const isUnread = useCallback(
    (n: NotificationItem) => (n.source === "db" ? !n.read : !readIds.has(n.id)),
    [readIds],
  );

  // Zilde yalnızca okunmamışlar gösterilir; okundu işaretlenen anında listeden düşer.
  const visibleNotifications = notifications.filter(isUnread);
  const unreadCount = visibleNotifications.length;

  return { notifications: visibleNotifications, loading, unreadCount, markAllRead, markRead };
}
