"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { isPushSupported, getPushSubscribed, subscribeToPush } from "@/lib/push-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "carstrack:push-prompt-dismissed-at";
const LEGACY_SESSION_KEY = "carstrack:push-prompt-shown";
/** "Daha Sonra" / kapat sonrası tekrar sormadan önce beklenecek süre. */
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Depolama kapalıysa (gizli mod vb.) sessizce geç.
  }
}

/**
 * Push bildirimi henüz açılmamışsa kullanıcıdan onay ister. Şu durumlarda
 * hiç göstermeyiz:
 * - Tarayıcı izni "granted": kullanıcı zaten açmış; aboneliği ayarlardan
 *   yönetir (abonelik geçici olarak okunamasa bile tekrar sormayız).
 * - Tarayıcı izni "denied": yeniden sormanın tek yolu tarayıcı ayarlarıdır.
 * - Son 30 gün içinde "Daha Sonra" / kapat denmiş (localStorage — uygulama
 *   kapanıp açılınca sıfırlanmaz; eskiden sessionStorage'dı ve her açılışta
 *   tekrar çıkıyordu).
 */
export function PushPermissionPrompt() {
  const { profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !profile) return;
    if (!isPushSupported()) return;
    if (Notification.permission !== "default") return;
    if (wasRecentlyDismissed()) return;
    try { sessionStorage.removeItem(LEGACY_SESSION_KEY); } catch { /* yoksay */ }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const subscribed = await getPushSubscribed();
      if (cancelled || subscribed) return;
      setOpen(true);
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, profile]);

  async function handleEnable() {
    setBusy(true);
    try {
      await subscribeToPush();
      toast.success("Bildirimler açıldı", {
        description: "Araç, görev ve ceza güncellemelerini artık anlık alacaksınız.",
      });
      setOpen(false);
    } catch (err: unknown) {
      // İzin reddedildiyse/başarısızsa da bir süre tekrar sormayalım.
      markDismissed();
      setOpen(false);
      toast.error((err as { message?: string })?.message ?? "Bildirimler açılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) markDismissed(); setOpen(o); }}>
      <DialogContent showCloseButton className="sm:max-w-[380px]">
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15">
            <Bell className="h-5.5 w-5.5 text-primary" />
          </span>
          <div className="space-y-1.5">
            <p className="font-outfit font-semibold text-base">Bildirimleri açalım mı?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yeni araç, görev ataması, muayene/sigorta hatırlatması ve trafik cezası gibi önemli
              gelişmeleri anlık bildirimle kaçırmayın.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={handleEnable} disabled={busy} className="w-full">
            {busy ? "Açılıyor…" : "Bildirimleri Aç"}
          </Button>
          <Button variant="ghost" onClick={() => { markDismissed(); setOpen(false); }} disabled={busy} className="w-full">
            Daha Sonra
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
