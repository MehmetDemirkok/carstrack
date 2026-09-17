"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { Vehicle } from "@/lib/types";

/**
 * "Hatırlatma gönderemiyoruz" şeridi.
 *
 * Ürünün ana vaadi sigorta/muayene süresi dolmadan haber vermek; bu da
 * `fleet-alerts` cron'unun araçta bir bitiş tarihi bulmasına bağlı. Canlı veride
 * 43 aracın 31'inde sigorta tarihi boştu — yani kullanıcı veri girdi, karşılığında
 * hiçbir uyarı alamadı ve sessizce terk etti. Cron veri yokluğunda hiçbir şey
 * söyleyemediği için bunu arayüzde göstermek zorundayız.
 *
 * Eksik tarih yoksa hiçbir şey çizmez.
 */

const MAX_CHIPS = 3;

export function MissingDataBanner({ vehicles }: { vehicles: Vehicle[] }) {
  const missing = vehicles.filter((v) => !v.insuranceExpiry || !v.inspectionExpiry);
  if (missing.length === 0) return null;

  const noInsurance = missing.filter((v) => !v.insuranceExpiry).length;
  const noInspection = missing.filter((v) => !v.inspectionExpiry).length;

  const parts: string[] = [];
  if (noInsurance > 0) parts.push(`${noInsurance} araçta sigorta`);
  if (noInspection > 0) parts.push(`${noInspection} araçta muayene`);

  const shown = missing.slice(0, MAX_CHIPS);
  const rest = missing.length - shown.length;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {parts.join(", ")} tarihi eksik
          </p>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
            Tarih girilmeyen araçlar için süre dolmadan hatırlatma gönderemiyoruz.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {shown.map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-background/60 px-2 py-1 text-xs font-medium transition-colors hover:bg-background"
              >
                {v.plate || "Plakasız"}
                <ChevronRight className="h-3 w-3 opacity-60" />
              </Link>
            ))}
            {rest > 0 && (
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
              >
                +{rest} araç daha
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
