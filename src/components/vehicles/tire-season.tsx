import { Sun, Snowflake, Layers } from "lucide-react";
import type { TireSeasonType } from "@/lib/types";

export const TIRE_SEASON_OPTIONS: TireSeasonType[] = ["Yazlık", "Kışlık", "Dört Mevsim"];

/** Sökülen lastiklerin nerede saklandığı — hazır seçenekler. */
export const TIRE_STORAGE_OPTIONS = ["Lastik otelinde", "Firma deposunda", "Araçta / bagajda", "Hurdaya ayrıldı"] as const;

/** Bu seçenek seçilirse ortada saklanan bir takım kalmaz. */
export const TIRE_STORAGE_SCRAPPED = "Hurdaya ayrıldı";

/**
 * Takılacak mevsimin varsayılanı: araç yazlıktaysa kışlık, kışlıktaysa yazlık.
 * Dört mevsim lastikteyse takvime bakılır (Kasım–Mart arası kışlık).
 */
export function defaultTargetSeason(current: TireSeasonType): TireSeasonType {
  if (current === "Yazlık") return "Kışlık";
  if (current === "Kışlık") return "Yazlık";
  const m = new Date().getMonth() + 1;
  return m >= 11 || m <= 3 ? "Kışlık" : "Yazlık";
}

export function SeasonIcon({ season, className }: { season: TireSeasonType; className?: string }) {
  if (season === "Yazlık") return <Sun className={className} />;
  if (season === "Kışlık") return <Snowflake className={className} />;
  return <Layers className={className} />;
}

/** Rozet/çip rengi (arka plan + kenar + yazı). */
export function seasonTone(season: TireSeasonType): string {
  if (season === "Yazlık") return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
  if (season === "Kışlık") return "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400";
  return "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400";
}

/** Şemadaki lastiğin dolgu rengi. */
export function seasonFill(season: TireSeasonType): string {
  if (season === "Yazlık") return "bg-orange-500";
  if (season === "Kışlık") return "bg-violet-500";
  return "bg-teal-500";
}

export function seasonLower(season: TireSeasonType): string {
  return season.toLocaleLowerCase("tr-TR");
}
