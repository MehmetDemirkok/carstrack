import { useState, useEffect } from "react";
import { getVehicles } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

export type NotificationType = "warning" | "error" | "info" | "urgent";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.companyId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        const vehicles = await getVehicles();
        const notifs: NotificationItem[] = [];
        const today = new Date();

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
        });

        // En aciller (error -> urgent -> warning -> info) en üstte olacak şekilde sıralayalım
        const typeWeight = { error: 4, urgent: 3, warning: 2, info: 1 };
        notifs.sort((a, b) => typeWeight[b.type] - typeWeight[a.type]);

        setNotifications(notifs);
      } catch (error) {
        console.error("Bildirimler yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [profile?.companyId]);

  return { notifications, loading };
}
