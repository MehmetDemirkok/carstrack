/**
 * Uygulama sürümü ve sürüm notları.
 *
 * Sürüm geçmişinin tek kaynağı `src/data/changelog.json`. Sürüm numarası
 * build anında package.json'dan (next.config.ts → env) gömülür; ikisinin
 * tutarlılığını `npm run version:check` (build öncesi otomatik) denetler.
 * Kurallar: CLAUDE.md > Sürümleme.
 */
import changelog from "@/data/changelog.json";

export type ChangeType = "yeni" | "iyilestirme" | "duzeltme" | "guvenlik";

export interface ReleaseChange {
  type: ChangeType;
  text: string;
}

export interface Release {
  version: string;
  date: string;
  title: string;
  changes: ReleaseChange[];
}

export const RELEASES: Release[] = changelog.versions as Release[];

/** Çalışan kodun sürümü (build'e gömülü); yoksa changelog'daki son sürüm. */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION || RELEASES[0]?.version || "0.0.0";

/** Yayının commit kısaltması (Vercel'de SHA, yerelde git) — destek talebinde işe yarar. */
export const COMMIT_SHA: string = process.env.NEXT_PUBLIC_COMMIT_SHA || "";

/** Build zamanı (ISO). */
export const BUILD_DATE: string = process.env.NEXT_PUBLIC_BUILD_DATE || "";

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  yeni: "Yeni",
  iyilestirme: "İyileştirme",
  duzeltme: "Düzeltme",
  guvenlik: "Güvenlik",
};
