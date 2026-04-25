"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getVehicles, deleteVehicles } from "@/lib/db";
import { calculateHealthScore } from "@/lib/store";
import type { Vehicle } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import {
  Car, ChevronRight, Plus, Gauge, Trash2,
  CheckCircle2, Circle, Fuel,
} from "lucide-react";
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
  "Kışlık": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Dört Mevsim": "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

export default function VehiclesPage() {
  const { loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error("Failed to load vehicles:", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading]);

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
    await deleteVehicles(selectedIds);
    await loadData();
    setSelectedIds([]);
    setIsSelectionMode(false);
    setIsDeleteDialogOpen(false);
  };

  if (loading) return <div className="p-4 pt-10 text-center text-muted-foreground">Araçlar yükleniyor...</div>;

  return (
    <div className="p-4 space-y-5 pb-28">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-outfit font-bold tracking-tight">Araçlarım</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{vehicles.length} kayıtlı araç</p>
        </div>
        <div className="flex items-center gap-2">
          {vehicles.length > 0 && (
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              size="sm"
              className="rounded-full h-9 px-4 font-semibold"
              onClick={isSelectionMode ? cancelSelection : () => setIsSelectionMode(true)}
            >
              {isSelectionMode ? "İptal" : "Seç"}
            </Button>
          )}
          {!isSelectionMode && (
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
                href={isSelectionMode ? "#" : `/vehicles/${vehicle.id}`}
                className="block tap-highlight-transparent"
                onClick={(e) => { if (isSelectionMode) toggleSelection(vehicle.id, e); }}
              >
                <motion.div variants={cardAnim} whileTap={isSelectionMode ? {} : { scale: 0.97 }}>
                  <Card className={`overflow-hidden rounded-3xl shadow-md hover:shadow-lg transition-all relative group ${selected ? "border-primary ring-2 ring-primary/20" : "border-border/40"}`}>
                    {isSelectionMode && (
                      <div className={`absolute inset-0 z-20 pointer-events-none transition-colors rounded-3xl ${selected ? "bg-primary/5" : "bg-black/40"}`} />
                    )}
                    {isSelectionMode && (
                      <div className="absolute top-3 right-3 z-30">
                        {selected ? <CheckCircle2 className="h-7 w-7 text-primary fill-primary/20 drop-shadow-md" /> : <Circle className="h-7 w-7 text-white/80 drop-shadow-md" />}
                      </div>
                    )}

                    {/* Hero */}
                    <div className="h-48 relative bg-muted overflow-hidden">
                      {vehicle.image ? (
                        <Image src={vehicle.image} alt={vehicle.plate} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="448px" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-primary/10 group-hover:scale-105 transition-transform duration-700 flex items-center justify-center">
                          <Car className="h-20 w-20 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Plate */}
                      <div className="absolute top-3 left-3 glass rounded-xl px-3 py-1.5 border border-white/20 flex items-center gap-2 shadow-lg z-10">
                        <Car className="h-3.5 w-3.5 text-white" />
                        <span className="font-outfit font-bold text-sm text-white">{vehicle.plate}</span>
                      </div>

                      {/* Health */}
                      {!isSelectionMode && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="relative">
                            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                              <circle cx="22" cy="22" r="18" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                              <circle
                                cx="22" cy="22" r="18" fill="none"
                                stroke={score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="3"
                                strokeDasharray={`${score * 1.131} ${113.1 - score * 1.131}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-white text-[11px] font-bold">{score}</span>
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-10">
                        <div>
                          <h2 className="text-xl font-bold font-outfit text-white drop-shadow-md">{vehicle.brand}</h2>
                          <p className="text-sm text-white/70 font-medium">{vehicle.model} • {vehicle.year}</p>
                        </div>
                        {!isSelectionMode && (
                          <div className="bg-white/15 backdrop-blur-md text-white p-2 rounded-full shadow-lg group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info bar */}
                    <div className="px-4 py-3 bg-card flex items-center justify-between border-t border-border/30">
                      <div className="flex items-center gap-3 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{vehicle.mileage.toLocaleString("tr-TR")} km</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Fuel className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{vehicle.fuelType}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] font-bold rounded-lg px-2 border-none ${tireColor[vehicle.tireStatus]}`}>
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
          <div className="col-span-full py-16 text-center flex flex-col items-center">
            <Car className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Henüz araç eklenmemiş.</p>
            <Link href="/vehicles/new" className="mt-4">
              <Button className="rounded-full px-6 gap-2 shadow-md">
                <Plus className="h-4 w-4" /> İlk Aracını Ekle
              </Button>
            </Link>
          </div>
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
            <DialogClose className="w-full sm:w-auto">
              <Button variant="outline" className="w-full rounded-xl">İptal</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto rounded-xl">Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
