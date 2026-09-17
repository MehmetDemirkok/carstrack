"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, X, MailCheck, ChevronRight } from "lucide-react";
import { getDriverCount } from "@/lib/db";
import { useAuth } from "@/context/auth-context";

/**
 * "Şoförünü davet et" aktivasyon kartı.
 *
 * Davet akışının kendisi zaten /users sayfasında ve "Ekip" hem kenar çubuğunda
 * hem alt menüde duruyor. Eksik olan şey yolun kendisi değil, sebebi: yeni bir
 * yönetici panele baktığında ekibini davet edebileceğini ve karşılığında ne
 * kazanacağını hiçbir yerde görmüyor.
 *
 * Bu yüzden kart kalıcı bir buton değil: yalnızca şirkette hiç şoför yokken
 * yöneticiye görünür, ekip kurulunca kendiliğinden kaybolur. Davet gönderilmiş
 * ama henüz kabul edilmemişse metin ona göre değişir — "gönderdim, ne oldu?"
 * sorusunun cevabı panelde dursun.
 */

const DISMISS_KEY = "carstrack:invite-card-dismissed";

export function InviteTeamCard() {
  const { profile } = useAuth();
  const isManager = profile?.role === "manager";

  const [visible, setVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isManager) return;

    let cancelled = false;

    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage kapalıysa kartı göstermeye devam et.
    }

    (async () => {
      try {
        const drivers = await getDriverCount();
        if (cancelled || drivers > 0) return;

        // Ekip boşken bekleyen davet var mı? Yalnızca bu durumda sorulur.
        try {
          const res = await fetch("/api/invites");
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setPendingCount((data.invites ?? []).length);
          }
        } catch {
          /* davet listesi kritik değil */
        }

        if (!cancelled) setVisible(true);
      } catch {
        /* sayı alınamadıysa kartı hiç gösterme */
      }
    })();

    return () => { cancelled = true; };
  }, [isManager]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* yoksay */
    }
  };

  const hasPending = pendingCount > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3.5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Kartı kapat"
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted-foreground/70 transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 ring-1 ring-white/15">
          {hasPending ? (
            <MailCheck className="h-5 w-5 text-white" strokeWidth={2.25} />
          ) : (
            <UserPlus className="h-5 w-5 text-white" strokeWidth={2.25} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {hasPending ? (
            <>
              <p className="text-sm font-semibold">
                {pendingCount} davet kabul bekliyor
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Davet e-postası gönderildi. Kabul edilince araç atayabilir, kilometre
                ve arıza bildirimlerini onlardan alabilirsiniz.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Şoförünü ekibe davet et</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Şoförler kendi araçlarının kilometresini girer, arıza bildirir ve görev
                başlatır — filo verisi tek tek sizden geçmek zorunda kalmaz.
              </p>
            </>
          )}

          <Link
            href="/users?invite=1"
            className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {hasPending ? "Ekibi görüntüle" : "Davet gönder"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
