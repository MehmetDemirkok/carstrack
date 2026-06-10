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
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
