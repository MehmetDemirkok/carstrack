"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Fuel, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, Pencil, Trash2,
  AlertTriangle, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { getFuelRecords, deleteFuelRecord, type FuelRecordFilters } from "@/lib/db";
import {
  FUEL_TYPES, FUEL_TYPE_LABELS, formatTRY, formatTRY2, formatLiters, formatConsumption,
  formatCostPerKm, getFuelRecordFlags,
} from "@/lib/fuel";
import type { Vehicle, FuelRecord, FuelVehicleStats, FuelStationStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

const PAGE_SIZE = 25;

type SortKey = NonNullable<FuelRecordFilters["sortBy"]>;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

interface SortHeadProps {
  label: string;
  sortKey: SortKey;
  activeSortBy: SortKey;
  onToggle: (key: SortKey) => void;
  className?: string;
}

/** Modül kapsamında tanımlı — render içinde yeniden oluşturulan bir bileşen türü olmasın diye. */
function SortHead({ label, sortKey, activeSortBy, onToggle, className }: SortHeadProps) {
  return (
    <TableHead className={className}>
      <button
        type="button" onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${activeSortBy === sortKey ? "text-foreground font-bold" : ""}`}
      >
        {label} <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );
}

export interface FuelRecordsTableProps {
  vehicles: Vehicle[];
  vehicleStats: FuelVehicleStats[];
  stationStats: FuelStationStats[];
  onEdit: (record: FuelRecord) => void;
  onAdd: () => void;
  /** Her değişiklikte (silme sonrası) tetiklenir — üst sayfa KPI/istatistiklerini tazeler. */
  onChanged?: () => void;
  /** Aktif filtreler her değiştiğinde bildirir (sayfalama hariç) — üst sayfa Excel/PDF export'unda aynı filtreyi kullanır. */
  onFiltersChange?: (filters: FuelRecordFilters) => void;
}

export function FuelRecordsTable({
  vehicles, vehicleStats, stationStats, onEdit, onAdd, onChanged, onFiltersChange,
}: FuelRecordsTableProps) {
  const [rows, setRows] = useState<FuelRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("fueled_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fVehicle, setFVehicle] = useState("");
  const [fFuelType, setFFuelType] = useState("");
  const [fStation, setFStation] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  const [toDelete, setToDelete] = useState<FuelRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const statsByVehicle = useMemo(() => new Map(vehicleStats.map((s) => [s.vehicleId, s])), [vehicleStats]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: r, total: t } = await getFuelRecords({
        vehicleId: fVehicle || undefined,
        fuelType: (fFuelType || undefined) as FuelRecordFilters["fuelType"],
        stationName: fStation || undefined,
        dateFrom: fDateFrom || undefined,
        dateTo: fDateTo || undefined,
        search: debouncedSearch || undefined,
        page, pageSize: PAGE_SIZE, sortBy, sortDir,
      });
      setRows(r);
      setTotal(t);
    } catch {
      toast.error("Yakıt kayıtları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [fVehicle, fFuelType, fStation, fDateFrom, fDateTo, debouncedSearch, page, sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [fVehicle, fFuelType, fStation, fDateFrom, fDateTo, debouncedSearch, sortBy, sortDir]);
  useEffect(() => {
    onFiltersChange?.({
      vehicleId: fVehicle || undefined,
      fuelType: (fFuelType || undefined) as FuelRecordFilters["fuelType"],
      stationName: fStation || undefined,
      dateFrom: fDateFrom || undefined,
      dateTo: fDateTo || undefined,
      search: debouncedSearch || undefined,
      sortBy, sortDir,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fVehicle, fFuelType, fStation, fDateFrom, fDateTo, debouncedSearch, sortBy, sortDir]);

  const hasFilters = !!fVehicle || fFuelType || fStation || fDateFrom || fDateTo || search;
  function clearFilters() {
    setFVehicle(""); setFFuelType(""); setFStation(""); setFDateFrom(""); setFDateTo(""); setSearch("");
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteFuelRecord(toDelete.id);
      toast.success("Yakıt kaydı silindi");
      setToDelete(null);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selCls = "h-10 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-full";

  return (
    <div className="space-y-4">
      {/* Ekle CTA */}
      <button onClick={onAdd} className="w-full text-left">
        <div className="rounded-3xl bg-mesh glow shimmer overflow-hidden relative p-5 shadow-xl shadow-primary/25 flex items-center gap-4">
          <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 relative">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0 relative">
            <p className="font-bold text-white">Yakıt Alımı Ekle</p>
            <p className="text-xs text-white/70">Yeni bir yakıt alım kaydı oluşturun</p>
          </div>
        </div>
      </button>

      {/* Filtreler */}
      <div className="glass rounded-3xl p-4 border border-border/40 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Plaka, istasyon veya fiş no ara..."
              className="w-full h-10 rounded-xl border border-border bg-background/60 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground shrink-0 px-2">
              <X className="h-3 w-3" /> Temizle
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={fVehicle} onChange={(e) => setFVehicle(e.target.value)} className={selCls}>
            <option value="">Tüm Araçlar</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
          <select value={fFuelType} onChange={(e) => setFFuelType(e.target.value)} className={selCls}>
            <option value="">Tüm Yakıt Türleri</option>
            {FUEL_TYPES.map((t) => <option key={t} value={t}>{FUEL_TYPE_LABELS[t]}</option>)}
          </select>
          <select value={fStation} onChange={(e) => setFStation(e.target.value)} className={selCls}>
            <option value="">Tüm İstasyonlar</option>
            {stationStats.map((s) => <option key={s.stationName} value={s.stationName}>{s.stationName}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} className={selCls} title="Başlangıç" />
            <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} className={selCls} title="Bitiş" />
          </div>
        </div>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground glass rounded-3xl border border-border/40">
          <Fuel className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{hasFilters ? "Filtreye uyan yakıt kaydı bulunamadı" : "Henüz yakıt kaydı yok"}</p>
          {hasFilters ? (
            <p className="text-sm mt-1">Filtreleri temizleyerek tekrar deneyin</p>
          ) : (
            <Button onClick={onAdd} className="mt-4 rounded-xl bg-mesh text-white border-none">
              <Plus className="h-4 w-4 mr-1.5" /> İlk Yakıt Kaydını Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="glass rounded-3xl border border-border/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <SortHead label="Tarih" sortKey="fueled_at" activeSortBy={sortBy} onToggle={toggleSort} />
                <TableHead>Araç</TableHead>
                <TableHead className="hidden md:table-cell">İstasyon</TableHead>
                <TableHead className="hidden sm:table-cell">Tür</TableHead>
                <SortHead label="Litre" sortKey="liters" activeSortBy={sortBy} onToggle={toggleSort} className="text-right" />
                <TableHead className="hidden lg:table-cell text-right">Litre Fiyatı</TableHead>
                <SortHead label="Toplam" sortKey="total_amount" activeSortBy={sortBy} onToggle={toggleSort} className="text-right" />
                <TableHead className="hidden lg:table-cell text-right">KM</TableHead>
                <SortHead label="L/100 KM" sortKey="consumption_l_100km" activeSortBy={sortBy} onToggle={toggleSort} className="text-right hidden md:table-cell" />
                <SortHead label="₺/KM" sortKey="cost_per_km" activeSortBy={sortBy} onToggle={toggleSort} className="text-right hidden md:table-cell" />
                <TableHead className="w-[84px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const flags = getFuelRecordFlags(r, statsByVehicle.get(r.vehicleId));
                const hasCritical = flags.some((f) => f.severity === "critical");
                return (
                  <TableRow key={r.id} className="border-border/30">
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        {formatDateTime(r.fueledAt)}
                        {flags.length > 0 && (
                          <span title={flags.map((f) => f.label).join(" · ")}>
                            <AlertTriangle className={`h-3 w-3 shrink-0 ${hasCritical ? "text-red-500" : "text-amber-500"}`} />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-semibold">{r.vehiclePlate ?? "—"}</p>
                      <p className="text-muted-foreground">{r.vehicleName}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{r.stationName || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">{FUEL_TYPE_LABELS[r.fuelType]}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatLiters(r.liters)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-xs tabular-nums">{formatTRY2(r.pricePerLiter)}</TableCell>
                    <TableCell className="text-right text-xs font-bold tabular-nums">{formatTRY(r.totalAmount)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-xs tabular-nums">{r.odometer.toLocaleString("tr-TR")} KM</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-xs tabular-nums">{formatConsumption(r.consumptionL100km)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right text-xs tabular-nums">{formatCostPerKm(r.costPerKm)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onEdit(r)} title="Düzenle" className="h-7 w-7 rounded-lg hover:bg-muted/60 text-muted-foreground flex items-center justify-center transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setToDelete(r)} title="Sil" className="h-7 w-7 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground">
              {total.toLocaleString("tr-TR")} kayıt · Sayfa {page}/{totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-8 w-8 rounded-lg border border-border/50 flex items-center justify-center disabled:opacity-30 hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="h-8 w-8 rounded-lg border border-border/50 flex items-center justify-center disabled:opacity-30 hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setToDelete(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-3xl border border-red-500/30 shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl"><Trash2 className="h-8 w-8 text-red-500" /></div>
              <div>
                <h2 className="font-bold text-base text-red-600 dark:text-red-400">Yakıt Kaydını Sil</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <span className="font-semibold text-foreground">{toDelete.vehiclePlate}</span> aracına ait yakıt kaydı <span className="font-semibold text-red-500">kalıcı olarak</span> silinecek.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setToDelete(null)} disabled={deleting}>İptal</Button>
              <Button
                onClick={confirmDelete} disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-none font-semibold"
              >
                {deleting ? "Siliniyor..." : "Evet, Sil"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
