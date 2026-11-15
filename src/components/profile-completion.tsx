"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, UserRoundPen, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { isDriverRole } from "@/lib/types";
import {
  completionPercent,
  completionUrl,
  getMissingProfileFields,
  requiresDepartment,
  type MissingField,
} from "@/lib/profile-completeness";
import { cn } from "@/lib/utils";

/** Giriş yapan kullanıcının profil eksikleri (profil yüklenmeden boş döner). */
export function useProfileCompleteness() {
  const { profile } = useAuth();
  if (!profile) return { ready: false, missing: [] as MissingField[], percent: 100, isDriver: false, needsDept: false };
  const input = {
    role: profile.role,
    fullName: profile.fullName,
    department: profile.department,
    licenseNumber: profile.licenseNumber,
    licenses: profile.licenses,
  };
  return {
    ready: true,
    missing: getMissingProfileFields(input),
    percent: completionPercent(input),
    isDriver: isDriverRole(profile.role),
    needsDept: requiresDepartment(profile.role),
  };
}

const DISMISS_KEY = "profile-banner-dismissed";

/**
 * Pano/görevler sayfasının üstündeki ince hatırlatma bandı. Kapatılırsa bu
 * oturum boyunca gizli kalır (sessionStorage) — her girişte nazikçe hatırlatır
 * ama aynı oturumda ısrar etmez. Profil tamamsa hiç görünmez.
 */
export function ProfileCompletionBanner({ className }: { className?: string }) {
  const { ready, missing, isDriver } = useProfileCompleteness();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  if (!ready || missing.length === 0 || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* yoksay */ }
  }

  const hint = isDriver && missing.some((m) => m.section === "ehliyet")
    ? "Ehliyet bilgileriniz eksiksiz olursa süresi dolmadan sizi uyarabiliriz."
    : "Ekibiniz sizi kolayca tanısın, kayıtlar doğru kişiyle eşleşsin.";

  return (
    <div
      role="status"
      className={cn(
        "relative flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 pr-10",
        className,
      )}
    >
      <span className="p-2 rounded-xl bg-indigo-500/15 shrink-0">
        <UserRoundPen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Profilinizi tamamlayın</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Eksik: {missing.map((m) => m.label).join(", ")}. {hint}
        </p>
      </div>
      <Link
        href={completionUrl(missing)}
        className="shrink-0 inline-flex items-center gap-0.5 h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
      >
        Tamamla <ChevronRight className="h-3.5 w-3.5" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hatırlatmayı kapat"
        className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Ayarlar sayfasının en üstündeki kontrol listesi: ilerleme çubuğu ve her
 * eksik alan için ilgili bölüme kaydıran bağlantı. Profil tamamsa görünmez.
 */
export function ProfileCompletionCard({ onJump }: { onJump: (section: MissingField["section"]) => void }) {
  const { ready, missing, percent, isDriver, needsDept } = useProfileCompleteness();
  if (!ready || missing.length === 0) return null;

  const all: { label: string; done: boolean; section: MissingField["section"] }[] = [
    { label: "Ad Soyad", done: !missing.some((m) => m.key === "fullName"), section: "profil" },
    ...(needsDept
      ? [{ label: "Departman / Ünvan", done: !missing.some((m) => m.key === "department"), section: "profil" as const }]
      : []),
    ...(isDriver
      ? [
          { label: "Ehliyet numarası", done: !missing.some((m) => m.key === "licenseNumber"), section: "ehliyet" as const },
          {
            label: "Ehliyet sınıfı ve geçerlilik tarihi",
            done: !missing.some((m) => m.key === "licenseClass" || m.key === "licenseExpiry"),
            section: "ehliyet" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-3xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-xl bg-indigo-500/15 shrink-0">
          <UserRoundPen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Profilinizi tamamlayın</p>
          <p className="text-xs text-muted-foreground">
            {isDriver
              ? "Ehliyet bilgileriniz eksiksiz olursa süresi dolmadan sizi zamanında uyarabiliriz."
              : "Bilgileriniz eksiksiz olursa ekibiniz sizi kolayca tanır."}
          </p>
        </div>
        <span className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">%{percent}</span>
      </div>

      <div className="h-1.5 rounded-full bg-indigo-500/15 overflow-hidden" aria-hidden>
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="space-y-1">
        {all.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              disabled={item.done}
              onClick={() => onJump(item.section)}
              className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors enabled:hover:bg-indigo-500/10 disabled:cursor-default"
            >
              {item.done
                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                : <Circle className="h-4 w-4 text-indigo-500 shrink-0" />}
              <span className={cn("flex-1", item.done ? "text-muted-foreground line-through" : "font-medium")}>{item.label}</span>
              {!item.done && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
