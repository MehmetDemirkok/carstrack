"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { isPushSupported, getPushSubscribed, subscribeToPush } from "@/lib/push-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "carstrack:push-prompt-shown";

/**
 * Girişten sonra bir kez, push bildirimi henüz açılmamışsa kullanıcıdan
 * onay ister. Tarayıcı izni zaten "denied" ise (kullanıcı daha önce
 * reddetmiş) hiç göstermeyiz — yeniden sormanın tek yolu tarayıcı
 * ayarlarıdır, boşuna rahatsız etmeyelim.
 */
export function PushPermissionPrompt() {
  const { profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !profile) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (!isPushSupported()) return;
    if (Notification.permission === "denied") return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const subscribed = await getPushSubscribed();
      if (cancelled || subscribed) return;
      sessionStorage.setItem(SESSION_KEY, "1");
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
      toast.error((err as { message?: string })?.message ?? "Bildirimler açılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy} className="w-full">
            Daha Sonra
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
