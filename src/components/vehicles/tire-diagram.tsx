import { ChevronUp } from "lucide-react";
import type { TireSeasonType } from "@/lib/types";
import { SeasonIcon, seasonFill, seasonTone } from "./tire-season";

/** Lastik sırtı görünümü — dolgu rengin üzerine yarı saydam diş çizgileri. */
const TREAD =
  "bg-[repeating-linear-gradient(0deg,rgb(0_0_0/0.22)_0px,rgb(0_0_0/0.22)_2px,transparent_2px,transparent_6px)]";

function Tire({ season, className }: { season: TireSeasonType; className: string }) {
  return (
    <div className={`absolute w-[18px] h-[44px] rounded-[6px] ${seasonFill(season)} shadow-sm ring-1 ring-black/10 ${className}`}>
      <div className={`h-full w-full rounded-[6px] ${TREAD}`} />
    </div>
  );
}

function PositionLabel({ label, season, align }: { label: string; season: TireSeasonType; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col gap-1 ${align === "left" ? "items-end text-right" : "items-start text-left"}`}>
      <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${seasonTone(season)}`}>
        <SeasonIcon season={season} className="h-3 w-3" /> {season}
      </span>
    </div>
  );
}

/**
 * Aracın üstten görünümü: dört lastik takılı mevsimin rengiyle boyanır,
 * her konumun yanında etiket ve mevsim çipi durur.
 */
export function TireDiagram({ season, size }: { season: TireSeasonType; size?: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-muted/40 px-3 py-4">
      <div className="mb-2 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <ChevronUp className="h-3 w-3" /> Ön
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        {/* Sol etiketler */}
        <div className="flex h-[220px] flex-col justify-between py-[30px]">
          <PositionLabel label="Sol Ön" season={season} align="left" />
          <PositionLabel label="Sol Arka" season={season} align="left" />
        </div>

        {/* Araç gövdesi (üstten) */}
        <div className="relative h-[220px] w-[130px]" aria-hidden>
          <div className="absolute inset-x-[14px] inset-y-0 rounded-[38px] border-2 border-border bg-card shadow-sm">
            {/* Farlar */}
            <div className="absolute left-3 top-1.5 h-1.5 w-6 rounded-full bg-amber-300/70" />
            <div className="absolute right-3 top-1.5 h-1.5 w-6 rounded-full bg-amber-300/70" />
            {/* Ön cam */}
            <div className="absolute inset-x-2.5 top-[46px] h-[34px] bg-foreground/15 [clip-path:polygon(14%_0,86%_0,100%_100%,0_100%)] rounded-t-md" />
            {/* Tavan */}
            <div className="absolute inset-x-3.5 top-[84px] bottom-[64px] rounded-lg bg-foreground/[0.06]" />
            {/* Arka cam */}
            <div className="absolute inset-x-2.5 bottom-[34px] h-[26px] bg-foreground/15 [clip-path:polygon(0_0,100%_0,86%_100%,14%_100%)] rounded-b-md" />
            {/* Stoplar */}
            <div className="absolute bottom-1.5 left-3 h-1.5 w-5 rounded-full bg-red-400/60" />
            <div className="absolute bottom-1.5 right-3 h-1.5 w-5 rounded-full bg-red-400/60" />
          </div>
          <Tire season={season} className="left-0 top-[26px]" />
          <Tire season={season} className="right-0 top-[26px]" />
          <Tire season={season} className="left-0 bottom-[26px]" />
          <Tire season={season} className="right-0 bottom-[26px]" />
        </div>

        {/* Sağ etiketler */}
        <div className="flex h-[220px] flex-col justify-between py-[30px]">
          <PositionLabel label="Sağ Ön" season={season} align="right" />
          <PositionLabel label="Sağ Arka" season={season} align="right" />
        </div>
      </div>

      {size && (
        <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">{size}</p>
      )}
    </div>
  );
}
