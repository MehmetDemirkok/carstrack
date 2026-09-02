"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fuel, ImagePlus, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  createFuelRecord, updateFuelRecord, uploadFuelReceipt, getLastFuelRecordForVehicle,
} from "@/lib/db";
import { FUEL_TYPES, FUEL_TYPE_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/fuel";
import { SCAN_MAX_FILE_SIZE, SCAN_ALLOWED_TYPES, SCAN_ALLOWED_EXTS } from "@/lib/file-utils";
import type { Vehicle, FuelRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/data-context";

function nowParts(): { date: string; time: string } {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const emptyForm = () => ({
  vehicleId: "", ...nowParts(), stationName: "", fuelType: "motorin",
  liters: "", pricePerLiter: "", totalAmount: "", odometer: "",
  paymentMethod: "diger", receiptNumber: "", notes: "",
});

type FormState = ReturnType<typeof emptyForm>;

function calcTotal(liters: string, price: string): string {
  const l = parseFloat(liters);
  const p = parseFloat(price);
  if (!liters || !price || Number.isNaN(l) || Number.isNaN(p) || l <= 0 || p <= 0) return "";
  return String(Math.round(l * p * 100) / 100);
}

export interface FuelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FuelRecord | null;
  vehicles: Vehicle[];
  stationSuggestions?: string[];
  defaultVehicleId?: string;
  lockVehicle?: boolean;
  onSaved: () => void | Promise<void>;
}

/** Yakıt alımı ekleme/düzenleme formu — /yakit sayfalarından ve araç detayından (araç kilitli) kullanılır. */
export function FuelFormDialog({
  open, onOpenChange, editing, vehicles, stationSuggestions, defaultVehicleId, lockVehicle, onSaved,
}: FuelFormDialogProps) {
  const { refresh: refreshSharedData } = useData();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [totalTouched, setTotalTouched] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastRecord, setLastRecord] = useState<{ odometer: number; fueledAt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const d = new Date(editing.fueledAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setForm({
        vehicleId: editing.vehicleId,
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        stationName: editing.stationName, fuelType: editing.fuelType,
        liters: String(editing.liters), pricePerLiter: String(editing.pricePerLiter),
        totalAmount: String(editing.totalAmount), odometer: String(editing.odometer),
        paymentMethod: editing.paymentMethod, receiptNumber: editing.receiptNumber,
        notes: editing.notes,
      });
      setTotalTouched(true);
    } else {
      // Araç önceden seçili geliyorsa (kilitli veya varsayılan), KM alanını
      // aracın güncel kilometresiyle başlat — sürücü/kullanıcı ordan devam etsin.
      const preselected = defaultVehicleId ? vehicles.find((v) => v.id === defaultVehicleId) : undefined;
      setForm({ ...emptyForm(), vehicleId: defaultVehicleId ?? "", odometer: preselected ? String(preselected.mileage) : "" });
      setTotalTouched(false);
    }
    setPhoto(null);
  }, [open, editing, defaultVehicleId, vehicles]);

  // Araç seçilince (yeni kayıt), KM alanını aracın güncel kilometresiyle doldur —
  // kullanıcı bu değeri yakıt alımı sonrası okuduğu güncel KM ile değiştirir.
  function handleVehicleChange(vehicleId: string) {
    const v = vehicles.find((x) => x.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicleId,
      odometer: !editing && v ? String(v.mileage) : prev.odometer,
    }));
  }

  useEffect(() => {
    if (!open || !form.vehicleId) { setLastRecord(null); return; }
    let cancelled = false;
    getLastFuelRecordForVehicle(form.vehicleId)
      .then((r) => { if (!cancelled) setLastRecord(r); })
      .catch(() => { if (!cancelled) setLastRecord(null); });
    return () => { cancelled = true; };
  }, [open, form.vehicleId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleLitersChange(value: string) {
    setForm((prev) => ({ ...prev, liters: value, totalAmount: totalTouched ? prev.totalAmount : calcTotal(value, prev.pricePerLiter) }));
  }
  function handlePriceChange(value: string) {
    setForm((prev) => ({ ...prev, pricePerLiter: value, totalAmount: totalTouched ? prev.totalAmount : calcTotal(prev.liters, value) }));
  }
  function handleTotalChange(value: string) {
    setTotalTouched(true);
    set("totalAmount", value);
  }
  function resetTotalToAuto() {
    setTotalTouched(false);
    setForm((prev) => ({ ...prev, totalAmount: calcTotal(prev.liters, prev.pricePerLiter) }));
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SCAN_ALLOWED_TYPES.includes(file.type) && !SCAN_ALLOWED_EXTS.includes(ext)) {
      toast.error("Desteklenmeyen dosya", { description: "PDF veya görsel (JPG, PNG, WebP) seçin." });
      return;
    }
    if (file.size > SCAN_MAX_FILE_SIZE) {
      toast.error("Dosya çok büyük", { description: "Maks. 5 MB." });
      return;
    }
    setPhoto(file);
  }

  const computedTotal = calcTotal(form.liters, form.pricePerLiter);
  const totalMismatch =
    !!computedTotal && !!form.totalAmount &&
    Math.abs(parseFloat(form.totalAmount) - parseFloat(computedTotal)) > Math.max(1, parseFloat(computedTotal) * 0.01);

  const newOdometer = parseInt(form.odometer, 10);
  const distancePreview = (() => {
    if (!lastRecord || Number.isNaN(newOdometer)) return null;
    if (newOdometer <= lastRecord.odometer) {
      return { ok: false, text: `Önceki kayıttan (${lastRecord.odometer.toLocaleString("tr-TR")} KM) düşük veya eşit — mesafe/tüketim hesaplanmayacak.` };
    }
    return { ok: true, text: `Kat edilen mesafe: ${(newOdometer - lastRecord.odometer).toLocaleString("tr-TR")} KM (önceki: ${lastRecord.odometer.toLocaleString("tr-TR")} KM)` };
  })();

  async function handleSubmit() {
    if (!form.vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    if (!form.date) { toast.error("Lütfen tarih girin"); return; }
    const liters = parseFloat(form.liters);
    if (!form.liters || Number.isNaN(liters) || liters <= 0) { toast.error("Lütfen geçerli bir litre değeri girin"); return; }
    const price = parseFloat(form.pricePerLiter);
    if (!form.pricePerLiter || Number.isNaN(price) || price <= 0) { toast.error("Lütfen geçerli bir litre fiyatı girin"); return; }
    const total = parseFloat(form.totalAmount);
    if (!form.totalAmount || Number.isNaN(total) || total < 0) { toast.error("Lütfen geçerli bir toplam tutar girin"); return; }
    const odometer = parseInt(form.odometer, 10);
    if (form.odometer === "" || Number.isNaN(odometer) || odometer < 0) { toast.error("Lütfen geçerli bir kilometre girin"); return; }

    setSubmitting(true);
    try {
      let receiptPath: string | undefined = editing?.receiptPath;
      if (photo) {
        try {
          receiptPath = await uploadFuelReceipt(form.vehicleId, photo);
        } catch {
          toast.error("Fiş/fatura yüklenemedi, kayıt fotoğrafsız devam ediyor");
        }
      }

      const payload = {
        vehicleId: form.vehicleId,
        fueledAt: new Date(`${form.date}T${form.time || "00:00"}:00`).toISOString(),
        stationName: form.stationName.trim(),
        fuelType: form.fuelType as FuelRecord["fuelType"],
        liters, pricePerLiter: price, totalAmount: total, odometer,
        paymentMethod: form.paymentMethod as FuelRecord["paymentMethod"],
        receiptNumber: form.receiptNumber.trim(),
        receiptPath,
        notes: form.notes.trim(),
      };

      if (editing) {
        await updateFuelRecord(editing.id, payload);
        toast.success("Yakıt kaydı güncellendi");
      } else {
        const created = await createFuelRecord(payload);
        toast.success("Yakıt alımı kaydedildi", {
          description: created.distanceKm !== undefined
            ? `Kat edilen mesafe: ${created.distanceKm.toLocaleString("tr-TR")} KM · ${created.consumptionL100km?.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L/100km`
            : undefined,
        });
      }
      onOpenChange(false);
      await onSaved();
      void refreshSharedData();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full h-11 rounded-2xl border border-border bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
  const lockedVehicle = vehicles.find((v) => v.id === form.vehicleId);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && onOpenChange(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-lg p-5 space-y-3 my-4 max-h-[94vh] overflow-y-auto"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl"><Fuel className="h-5 w-5 text-primary" /></div>
              <h2 className="font-bold text-base">{editing ? "Yakıt Kaydını Düzenle" : "Yeni Yakıt Alımı"}</h2>
            </div>

            {/* Araç */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Araç</label>
              {lockVehicle ? (
                <div className={`${inputCls} flex items-center text-muted-foreground bg-muted/30`}>
                  {lockedVehicle ? `${lockedVehicle.plate} — ${lockedVehicle.brand} ${lockedVehicle.model}` : "—"}
                </div>
              ) : (
                <select value={form.vehicleId} onChange={(e) => handleVehicleChange(e.target.value)} className={inputCls}>
                  <option value="">Araç seçin</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                </select>
              )}
            </div>

            {/* Tarih + Saat */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarih</label>
                <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saat</label>
                <input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* İstasyon + Tür */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yakıt İstasyonu</label>
                <input
                  value={form.stationName} onChange={(e) => set("stationName", e.target.value)}
                  placeholder="Örn: Shell" list="fuel-station-suggestions" className={inputCls}
                />
                {stationSuggestions && stationSuggestions.length > 0 && (
                  <datalist id="fuel-station-suggestions">
                    {stationSuggestions.map((s) => <option key={s} value={s} />)}
                  </datalist>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yakıt Türü</label>
                <select value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)} className={inputCls}>
                  {FUEL_TYPES.map((t) => <option key={t} value={t}>{FUEL_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
            </div>

            {/* Litre + Litre Fiyatı */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Litre</label>
                <input type="number" min="0" step="0.01" value={form.liters} onChange={(e) => handleLitersChange(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Litre Fiyatı (₺)</label>
                <input type="number" min="0" step="0.01" value={form.pricePerLiter} onChange={(e) => handlePriceChange(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Toplam Tutar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Toplam Tutar (₺)</label>
                {totalTouched && computedTotal && (
                  <button type="button" onClick={resetTotalToAuto} className="text-[10px] font-semibold text-primary hover:underline">
                    Otomatiğe dön
                  </button>
                )}
              </div>
              <input type="number" min="0" step="0.01" value={form.totalAmount} onChange={(e) => handleTotalChange(e.target.value)} className={inputCls} />
              {totalMismatch ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> Litre × Fiyat = ₺{computedTotal} ama girilen tutar farklı.
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {totalTouched ? "Elle girildi" : "Litre × Fiyat — otomatik hesaplandı"}
                </p>
              )}
            </div>

            {/* KM */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Kilometre <span className="normal-case font-normal">(aracın güncel KM&apos;si)</span>
              </label>
              <input type="number" min="0" step="1" value={form.odometer} onChange={(e) => set("odometer", e.target.value)} className={inputCls} />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Yakıt alırken gösterge panelindeki güncel kilometreyi yazın — kaydedince aracın ana kilometresi bu değere güncellenir.
              </p>
              {distancePreview && (
                <p className={`text-[10px] leading-tight flex items-center gap-1 ${distancePreview.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {distancePreview.ok ? <ArrowRight className="h-3 w-3 shrink-0" /> : <AlertTriangle className="h-3 w-3 shrink-0" />}
                  {distancePreview.text}
                </p>
              )}
            </div>

            {/* Ödeme + Fiş No */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ödeme Yöntemi</label>
                <select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className={inputCls}>
                  {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{PAYMENT_METHOD_LABELS[p]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fiş/Fatura No <span className="normal-case font-normal">(isteğe bağlı)</span></label>
                <input value={form.receiptNumber} onChange={(e) => set("receiptNumber", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Fiş fotoğrafı */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Fiş/Fatura Fotoğrafı <span className="normal-case font-normal">(isteğe bağlı)</span>
              </label>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handlePhotoSelect} className="hidden" />
              <button
                type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-xs font-semibold"
              >
                <ImagePlus className="h-4 w-4" /> {photo ? photo.name : editing?.receiptPath ? "Yeni fotoğraf / PDF seç (mevcutla değiştirilir)" : "Fotoğraf / PDF Seç"}
              </button>
            </div>

            {/* Not */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Not <span className="normal-case font-normal">(isteğe bağlı)</span></label>
              <input value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={submitting}>İptal</Button>
              <Button
                onClick={handleSubmit} disabled={submitting}
                className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none font-semibold"
              >
                {submitting ? "Kaydediliyor..." : editing ? "Güncelle" : "Kaydet"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
