"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Receipt, Plus, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { isDriverRole } from "@/lib/types";
import { getVehicles, getFuelVehicleStats, getFuelStationStats, getFuelRecords, type FuelRecordFilters } from "@/lib/db";
import { exportFuelRecordsExcel } from "@/lib/export";
import { exportFuelRecordsPDF } from "@/lib/pdf-export";
import type { Vehicle, FuelRecord, FuelVehicleStats, FuelStationStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FuelRecordsTable } from "@/components/fuel/fuel-records-table";
import { FuelFormDialog } from "@/components/fuel/fuel-form-dialog";

export default function FuelPurchasesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleStats, setVehicleStats] = useState<FuelVehicleStats[]>([]);
  const [stationStats, setStationStats] = useState<FuelStationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FuelRecord | null>(null);
  const [activeFilters, setActiveFilters] = useState<FuelRecordFilters>({});
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [v, stats, stations] = await Promise.all([getVehicles(), getFuelVehicleStats(), getFuelStationStats()]);
      setVehicles(v);
      setVehicleStats(stats);
      setStationStats(stations);
    } catch (err) {
      console.error(err);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile && isDriverRole(profile.role)) { router.replace("/dashboard"); return; }
    if (!authLoading && profile) loadMeta();
  }, [authLoading, profile, router, loadMeta]);

  function openEdit(r: FuelRecord) { setEditing(r); setShowForm(true); }
  function openAdd() { setEditing(null); setShowForm(true); }
  async function handleSaved() { await loadMeta(); setReloadKey((k) => k + 1); }
  function handleChanged() { setReloadKey((k) => k + 1); }

  async function handleExport(kind: "excel" | "pdf") {
    setExporting(kind);
    try {
      const { rows } = await getFuelRecords({ ...activeFilters, page: 1, pageSize: 5000 });
      if (rows.length === 0) {
        toast.warning("Dışa aktarılacak kayıt bulunamadı");
        return;
      }
      if (kind === "excel") exportFuelRecordsExcel(rows);
      else await exportFuelRecordsPDF(rows);
      toast.success(`${rows.length} kayıt ${kind === "excel" ? "Excel" : "PDF"} olarak dışa aktarıldı`);
    } catch (err) {
      console.error(err);
      toast.error("Dışa aktarma başarısız oldu");
    } finally {
      setExporting(null);
    }
  }

  if (profile && isDriverRole(profile.role)) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-6 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Yakıt Alımları</h1>
            <p className="text-sm text-muted-foreground">Tüm yakıt alım kayıtlarını arayın, filtreleyin ve dışa aktarın</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger render={
              <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => handleExport("excel")} disabled={exporting !== null} />
            }>
              <FileSpreadsheet className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Excel&apos;e Aktar (filtrelenmiş)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={
              <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => handleExport("pdf")} disabled={exporting !== null} />
            }>
              <FileDown className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>PDF&apos;e Aktar (filtrelenmiş)</TooltipContent>
          </Tooltip>
          <Button onClick={openAdd} className="rounded-xl gap-1.5 h-10 bg-mesh text-white border-none text-xs sm:text-sm">
            <Plus className="h-4 w-4" /> Yakıt Alımı Ekle
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : (
        <FuelRecordsTable
          key={reloadKey}
          vehicles={vehicles}
          vehicleStats={vehicleStats}
          stationStats={stationStats}
          onEdit={openEdit}
          onAdd={openAdd}
          onChanged={handleChanged}
          onFiltersChange={setActiveFilters}
        />
      )}

      <FuelFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editing}
        vehicles={vehicles}
        stationSuggestions={stationStats.map((s) => s.stationName)}
        onSaved={handleSaved}
      />
    </div>
  );
}
