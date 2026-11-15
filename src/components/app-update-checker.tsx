"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Arka planda bu kadar kaldıysa dönüşte sormadan yenile (form kaybı riski düşük). */
const AUTO_RELOAD_AFTER_HIDDEN_MS = 5 * 60_000;
/** Uygulama açıkken en sık bu aralıkla kontrol et. */
const CHECK_INTERVAL_MS = 15 * 60_000;
const TOAST_ID = "app-update";

/**
 * Yeni sürüm yayınlandığında açık uygulamayı (özellikle ana ekrana eklenmiş
 * PWA'yı) güncel tutar — kullanıcı uygulamayı silip yeniden eklemek zorunda
 * kalmaz.
 *
 * Next.js `deploymentId` ile zaten bir sonraki sayfa geçişinde tam yenileme
 * yapar. Bu bileşen, kullanıcı hiç sayfa değiştirmeden uygulamayı arka plandan
 * geri açtığında da yeni sürümü yakalar:
 *   - uzun süre arka planda kaldıysa dönüşte kendiliğinden yeniler,
 *   - kısa süreliyse kalıcı bir "Güncelle" bildirimi gösterir (yarım kalan
 *     formu bozmamak için zorla yenilemez).
 *
 * Kimlik `<html data-dpl-id>` niteliğinden okunur; yerelde (deploymentId yok)
 * hiçbir şey yapmaz.
 */
export function AppUpdateChecker() {
  const notified = useRef(false);

  useEffect(() => {
    const current = document.documentElement.dataset.dplId;
    if (!current) return;

    let hiddenAt: number | null = null;
    let lastCheck = 0;
    let checking = false;

    async function isOutdated(): Promise<boolean> {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return false;
        const { deploymentId } = (await res.json()) as { deploymentId: string | null };
        return !!deploymentId && deploymentId !== current;
      } catch {
        return false; // çevrimdışı vb. — sessizce geç
      }
    }

    async function check(opts: { wasHiddenMs?: number } = {}) {
      if (checking || notified.current) return;
      checking = true;
      lastCheck = Date.now();
      try {
        if (!(await isOutdated())) return;

        if ((opts.wasHiddenMs ?? 0) >= AUTO_RELOAD_AFTER_HIDDEN_MS) {
          window.location.reload();
          return;
        }

        notified.current = true;
        toast("Yeni sürüm hazır", {
          id: TOAST_ID,
          description: "Uygulamanın güncel hâlini kullanmak için yenileyin.",
          duration: Infinity,
          action: { label: "Güncelle", onClick: () => window.location.reload() },
        });
      } finally {
        checking = false;
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const wasHiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      void check({ wasHiddenMs });
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastCheck >= CHECK_INTERVAL_MS) {
        void check();
      }
    }, 60_000);

    const onOnline = () => void check();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
