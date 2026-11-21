"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, MessageCircle, QrCode, Share2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Kayıt sayfasını "Şirkete Katıl" modunda, kod dolu açan link (bkz. register-client ?kod=). */
export function buildInviteLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  return `${origin}/register?kod=${encodeURIComponent(code)}`;
}

function inviteMessage(code: string, companyName?: string): string {
  const who = companyName ? `${companyName} filosuna` : "Şirketimizin filosuna";
  return `${who} CarsTrack üzerinden katılın. Bu linkten kayıt olun: ${buildInviteLink(code)} (Davet kodu: ${code})`;
}

/**
 * Ekip davet kodunu paylaşma seçenekleri: link kopyala, WhatsApp, cihazın
 * paylaşım menüsü (destekleniyorsa) ve QR kod. Sahada telefondan telefona
 * okutmak en hızlı yol olduğu için QR ayrı bir pencerede büyük gösterilir.
 */
export function InviteShareActions({ code, companyName }: { code: string; companyName?: string }) {
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı yeteneği yalnızca mount'ta okunabilir
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!showQr) return;
    let cancelled = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(buildInviteLink(code), { width: 512, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) toast.error("QR kod oluşturulamadı"); });
    return () => { cancelled = true; };
  }, [showQr, code]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteLink(code));
      toast.success("Davet linki kopyalandı", { description: "Linke tıklayan kişi kodu yazmadan kayıt olabilir." });
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "CarsTrack davetiyesi", text: inviteMessage(code, companyName) });
    } catch {
      // Kullanıcı paylaşımı iptal etti — sessiz geç.
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(inviteMessage(code, companyName))}`;
  const actionClass =
    "flex flex-col items-center justify-center gap-1 rounded-xl border border-border/50 bg-background/60 px-2 py-2.5 text-[11px] font-semibold hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <>
      <div className={`grid gap-2 ${canNativeShare ? "grid-cols-4" : "grid-cols-3"}`}>
        <button type="button" onClick={copyLink} className={actionClass}>
          <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Linki Kopyala
        </button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={actionClass}>
          <MessageCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          WhatsApp
        </a>
        <button type="button" onClick={() => setShowQr(true)} className={actionClass}>
          <QrCode className="h-4 w-4 text-foreground" aria-hidden="true" />
          QR Kod
        </button>
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={actionClass}>
            <Share2 className="h-4 w-4 text-sky-500" aria-hidden="true" />
            Paylaş
          </button>
        )}
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" aria-hidden="true" /> Davet QR Kodu
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data-URI, optimize edilecek bir şey yok
                <img src={qrDataUrl} alt={`Davet kodu ${code} için QR kod`} className="h-56 w-56" />
              ) : (
                <div className="h-56 w-56 flex items-center justify-center">
                  <span className="h-6 w-6 rounded-full border-2 border-primary border-r-transparent animate-spin" aria-label="Oluşturuluyor" />
                </div>
              )}
            </div>
            <p className="font-mono font-black text-lg tracking-[0.3em]">{code}</p>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Çalışanınız telefon kamerasıyla okutup doğrudan kayıt ekranına gelir; kod otomatik dolar.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl flex-1" />}>Kapat</DialogClose>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`carstrack-davet-${code}.png`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 h-9 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> İndir
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
