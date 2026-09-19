"use client";

import { useEffect, useState } from "react";
import { Info, TriangleAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppBanner as AppBannerValue } from "@/lib/admin/types";

/**
 * Tüm kiracılara gösterilen global duyuru/bakım bandı.
 *
 * İçerik `app_settings` tablosundan gelir; o tablo okumaya açıktır (tenant
 * verisi taşımaz, bkz. 20260919_admin_panel_v2.sql) ve yalnızca `/admin`
 * panelinden yazılır. Tablo yoksa veya okuma başarısızsa bant hiç görünmez —
 * uygulama akışını asla engellemez.
 *
 * Kapatma tercihinde mesajın kendisi anahtar olur: yeni bir duyuru
 * yayınlandığında daha önce kapatmış kullanıcıya da yeniden görünür.
 */
const DISMISS_KEY = "carstrack.banner.dismissed";

const TONES: Record<AppBannerValue["severity"], string> = {
  info: "bg-primary/10 text-primary border-primary/20",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export function AppBanner() {
  const [banner, setBanner] = useState<AppBannerValue | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "banner")
          .maybeSingle();

        if (cancelled || error || !data?.value) return;

        const value = data.value as AppBannerValue;
        if (!value.enabled || !value.message) return;

        setBanner(value);
        // localStorage kullanılamıyorsa (gizli sekme, kapalı depolama) bandı
        // yine gösteririz — duyuruyu gizlemektense tekrar göstermek yeğdir.
        try {
          setDismissed(localStorage.getItem(DISMISS_KEY) === value.message);
        } catch {
          setDismissed(false);
        }
      } catch {
        // Sessizce geç: bant bir uygulama özelliği değil, bir bildirimdir.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!banner || dismissed) return null;

  const Icon = banner.severity === "info" ? Info : TriangleAlert;

  return (
    <div className={`flex items-start gap-2 border-b px-4 py-2 text-sm ${TONES[banner.severity]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 whitespace-pre-wrap">{banner.message}</p>
      <button
        type="button"
        aria-label="Duyuruyu kapat"
        className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, banner.message);
          } catch {
            // Depolama yoksa bir sonraki yüklemede yeniden görünür — kabul.
          }
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
