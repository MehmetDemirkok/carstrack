"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { deleteVehicles, updateVehicle } from "@/lib/db";
import { useData } from "@/context/data-context";
import { calculateHealthScore } from "@/lib/store";
import { useDemoGuard } from "@/hooks/use-demo-guard";
import type { Vehicle } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import Link from "next/link";
import {
  Car, ChevronRight, Plus, Gauge, Trash2,
  CheckCircle2, Circle, Fuel, Shield, Wrench, Calendar, Download, Move,
} from "lucide-react";
import { exportVehiclesExcel } from "@/lib/export";
import { DragSlider } from "@/components/ui/drag-slider";
import { useAuth } from "@/context/auth-context";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const tireColor = {
  "Yazlık": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Kışlık": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "Dört Mevsim": "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

export default function VehiclesPage() {
  const guardDemo = useDemoGuard();
  const { profile } = useAuth();
  const { vehicles, loading, refresh, setVehicles } = useData();
  const isDriver = profile?.role === "user";
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const errorMsg: string | null = null;
  const [repositioningId, setRepositioningId] = useState<string | null>(null);
  const [pendingPosY, setPendingPosY] = useState(50);
  const [pendingPosX, setPendingPosX] = useState(50);
  const [positionSaving, setPositionSaving] = useState(false);

  const startReposition = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.preventDefault();
    e.stopPropagation();
    setRepositioningId(vehicle.id);
    setPendingPosY(vehicle.imagePosition ?? 50);
    setPendingPosX(vehicle.imagePositionX ?? 50);
  };

  const savePosition = async (vehicleId: string) => {
    setPositionSaving(true);
    try {
      await updateVehicle(vehicleId, { imagePosition: pendingPosY, imagePositionX: pendingPosX });
      setVehicles((prev) => prev.map((v) =>
        v.id === vehicleId ? { ...v, imagePosition: pendingPosY, imagePositionX: pendingPosX } : v
      ));
      setRepositioningId(null);
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setPositionSaving(false);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleDelete = async () => {
    if (guardDemo()) { setIsDeleteDialogOpen(false); return; }
    const ids = selectedIds;
    setVehicles((prev) => prev.filter((v) => !ids.includes(v.id)));
    setSelectedIds([]);
    setIsSelectionMode(false);
    setIsDeleteDialogOpen(false);
    try {
      await deleteVehicles(ids);
      toast.success("Silindi", { description: `${ids.length} araç başarıyla silindi.` });
      refresh();
    } catch (err) {
      toast.error("Hata", { description: "Araçlar silinirken hata oluştu." });
      refresh();
    }
  };

  if (loading) return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-9 w-28 rounded-xl bg-muted/40 animate-pulse" />
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  );

  if (errorMsg) return (
    <div className="p-4 pt-10 text-center flex flex-col items-center gap-3">
      <div className="p-3 bg-destructive/10 rounded-xl">
        <Car className="h-10 w-10 text-destructive" />
      </div>
      <p className="text-foreground font-bold">Veriler Yüklenirken Hata Oluştu</p>
      <p className="text-sm text-destructive max-w-md">{errorMsg}</p>
      <Button onClick={refresh} variant="outline" className="mt-2">Tekrar Dene</Button>
    </div>
  );

  return (
    <div className="p-4 space-y-5 pb-28 relative">
      <div className="absolute inset-0 -z-10 bg-mesh-soft pointer-events-none" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-outfit font-black tracking-tight"><span className="text-gradient">Araçlarım</span></h1>
          <p className="text-xs text-muted-foreground mt-0.5">{vehicles.length} kayıtlı araç</p>
        </div>
        <div className="flex items-center gap-2">
          {vehicles.length > 0 && !isSelectionMode && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 shadow-sm border-border/50"
              title="Excel'e Aktar"
              onClick={() => exportVehiclesExcel(vehicles)}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {!isDriver && vehicles.length > 0 && (
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              size="sm"
              className="rounded-full h-9 px-4 font-semibold"
              onClick={isSelectionMode ? cancelSelection : () => setIsSelectionMode(true)}
            >
              {isSelectionMode ? "İptal" : "Seç"}
            </Button>
          )}
          {!isDriver && !isSelectionMode && (
            <Link href="/vehicles/new">
              <Button size="sm" className="rounded-full h-9 px-4 gap-1.5 shadow-md font-semibold">
                <Plus className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Yeni Araç</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => {
          const score = calculateHealthScore(vehicle);
          const selected = selectedIds.includes(vehicle.id);
          return (
            <div key={vehicle.id} className="relative">
              <Link
                href={repositioningId === vehicle.id || isSelectionMode ? "#" : `/vehicles/${vehicle.id}`}
                className="block tap-highlight-transparent"
                style={{ pointerEvents: repositioningId === vehicle.id ? "none" : "auto" }}
                onClick={(e) => {
                  if (repositioningId === vehicle.id) { e.preventDefault(); return; }
                  if (isSelectionMode) toggleSelection(vehicle.id, e);
                }}
              >
                <motion.div
                  variants={cardAnim}
                  whileTap={isSelectionMode || repositioningId === vehicle.id ? {} : { scale: 0.97 }}
                  whileHover={isSelectionMode || repositioningId === vehicle.id ? {} : { y: -4 }}
                >
                  <Card className={`overflow-hidden rounded-3xl shadow-md transition-all relative group ${selected ? "border-primary ring-2 ring-primary/20 shadow-primary/20" : "border-border/40 hover:shadow-2xl hover:shadow-primary/15"}`}>
                    {isSelectionMode && (
                      <div className={`absolute inset-0 z-20 pointer-events-none transition-colors rounded-3xl ${selected ? "bg-primary/5" : "bg-black/40"}`} />
                    )}
                    {isSelectionMode && (
                      <div className="absolute top-3 right-3 z-30">
                        {selected ? <CheckCircle2 className="h-7 w-7 text-primary fill-primary/20 drop-shadow-md" /> : <Circle className="h-7 w-7 text-white/80 drop-shadow-md" />}
                      </div>
                    )}

                    {/* Hero */}
                    <div className="h-52 relative overflow-hidden">
                      {vehicle.image ? (
                        <div
                          className="absolute inset-0 transition-[background-position] duration-100 group-hover:scale-105 transition-transform duration-700"
                          style={{
                            backgroundImage: `url(${vehicle.image})`,
                            backgroundSize: "cover",
                            backgroundPosition: repositioningId === vehicle.id
                              ? `${pendingPosX}% ${pendingPosY}%`
                              : `${vehicle.imagePositionX ?? 50}% ${vehicle.imagePosition ?? 50}%`,
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent flex items-center justify-center">
                          <Car className="h-24 w-24 text-primary/20" />
                        </div>
                      )}

                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
                      {vehicle.image && <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />}

                      {/* Reposition overlay */}
                      {repositioningId === vehicle.id && (
                        <div
                          className="absolute inset-0 z-30 bg-black/55 flex flex-col items-center justify-center gap-4 px-5"
                          style={{ pointerEvents: "auto" }}
                        >
                          <p className="text-white/80 text-[11px] font-semibold tracking-wide uppercase select-none">
                            Görseli konumlandır
                          </p>
                          <DragSlider
                            value={pendingPosY}
                            onChange={setPendingPosY}
                            label="Üst"
                            labelEnd="Alt"
                            className="w-full"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRepositioningId(null)}
                              className="text-xs text-white/70 border border-white/20 rounded-xl px-4 py-2 hover:bg-white/10 transition-colors"
                            >
                              İptal
                            </button>
                            <button
                              onClick={() => savePosition(vehicle.id)}
                              disabled={positionSaving}
                              className="text-xs font-semibold text-white bg-primary rounded-xl px-5 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {positionSaving ? "Kaydediliyor…" : "Kaydet"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Plate badge */}
                      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 shadow-lg">
                        <Car className="h-3 w-3 text-white/70" />
                        <span className="font-outfit font-black text-xs text-white tracking-wide">{vehicle.plate}</span>
                      </div>

                      {/* Health score + reposition button */}
                      {!isSelectionMode && repositioningId !== vehicle.id && (
                        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                          <div className="relative w-11 h-11">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                              <circle cx="22" cy="22" r="18" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                              <circle
                                cx="22" cy="22" r="18" fill="none"
                                stroke={score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="3"
                                strokeDasharray={`${score * 1.131} ${113.1 - score * 1.131}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-black">{score}</span>
                          </div>
                          {vehicle.image && !isDriver && (
                            <button
                              onClick={(e) => startReposition(e, vehicle)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm border border-white/15 rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-black/70"
                              title="Görseli konumlandır"
                            >
                              <Move className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-10">
                        <div className="flex items-end justify-between">
                          <div>
                            <h2 className="text-2xl font-black font-outfit text-white leading-tight drop-shadow-sm">
                              {vehicle.brand}
                            </h2>
                            <p className="text-sm text-white/60 font-medium mt-0.5">{vehicle.model} · {vehicle.year}</p>
                          </div>
                          {!isSelectionMode && repositioningId !== vehicle.id && (
                            <div className="bg-white/10 backdrop-blur-md border border-white/15 text-white p-2 rounded-full shadow-lg group-hover:bg-primary group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info bar */}
                    <div className="px-4 py-3 bg-card/95 flex items-center justify-between">
                      <div className="flex items-center gap-3.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Gauge className="h-3.5 w-3.5" />
                          <span className="font-medium">{vehicle.mileage.toLocaleString("tr-TR")} km</span>
                        </div>
                        <div className="w-px h-3 bg-border/60" />
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Fuel className="h-3.5 w-3.5" />
                          <span className="font-medium">{vehicle.fuelType}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border-none ${tireColor[vehicle.tireStatus]}`}>
                        {vehicle.tireStatus}
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              </Link>
            </div>

          );
        })}

        {vehicles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="col-span-full py-12 flex flex-col items-center gap-5 text-center"
          >
            <div className="p-6 bg-mesh rounded-3xl shadow-xl shadow-primary/25">
              <Car className="h-14 w-14 text-primary-foreground/80" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-outfit font-black tracking-tight">
                <span className="text-gradient">Filonuzu Oluşturun</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                İlk aracınızı ekleyerek bakım, sigorta ve muayene takibine başlayın.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { Icon: Shield, label: "Sigorta takibi" },
                { Icon: Wrench, label: "Bakım hatırlatmaları" },
                { Icon: Calendar, label: "Muayene uyarıları" },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-[11px] font-medium text-muted-foreground">
                  <Icon className="h-3 w-3" /> {label}
                </div>
              ))}
            </div>
            <Link href="/vehicles/new">
              <Button className="rounded-full px-8 gap-2 shadow-lg bg-mesh text-primary-foreground border-none h-11">
                <Plus className="h-4 w-4" /> Araç Ekle
              </Button>
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* Float action bar */}
      <AnimatePresence>
        {isSelectionMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 md:bottom-8 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none"
          >
            <div className="glass rounded-full border border-destructive/30 shadow-xl p-2 px-4 flex items-center gap-4 pointer-events-auto">
              <span className="font-semibold text-sm">{selectedIds.length} araç seçildi</span>
              <Button variant="destructive" className="rounded-full shadow-md gap-2" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" /> Sil
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Araçları Sil
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Seçili <b>{selectedIds.length}</b> aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <DialogClose render={<Button variant="outline" className="w-full sm:w-auto rounded-xl" />}>İptal</DialogClose>
            <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto rounded-xl">Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
