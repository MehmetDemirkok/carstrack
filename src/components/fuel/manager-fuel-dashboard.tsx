"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Fuel, Plus, AlertTriangle, ChevronRight, Receipt, BarChart3, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVehicles, getFuelMetricsSince, getFuelVehicleLatest, getFuelVehicleStats,
  getFuelAnomalyThreshold, getFuelRecords, getFuelStationStats,
} from "@/lib/db";
import {
  monthlyFuelSeries, splitCurrentPreviousMonth, computeFuelKpiSet,
  getFuelConsumptionAlerts, FUEL_TYPE_LABELS, formatTRY, formatLiters, formatConsumption,
} from "@/lib/fuel";
import type { Vehicle, FuelRecord, FleetAlert } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FuelKpiCards } from "@/components/fuel/fuel-kpi-cards";
import { FuelTrendChart } from "@/components/fuel/fuel-trend-chart";
import { FuelFormDialog } from "@/components/fuel/fuel-form-dialog";

/** Yönetici/operatör "/yakit" görünümü — filo genelinde KPI, trend ve anomali uyarıları. */
export function ManagerFuelDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<Awaited<ReturnType<typeof getFuelMetricsSince>>>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [recent, setRecent] = useState<FuelRecord[]>([]);
  const [stationSuggestions, setStationSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FuelRecord | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, metrics6, latest, stats, threshold, recentList, stations] = await Promise.all([
        getVehicles(),
        getFuelMetricsSince(6),
        getFuelVehicleLatest(),
        getFuelVehicleStats(),
        getFuelAnomalyThreshold(),
        getFuelRecords({ page: 1, pageSize: 6, sortBy: "fueled_at", sortDir: "desc" }),
        getFuelStationStats(),
      ]);
      setVehicles(v);
      setMonthlyRows(metrics6);
      setAlerts(getFuelConsumptionAlerts(latest, stats, threshold));
      setRecent(recentList.rows);
      setStationSuggestions(stations.map((s) => s.stationName));
    } catch (err) {
      console.error(err);
      toast.error("Yakıt verileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const monthly = useMemo(() => monthlyFuelSeries(monthlyRows, 6), [monthlyRows]);
  const kpi = useMemo(() => {
    const { current, previous } = splitCurrentPreviousMonth(monthlyRows);
    return { current: computeFuelKpiSet(current), previous: computeFuelKpiSet(previous) };
  }, [monthlyRows]);

  const hasAnyData = monthlyRows.length > 0 || recent.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Link href="/yakit/alimlar">
          <Button variant="outline" className="rounded-xl gap-1.5 h-10 text-xs sm:text-sm">
            <Receipt className="h-4 w-4" /> Yakıt Alımları
          </Button>
        </Link>
        <Link href="/yakit/analiz">
          <Button variant="outline" className="rounded-xl gap-1.5 h-10 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" /> Analiz
          </Button>
        </Link>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="rounded-xl gap-1.5 h-10 bg-mesh text-white border-none text-xs sm:text-sm">
          <Plus className="h-4 w-4" /> Yakıt Alımı Ekle
        </Button>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}
          </div>
          <div className="h-72 rounded-2xl bg-muted/40 animate-pulse" />
        </div>
      ) : !hasAnyData ? (
        <div className="text-center py-20 text-muted-foreground glass rounded-3xl border border-border/40">
          <Fuel className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-base text-foreground">Henüz yakıt kaydı yok</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">İlk yakıt alımını ekleyerek maliyet ve tüketim takibine başlayın.</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="mt-5 rounded-xl bg-mesh text-white border-none">
            <Plus className="h-4 w-4 mr-1.5" /> İlk Yakıt Kaydını Ekle
          </Button>
        </div>
      ) : (
        <>
          <FuelKpiCards current={kpi.current} previous={kpi.previous} />

          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((a) => (
                <Link href={`/vehicles/${a.vehicleId}`} key={a.id}>
                  <div className={`relative p-4 pl-5 rounded-2xl border flex gap-3 items-start transition-all cursor-pointer overflow-hidden hover-lift ${
                    a.severity === "critical" ? "bg-red-500/5 border-red-500/20 dark:bg-red-500/10" : "bg-orange-500/5 border-orange-500/20 dark:bg-orange-500/10"
                  }`}>
                    <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${a.severity === "critical" ? "bg-red-500" : "bg-orange-500"}`} />
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${a.severity === "critical" ? "bg-red-500/15 text-red-500" : "bg-orange-500/15 text-orange-500"}`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-xs">⚠️ {a.title}</h4>
                        <span className="text-[9px] font-bold text-muted-foreground shrink-0">{a.vehiclePlate}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{a.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <FuelTrendChart data={monthly} rangeLabel="Son 6 ay" />

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-outfit text-lg font-bold">Son Yakıt Alımları</h3>
              <Link href="/yakit/alimlar">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2 gap-1 hover:bg-primary/10">
                  Tümünü Gör <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Henüz yakıt kaydı yok.</p>
              </div>
            ) : (
              <div className="glass rounded-3xl border border-border/40 divide-y divide-border/30">
                {recent.map((r) => (
                  <div key={r.id} className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Fuel className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.vehiclePlate} <span className="text-muted-foreground font-normal">— {FUEL_TYPE_LABELS[r.fuelType]}</span></p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {new Date(r.fueledAt).toLocaleDateString("tr-TR")} · {r.stationName || "İstasyon belirtilmedi"} · {formatLiters(r.liters)}
                        {r.consumptionL100km !== undefined ? ` · ${formatConsumption(r.consumptionL100km)}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold shrink-0">{formatTRY(r.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <FuelFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        vehicles={vehicles}
        stationSuggestions={stationSuggestions}
        onSaved={loadAll}
      />
    </div>
  );
}
