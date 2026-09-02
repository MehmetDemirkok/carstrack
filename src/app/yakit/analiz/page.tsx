"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Fuel, Gauge, Wallet, Route as RouteIcon, Hash, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { isDriverRole } from "@/lib/types";
import { getFuelVehicleStats, getFuelStationStats, getFuelAnomalyThreshold, updateFuelAnomalyThreshold } from "@/lib/db";
import { formatTRY, formatTRY2, formatLiters, formatConsumption, formatCostPerKm } from "@/lib/fuel";
import type { FuelVehicleStats, FuelStationStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FuelRankedBars } from "@/components/fuel/fuel-ranked-bars";

export default function FuelAnalyticsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [vehicleStats, setVehicleStats] = useState<FuelVehicleStats[]>([]);
  const [stationStats, setStationStats] = useState<FuelStationStats[]>([]);
  const [threshold, setThreshold] = useState(15);
  const [thresholdInput, setThresholdInput] = useState("15");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [loading, setLoading] = useState(true);

  const isManager = profile?.role === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vs, ss, th] = await Promise.all([getFuelVehicleStats(), getFuelStationStats(), getFuelAnomalyThreshold()]);
      setVehicleStats(vs);
      setStationStats(ss);
      setThreshold(th);
      setThresholdInput(String(th));
    } catch (err) {
      console.error(err);
      toast.error("Analiz verileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && isDriverRole(profile.role)) { router.replace("/dashboard"); return; }
    if (!authLoading && profile) load();
  }, [authLoading, profile, router, load]);

  async function saveThreshold() {
    const pct = parseFloat(thresholdInput);
    if (Number.isNaN(pct) || pct < 1 || pct > 100) {
      toast.error("Eşik %1 ile %100 arasında olmalı");
      return;
    }
    setSavingThreshold(true);
    try {
      await updateFuelAnomalyThreshold(pct);
      setThreshold(pct);
      toast.success("Anomali eşiği güncellendi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Kaydedilemedi");
    } finally {
      setSavingThreshold(false);
    }
  }

  if (profile && isDriverRole(profile.role)) return null;

  const costItems = vehicleStats.map((s) => ({
    key: s.vehicleId,
    label: s.vehiclePlate,
    sublabel: `${s.vehicleBrand} ${s.vehicleModel}`.trim(),
    value: s.totalCost,
    displayValue: formatTRY(s.totalCost),
  }));

  const consumptionItems = vehicleStats
    .filter((s) => s.avgConsumption !== undefined)
    .map((s) => ({
      key: s.vehicleId,
      label: s.vehiclePlate,
      sublabel: `${s.vehicleBrand} ${s.vehicleModel}`.trim(),
      value: s.avgConsumption!,
      displayValue: formatConsumption(s.avgConsumption),
      color: "var(--warning, #f59e0b)",
    }));

  const stationItems = stationStats.map((s) => ({
    key: s.stationName,
    label: s.stationName,
    sublabel: `${s.purchaseCount} işlem`,
    value: s.totalCost,
    displayValue: formatTRY(s.totalCost),
    color: "#06b6d4",
  }));

  const hasData = vehicleStats.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Yakıt Analizi</h1>
            <p className="text-sm text-muted-foreground">Araç ve istasyon bazında yakıt performansı</p>
          </div>
        </div>

        {isManager && (
          <div className="glass rounded-2xl border border-border/40 px-3 py-2 flex items-center gap-2 shrink-0">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Anomali Eşiği</span>
            <input
              type="number" min="1" max="100" value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="w-14 h-8 rounded-lg border border-border bg-background/60 px-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Button
              size="sm" onClick={saveThreshold} disabled={savingThreshold || parseFloat(thresholdInput) === threshold}
              className="h-8 rounded-lg text-xs px-3 bg-mesh text-white border-none"
            >
              {savingThreshold ? "..." : "Kaydet"}
            </Button>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[0, 1].map((i) => <div key={i} className="h-72 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : !hasData ? (
        <div className="text-center py-20 text-muted-foreground glass rounded-3xl border border-border/40">
          <Fuel className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-base text-foreground">Henüz yakıt verisi yok</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">Yakıt alımları eklendikçe araç ve istasyon analizi burada görünür.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <FuelRankedBars
              eyebrow="Maliyet"
              title="Araç Bazlı Yakıt Maliyeti"
              description="En yüksek toplam yakıt harcamasına sahip araçlar"
              items={costItems}
              emptyText="Henüz yakıt harcaması yok."
            />
            <FuelRankedBars
              eyebrow="Tüketim"
              title="L/100 KM Karşılaştırması"
              description="Ortalama tüketimi en yüksek araçlar"
              items={consumptionItems}
              emptyText="Tüketim hesaplanabilecek yeterli kayıt yok."
            />
          </div>

          {/* Araç bazlı detay kartları */}
          <div className="space-y-3">
            <h3 className="font-outfit text-lg font-bold px-1">Araç Bazlı Yakıt Özeti</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicleStats.map((s) => (
                <div key={s.vehicleId} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
                  <div>
                    <p className="font-bold text-sm">{s.vehiclePlate}</p>
                    <p className="text-[11px] text-muted-foreground">{s.vehicleBrand} {s.vehicleModel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <Stat icon={Fuel} label="Toplam Yakıt" value={formatLiters(s.totalLiters)} />
                    <Stat icon={Wallet} label="Toplam Maliyet" value={formatTRY(s.totalCost)} />
                    <Stat icon={Gauge} label="Ort. Tüketim" value={formatConsumption(s.avgConsumption)} />
                    <Stat icon={RouteIcon} label="KM Maliyeti" value={formatCostPerKm(s.avgCostPerKm)} />
                    <Stat icon={Hash} label="Toplam KM" value={s.totalDistanceKm.toLocaleString("tr-TR")} />
                    <Stat icon={Fuel} label="Yakıt Alımı" value={String(s.purchaseCount)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* İstasyon analizi */}
          {stationStats.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-outfit text-lg font-bold px-1">İstasyon Analizi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stationStats.map((s) => (
                  <div key={s.stationName} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
                    <p className="font-bold text-sm">{s.stationName}</p>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <Stat icon={Hash} label="İşlem" value={String(s.purchaseCount)} />
                      <Stat icon={Fuel} label="Toplam Litre" value={formatLiters(s.totalLiters)} />
                      <Stat icon={Gauge} label="Ort. Fiyat" value={formatTRY2(s.avgPricePerLiter)} />
                      <Stat icon={Wallet} label="Toplam Harcama" value={formatTRY(s.totalCost)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-bold tabular-nums leading-tight truncate">{value}</p>
        <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}
