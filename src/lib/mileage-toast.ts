import { toast } from "sonner";

/**
 * Şüpheli km girişinde (bkz. checkMileageChange) kaydı engellemek yerine
 * kullanıcıdan onay ister: uyarı toast'ında "Yine de kaydet" butonu çıkar,
 * basılırsa onConfirm çalışır.
 */
export function warnSuspiciousMileage(message: string, onConfirm: () => void): void {
  toast.warning("Kilometreyi kontrol edin", {
    description: message,
    duration: 12000,
    action: { label: "Yine de kaydet", onClick: onConfirm },
  });
}
