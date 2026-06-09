"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, Plus, X, Smartphone, CheckCircle2 } from "lucide-react";

// Chrome/Edge'in tetiklediği beforeinstallprompt olayının tipi (standart dışı).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !/windows phone/i.test(ua);
}

/**
 * Dashboard'da gösterilen "Uygulamayı Yükle" kartı.
 *
 * - Android/Chrome/Edge: native yükleme istemini (beforeinstallprompt) yakalar
 *   ve butona basınca doğrudan kurulum diyaloğunu açar.
 * - iOS Safari: beforeinstallprompt desteklemediğinden "Paylaş → Ana Ekrana Ekle"
 *   yönergelerini gösterir.
 * - Zaten yüklüyse (standalone) hiçbir şey göstermez.
 *
 * Not: Tarayıcılar güvenlik gereği uygulamayı tamamen "otomatik" yükleyemez;
 * kurulum mutlaka bir kullanıcı hareketi (buton tıklaması) gerektirir. Bu kart,
 * o tek tıklık adımı olabildiğince görünür ve kolay hale getirir.
 */
export function PWAInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(isIOS());

    // Kullanıcı bu oturumda kapattıysa tekrar gösterme.
    if (typeof window !== "undefined" && sessionStorage.getItem("pwa-install-dismissed") === "1") {
      setDismissed(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    // Native istem yoksa (iOS veya henüz hazır değilse) yönergeleri göster.
    setShowIosSheet(true);
  }

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem("pwa-install-dismissed", "1"); } catch { /* yoksay */ }
  }

  // Yüklüyse veya kapatıldıysa: kart gösterme.
  // (native istem yoksa bile iOS'ta yönerge butonu için kartı gösteririz.)
  if (installed || dismissed) return null;
  // Android'de native istem henüz hazır değilse ve iOS değilse kartı gizle —
  // yüklenemeyen tarayıcılarda boş yere "Yükle" göstermeyelim.
  if (!deferredPrompt && !ios) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4"
      >
        <div className="absolute -top-8 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <button
          onClick={dismiss}
          aria-label="Kapat"
          className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <p className="font-bold text-sm">Uygulamayı Telefonuna Yükle</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              CarsTrack&apos;i ana ekranına ekle, tek dokunuşla uygulama gibi aç.
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-3.5 py-2.5 hover:opacity-90 active:scale-95 transition-all"
          >
            <Download className="h-4 w-4" />
            Yükle
          </button>
        </div>
      </motion.div>

      {/* iOS yönerge sayfası */}
      <AnimatePresence>
        {showIosSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIosSheet(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl border border-border/50 bg-card p-6 space-y-5 shadow-2xl"
            >
              <button
                onClick={() => setShowIosSheet(false)}
                aria-label="Kapat"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-bold text-base">Ana Ekrana Ekle</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                iPhone/iPad&apos;de uygulamayı yüklemek için Safari&apos;de şu 2 adımı izle:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3.5 py-3">
                  <div className="h-8 w-8 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                    <Share className="h-4 w-4 text-sky-500" />
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">1.</span> Alt çubuktaki <b>Paylaş</b> simgesine dokun
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3.5 py-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Plus className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">2.</span> <b>Ana Ekrana Ekle</b> seçeneğine dokun
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl px-3 py-2 leading-snug">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-px" />
                <span>Eklendikten sonra CarsTrack ana ekranından tek dokunuşla açılır.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
