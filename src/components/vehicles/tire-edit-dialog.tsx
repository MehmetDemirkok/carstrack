"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Disc3, Warehouse, Pencil } from "lucide-react";
import { updateVehicle } from "@/lib/db";
import type { Vehicle, TireSeasonType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  TIRE_SEASON_OPTIONS, TIRE_STORAGE_OPTIONS, TIRE_STORAGE_SCRAPPED, SeasonIcon, defaultTargetSeason,
} from "./tire-season";

const iLabel = "text-xs font-medium text-muted-foreground";
const iCls = "rounded-xl h-10 bg-muted/30 border-border/40 text-sm";
const chip = "cursor-pointer rounded-xl border py-2 text-xs font-medium transition-colors";
const chipOn = "border-primary/50 bg-primary/10 text-primary";
const chipOff = "border-border/40 bg-muted/20 hover:bg-muted/40";

const STORAGE_CHOICES = TIRE_STORAGE_OPTIONS.filter((o) => o !== TIRE_STORAGE_SCRAPPED);

function parseKm(value: string): number {
  return parseInt(value.replace(/\./g, "").replace(/,/g, ""), 10) || 0;
}

const initialForm = (vehicle: Vehicle) => ({
  season: vehicle.tireStatus,
  brand: vehicle.tireBrand,
  size: vehicle.tireSize,
  installDate: vehicle.tireInstallDate,
  installKm: vehicle.tireMileage > 0 ? String(vehicle.tireMileage) : "",
  hasStored: !!vehicle.storedTireSeason,
  storedSeason: vehicle.storedTireSeason ?? defaultTargetSeason(vehicle.tireStatus),
  storageLocation: vehicle.tireStorageLocation ?? "",
  storageNote: vehicle.tireStorageNote ?? "",
});

/**
 * Lastik bilgilerinin elle düzeltilmesi: takılı takım + saklanan takım.
 * Servis kaydı OLUŞTURMAZ — yalnızca aracın lastik alanlarını günceller.
 * Gerçek bir değişim için "Mevsimlik Lastik Değişimi" kullanılır.
 */
export function TireEditDialog({
  open, onOpenChange, vehicle, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState(() => initialForm(vehicle));
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setForm(initialForm(vehicle));
  }

  const handleSave = async () => {
    const installKm = form.installKm.trim() ? parseKm(form.installKm) : 0;
    if (installKm > vehicle.mileage) {
      toast.error("Geçersiz Kilometre", {
        description: `Takılma kilometresi (${installKm.toLocaleString("tr-TR")} km), aracın mevcut kilometresinden (${vehicle.mileage.toLocaleString("tr-TR")} km) yüksek olamaz.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateVehicle(vehicle.id, {
        tireStatus: form.season,
        tireBrand: form.brand.trim(),
        tireSize: form.size.trim(),
        tireInstallDate: form.installDate,
        tireMileage: installKm,
        ...(form.hasStored
          ? {
              storedTireSeason: form.storedSeason,
              tireStorageLocation: form.storageLocation.trim() || null,
              tireStorageNote: form.storageNote.trim() || null,
            }
          : { storedTireSeason: null, tireStorageLocation: null, tireStorageNote: null }),
      });
      toast.success("Lastik bilgileri güncellendi");
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "Lastik bilgileri kaydedilemedi." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" /> Lastik Bilgilerini Düzenle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Takılı takım ── */}
          <section className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Disc3 className="h-3.5 w-3.5 text-primary" /> Araçta Takılı Lastikler
            </p>

            <div className="space-y-1">
              <Label className={iLabel}>Mevsim</Label>
              <div className="flex gap-2">
                {(TIRE_SEASON_OPTIONS as TireSeasonType[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, season: s }))}
                    className={`flex-1 flex items-center justify-center gap-1 ${chip} ${form.season === s ? chipOn : chipOff}`}
                  >
                    <SeasonIcon season={s} className="h-3.5 w-3.5" /> {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={iLabel}>Marka / Model</Label>
                <Input className={iCls} placeholder="Pirelli, Michelin..." value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className={iLabel}>Ebat</Label>
                <Input className={iCls} placeholder="205/55R16" value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={iLabel}>Takılma Tarihi</Label>
                <DatePicker value={form.installDate} onChange={(v) => setForm((f) => ({ ...f, installDate: v }))} />
              </div>
              <div className="space-y-1">
                <Label className={iLabel}>Takıldığı Km</Label>
                <Input className={iCls} type="text" inputMode="numeric" placeholder={String(vehicle.mileage)} value={form.installKm} onChange={(e) => setForm((f) => ({ ...f, installKm: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* ── Saklanan takım ── */}
          <section className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Warehouse className="h-3.5 w-3.5 text-primary" /> Saklanan Lastikler
              </p>
              <div className="flex rounded-lg border border-border/40 bg-card p-0.5 text-[11px] font-medium">
                {[true, false].map((v) => (
                  <button
                    type="button"
                    key={String(v)}
                    onClick={() => setForm((f) => ({ ...f, hasStored: v }))}
                    className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${form.hasStored === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {v ? "Var" : "Yok"}
                  </button>
                ))}
              </div>
            </div>

            {form.hasStored ? (
              <>
                <div className="space-y-1">
                  <Label className={iLabel}>Saklanan Takım</Label>
                  <div className="flex gap-2">
                    {(TIRE_SEASON_OPTIONS as TireSeasonType[]).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setForm((f) => ({ ...f, storedSeason: s }))}
                        className={`flex-1 flex items-center justify-center gap-1 ${chip} ${form.storedSeason === s ? chipOn : chipOff}`}
                      >
                        <SeasonIcon season={s} className="h-3.5 w-3.5" /> {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className={iLabel}>Nerede?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STORAGE_CHOICES.map((o) => (
                      <button
                        type="button"
                        key={o}
                        onClick={() => setForm((f) => ({ ...f, storageLocation: f.storageLocation === o ? "" : o }))}
                        className={`${chip} px-1 ${form.storageLocation === o ? chipOn : chipOff}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className={iLabel}>Firma / Adres (ops.)</Label>
                  <Input
                    className={iCls}
                    placeholder="Örn. lastikçinin adı, depo adresi..."
                    value={form.storageNote}
                    onChange={(e) => setForm((f) => ({ ...f, storageNote: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">Araçta takılı olanlar dışında saklanan bir lastik takımı yok.</p>
            )}
          </section>

          <p className="text-[11px] text-muted-foreground">
            Bu pencere yalnızca bilgileri düzeltir, servis kaydı oluşturmaz. Lastik değiştirdiyseniz
            &quot;Mevsimlik Lastik Değişimi&quot;ni kullanın.
          </p>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
          <Button onClick={handleSave} disabled={submitting} className="rounded-xl">
            {submitting ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
