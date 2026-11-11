"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Sun, Snowflake, Layers, Wallet, XCircle, Repeat } from "lucide-react";
import { addRecord, updateVehicle } from "@/lib/db";
import type { Vehicle, TireSeasonType, PaymentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

/** Sökülen lastiklerin nerede saklandığı — servis kaydının notuna yazılır. */
const STORAGE_OPTIONS = ["Lastik otelinde", "Firma deposunda", "Araçta / bagajda", "Hurdaya ayrıldı"] as const;

const iLabel = "text-xs font-medium text-muted-foreground";
const iCls = "rounded-xl h-10 bg-muted/30 border-border/40 text-sm";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKm(value: string): number {
  return parseInt(value.replace(/\./g, "").replace(/,/g, ""), 10) || 0;
}

/**
 * Takılacak mevsimin varsayılanı: araç yazlıktaysa kışlık, kışlıktaysa yazlık.
 * Dört mevsim lastikteyse takvime bakılır (Kasım–Mart arası kışlık).
 */
function defaultTargetSeason(current: TireSeasonType): TireSeasonType {
  if (current === "Yazlık") return "Kışlık";
  if (current === "Kışlık") return "Yazlık";
  const m = new Date().getMonth() + 1;
  return m >= 11 || m <= 3 ? "Kışlık" : "Yazlık";
}

function SeasonIcon({ season, className }: { season: TireSeasonType; className?: string }) {
  if (season === "Yazlık") return <Sun className={className} />;
  if (season === "Kışlık") return <Snowflake className={className} />;
  return <Layers className={className} />;
}

function seasonTone(season: TireSeasonType): string {
  if (season === "Yazlık") return "bg-orange-500/10 border-orange-500/20 text-orange-600";
  if (season === "Kışlık") return "bg-violet-500/10 border-violet-500/20 text-violet-600";
  return "bg-teal-500/10 border-teal-500/20 text-teal-600";
}

const emptyForm = (vehicle: Vehicle) => ({
  target: defaultTargetSeason(vehicle.tireStatus),
  date: todayLocal(),
  mileage: "",
  brand: "",
  // Mevsimlik takımlar genelde aynı ebattadır — mevcut ölçüyle önceden doldurulur.
  size: vehicle.tireSize || "",
  serviceCenter: "",
  storage: "" as string,
  cost: "",
  paymentStatus: "paid" as PaymentStatus,
  unpaidReason: "",
  notes: "",
});

export interface SeasonalTireSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle;
  /** Servis noktası önerileri için sayfadaki <datalist> id'si. */
  providerListId?: string;
  onSaved: () => void | Promise<void>;
}

/**
 * Mevsimlik (yazlık ↔ kışlık) lastik değişimi: tek adımda hem aracın lastik durumunu
 * günceller hem de "Lastik" tipinde bir servis kaydı oluşturur.
 */
export function SeasonalTireSwapDialog({ open, onOpenChange, vehicle, providerListId, onSaved }: SeasonalTireSwapDialogProps) {
  const [form, setForm] = useState(() => emptyForm(vehicle));
  const [submitting, setSubmitting] = useState(false);
  // Her açılışta form aracın güncel durumuna göre sıfırlanır (render sırasında
  // önceki prop ile karşılaştırma — effect'e gerek kalmadan).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setForm(emptyForm(vehicle));
  }

  const handleSave = async () => {
    const mileage = form.mileage.trim() ? parseKm(form.mileage) : vehicle.mileage;
    if (mileage > vehicle.mileage) {
      toast.error("Geçersiz Kilometre", {
        description: `Girdiğiniz kilometre (${mileage.toLocaleString("tr-TR")} km), aracın mevcut kilometresinden (${vehicle.mileage.toLocaleString("tr-TR")} km) yüksek olamaz. Önce aracın km bilgisini güncelleyin.`,
      });
      return;
    }
    const hasCost = form.cost.trim() !== "";
    if (hasCost && form.paymentStatus === "unpaid" && !form.unpaidReason.trim()) {
      toast.error("Ödenmeme nedeni gerekli", { description: "Ödenmedi olarak işaretlediğiniz kayıt için lütfen nedenini yazın." });
      return;
    }

    const from = vehicle.tireStatus;
    const brand = form.brand.trim() || vehicle.tireBrand;
    const size = form.size.trim() || vehicle.tireSize;
    const noteLines = [
      `Sökülen: ${from}${vehicle.tireBrand ? ` (${vehicle.tireBrand}${vehicle.tireSize ? ` • ${vehicle.tireSize}` : ""})` : ""}`,
      `Takılan: ${form.target}${brand ? ` (${brand}${size ? ` • ${size}` : ""})` : ""}`,
      form.storage ? `Sökülen lastikler: ${form.storage}` : "",
      form.notes.trim(),
    ].filter(Boolean);

    setSubmitting(true);
    try {
      await addRecord({
        vehicleId: vehicle.id,
        date: form.date,
        type: "tire",
        title: `Mevsimlik lastik değişimi (${from} → ${form.target})`,
        mileage,
        serviceCenter: form.serviceCenter.trim(),
        notes: noteLines.join("\n"),
        cost: hasCost ? parseFloat(form.cost) : undefined,
        paymentStatus: hasCost ? form.paymentStatus : undefined,
        unpaidReason: hasCost && form.paymentStatus === "unpaid" ? form.unpaidReason.trim() : undefined,
      });
      await updateVehicle(vehicle.id, {
        tireStatus: form.target,
        tireBrand: brand,
        tireSize: size,
        tireInstallDate: form.date,
        tireMileage: mileage,
      });
      toast.success("Lastik değişimi kaydedildi", {
        description: `Araç ${form.target.toLocaleLowerCase("tr-TR")} lastiğe geçirildi ve servis kaydı eklendi.`,
      });
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "Lastik değişimi kaydedilirken hata oluştu." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" /> Mevsimlik Lastik Değişimi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Mevcut → yeni mevsim */}
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-muted/40 border border-border/20 p-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${seasonTone(vehicle.tireStatus)}`}>
              <SeasonIcon season={vehicle.tireStatus} className="h-4 w-4" /> {vehicle.tireStatus}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${seasonTone(form.target)}`}>
              <SeasonIcon season={form.target} className="h-4 w-4" /> {form.target}
            </div>
          </div>

          <div className="space-y-1">
            <Label className={iLabel}>Takılacak Lastik</Label>
            <div className="flex gap-2">
              {(["Yazlık", "Kışlık", "Dört Mevsim"] as TireSeasonType[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, target: s }))}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                    form.target === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 bg-muted/20"
                  }`}
                >
                  <SeasonIcon season={s} className="h-3.5 w-3.5" /> {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={iLabel}>Değişim Tarihi</Label>
              <DatePicker value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Kilometre</Label>
              <Input className={iCls} type="text" inputMode="numeric" placeholder={String(vehicle.mileage)} value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={iLabel}>Lastik Markası / Modeli</Label>
              <Input className={iCls} placeholder={vehicle.tireBrand || "Pirelli, Michelin..."} value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Ebat</Label>
              <Input className={iCls} placeholder="225/55R18" value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className={iLabel}>Lastikçi / Servis Noktası</Label>
            <Input className={iCls} list={providerListId} placeholder="Lastikçi adı..." value={form.serviceCenter} onChange={(e) => setForm((f) => ({ ...f, serviceCenter: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label className={iLabel}>Sökülen Lastikler (ops.)</Label>
            <div className="grid grid-cols-2 gap-2">
              {STORAGE_OPTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, storage: f.storage === s ? "" : s }))}
                  className={`rounded-xl border py-2 text-xs font-medium transition-colors ${
                    form.storage === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 bg-muted/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className={iLabel}>Tutar (₺, ops.)</Label>
            <Input className={iCls} type="number" inputMode="decimal" placeholder="0" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
          </div>
          {form.cost.trim() !== "" && (
            <div className="rounded-2xl border border-border/40 bg-muted/20 p-3 space-y-2">
              <Label className={iLabel}>Ödeme Durumu</Label>
              <div className="flex gap-2">
                {(["paid", "unpaid"] as PaymentStatus[]).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, paymentStatus: s }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${
                      form.paymentStatus === s
                        ? s === "paid" ? "border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)] dark:text-emerald-400" : "border-destructive/50 bg-destructive/10 text-destructive"
                        : "border-border/40 bg-card"
                    }`}
                  >
                    {s === "paid" ? <Wallet className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {s === "paid" ? "Ödendi" : "Ödenmedi"}
                  </button>
                ))}
              </div>
              {form.paymentStatus === "unpaid" && (
                <Input
                  className={iCls}
                  placeholder="Ödenmeme nedeni (örn. fatura bekleniyor...)"
                  value={form.unpaidReason}
                  onChange={(e) => setForm((f) => ({ ...f, unpaidReason: e.target.value }))}
                />
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className={iLabel}>Notlar</Label>
            <textarea
              className="w-full rounded-xl bg-muted/30 border border-border/40 text-sm p-3 min-h-[70px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Balans, rot ayarı, diş derinliği..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
          <Button onClick={handleSave} disabled={submitting || !form.date} className="rounded-xl">
            {submitting ? "Kaydediliyor..." : "Değişimi Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
