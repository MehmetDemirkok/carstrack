"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Car, Check, CheckCircle2, Gauge, Search } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/context/data-context";
import { useAuth } from "@/context/auth-context";
import { submitMileage } from "@/lib/db";
import { describeMileageAge, mileageCheckedAt, mileageReminderDays } from "@/lib/mileage";
import { isDriverRole, type Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "84.200" / "84,200" / "84200" → 84200 */
function parseKm(value: string): number {
  return parseInt(value.replace(/[.,\s]/g, ""), 10);
}

function formatKmInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  return digits ? Number(digits).toLocaleString("tr-TR") : "";
}

/**
 * Km güncelleme sayfası — "km'niz eski" hatırlatmasının (mileage-reminder
 * cron'u) açtığı yer. Sürücü kendisine atanmış araçları, yönetici/operatör
 * tüm araçları görür; km'si eski olanlar en üstte.
 *
 * Her araçta iki işlem: güncel km'yi kaydet ya da "km değişmedi" de (park
 * halindeki araç). İkisi de hatırlatmayı susturur.
 */
export default function KmGuncellePage() {
  const { vehicles, vehiclesLoading, setVehicles } = useData();
  const { profile } = useAuth();
  const isDriver = isDriverRole(profile?.role);
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);

  // Bildirimden gelinmişse (?arac=<id>) o araca odaklan.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("arac");
    if (id) setFocusId(id);
  }, []);

  const rows = useMemo(() => {
    const now = new Date();
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return vehicles
      .map((v) => ({ vehicle: v, dueDays: mileageReminderDays(v, now) }))
      .filter(({ vehicle: v }) =>
        !q || `${v.plate} ${v.brand} ${v.model}`.toLocaleLowerCase("tr-TR").replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      )
      .sort((a, b) => {
        if (a.vehicle.id === focusId) return -1;
        if (b.vehicle.id === focusId) return 1;
        return (b.dueDays ?? -1) - (a.dueDays ?? -1) || a.vehicle.plate.localeCompare(b.vehicle.plate, "tr");
      });
  }, [vehicles, query, focusId]);

  const dueCount = rows.filter((r) => r.dueDays !== null).length;

  function applyResult(vehicleId: string, km: number, changed: boolean) {
    const now = new Date().toISOString();
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? { ...v, mileage: km, mileageConfirmedAt: now, mileageUpdatedAt: changed ? now : v.mileageUpdatedAt }
          : v,
      ),
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30 shrink-0">
          <Gauge className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Km Güncelle</h1>
          <p className="text-sm text-muted-foreground">
            {vehiclesLoading
              ? "Araçlar yükleniyor…"
              : dueCount > 0
              ? `${dueCount} aracın km'si güncellenmeli`
              : "Tüm araçların km'si güncel"}
          </p>
        </div>
      </motion.div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Bakım ve muayene uyarılarının zamanında gelmesi için km&apos;nin güncel olması gerekir.
        Araç kullanılmadıysa &ldquo;Değişmedi&rdquo;ye dokunmanız yeterli.
      </p>

      {vehicles.length > 6 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Plaka veya model ara..."
            aria-label="Araç ara"
            className="w-full h-11 rounded-2xl border border-border bg-background/60 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {vehiclesLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-3xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{isDriver ? "Size atanmış araç yok" : "Henüz araç eklenmemiş"}</p>
          {!isDriver && (
            <Link href="/vehicles/new" className="inline-block mt-3 text-sm font-semibold text-primary hover:underline">
              Araç ekle
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ vehicle, dueDays }) => (
            <MileageCard
              key={vehicle.id}
              vehicle={vehicle}
              dueDays={dueDays}
              autoFocus={vehicle.id === focusId}
              onSaved={(km, changed) => applyResult(vehicle.id, km, changed)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MileageCard({
  vehicle,
  dueDays,
  autoFocus,
  onSaved,
}: {
  vehicle: Vehicle;
  dueDays: number | null;
  autoFocus: boolean;
  onSaved: (km: number, changed: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<"save" | "same" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const age = describeMileageAge(mileageCheckedAt(vehicle));
  const due = dueDays !== null && !done;

  async function send(km: number, kind: "save" | "same", confirmed = false) {
    setBusy(kind);
    const result = await submitMileage(vehicle.id, km, { confirmed });
    setBusy(null);
    if (!result.ok) {
      if (result.needsConfirm) { setWarning(result.error); return; }
      toast.error("Kaydedilemedi", { description: result.error });
      return;
    }
    setWarning(null);
    setValue("");
    setDone(true);
    onSaved(result.km, result.changed);
    toast.success(result.changed ? `${vehicle.plate} km güncellendi` : `${vehicle.plate} km'si doğrulandı`);
  }

  function save(confirmed = false) {
    const km = parseKm(value);
    if (!Number.isFinite(km)) { inputRef.current?.focus(); return; }
    void send(km, "save", confirmed);
  }

  return (
    <li
      ref={cardRef}
      className={cn(
        "glass rounded-3xl p-4 border space-y-3 scroll-mt-24",
        due ? "border-amber-500/40" : "border-border/40",
        autoFocus && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold tracking-wide">{vehicle.plate}</p>
          <p className="text-xs text-muted-foreground truncate">{vehicle.brand} {vehicle.model}</p>
        </div>
        {due ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5 shrink-0">
            <AlertTriangle className="h-3 w-3" /> Güncellenmeli
          </span>
        ) : done ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-500/10 rounded-full px-2 py-0.5 shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Güncel
          </span>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Kayıtlı: <span className="font-semibold text-foreground">{vehicle.mileage ? `${vehicle.mileage.toLocaleString("tr-TR")} km` : "girilmemiş"}</span>
        {" · "}
        {age ? `${age.label} doğrulandı` : "hiç doğrulanmadı"}
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <label htmlFor={`km-${vehicle.id}`} className="sr-only">{vehicle.plate} güncel km</label>
        <input
          ref={inputRef}
          id={`km-${vehicle.id}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          value={value}
          onChange={(e) => { setValue(formatKmInput(e.target.value)); setWarning(null); }}
          placeholder={vehicle.mileage ? vehicle.mileage.toLocaleString("tr-TR") : "Güncel km"}
          className="flex-1 min-w-0 h-11 rounded-2xl border border-border bg-background/60 px-4 text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button type="submit" disabled={!value || busy !== null} className="h-11 rounded-2xl px-4 bg-mesh text-white border-none hover:opacity-95">
          {busy === "save" ? "…" : "Kaydet"}
        </Button>
      </form>

      {warning && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">{warning}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 h-9 rounded-xl text-xs" onClick={() => { setWarning(null); inputRef.current?.focus(); }}>
              Düzelt
            </Button>
            <Button type="button" className="flex-1 h-9 rounded-xl text-xs" onClick={() => save(true)} disabled={busy !== null}>
              Yine de kaydet
            </Button>
          </div>
        </div>
      )}

      {vehicle.mileage > 0 && !value && (
        <button
          type="button"
          onClick={() => void send(vehicle.mileage, "same")}
          disabled={busy !== null}
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {busy === "same" ? "Kaydediliyor…" : `Değişmedi (${vehicle.mileage.toLocaleString("tr-TR")} km)`}
        </button>
      )}
    </li>
  );
}
