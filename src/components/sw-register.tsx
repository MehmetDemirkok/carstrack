"use client";

import { useEffect } from "react";

/**
 * Service worker'ı kaydeder. Uygulamanın telefonlarda PWA olarak yüklenebilmesi
 * (ana ekrana eklenebilmesi) için gereklidir. Layout'a bir kez monte edilir.
 *
 * Geliştirme ortamında kaydetmeyiz — Next.js HMR ile çakışmaması ve bayat
 * varlık önbelleği oluşmaması için yalnızca production'da etkindir.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
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
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
