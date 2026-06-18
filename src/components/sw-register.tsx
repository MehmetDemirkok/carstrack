"use client";

import { useEffect } from "react";

/**
 * Service worker'ı kaydeder. Hem PWA olarak yüklenebilmek (ana ekrana ekleme)
 * hem de Web Push bildirimleri için gereklidir. Layout'a bir kez monte edilir.
 *
 * Not: Web Push'u localhost'ta da test edebilmek için geliştirme ortamında da
 * kaydederiz. sw.js'in fetch işleyicisi ağ-öncelikli olduğundan ve localhost'ta
 * önbelleklemeyi atladığından HMR ile çakışmaz.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker kaydı başarısız:", err);
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    // Kurtarma: yeni bir derleme sonrası eski (bayat) chunk'lar artık sunucuda
    // bulunmayabilir; bu durumda ChunkLoadError oluşur. Böyle bir hata
    // yakalanırsa sayfayı bir kez (sessionStorage ile sonsuz döngüye karşı
    // korumalı) sert yeniler ki en güncel HTML/chunk'lar çekilsin.
    const RELOAD_FLAG = "chunk-reload-once";
    // Bu bileşen mount olduysa sayfa sağlıklı yüklenmiş demektir; bir sonraki
    // gerçek chunk hatasının da kurtarılabilmesi için bayrağı temizle.
    sessionStorage.removeItem(RELOAD_FLAG);

    const isChunkError = (msg?: string) =>
      !!msg && (/ChunkLoadError/.test(msg) || /Loading chunk [\d]+ failed/.test(msg) || /Failed to load .*chunk/i.test(msg));

    const recover = (msg?: string) => {
      if (!isChunkError(msg)) return;
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => recover(e.message || String(e.error));
    const onRejection = (e: PromiseRejectionEvent) =>
      recover(e.reason?.message || String(e.reason));

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
