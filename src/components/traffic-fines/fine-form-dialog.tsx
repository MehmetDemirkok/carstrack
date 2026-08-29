"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Sparkles, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { createTrafficFine, updateTrafficFine, uploadFinePhoto } from "@/lib/db";
import { fileToBase64, SCAN_MAX_FILE_SIZE, SCAN_ALLOWED_TYPES, SCAN_ALLOWED_EXTS } from "@/lib/file-utils";
import type { Vehicle, Profile, TrafficFine } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface FineExtracted {
  plate?: string; fineNumber?: string; violationType?: string;
  amount?: string; discountedAmount?: string; fineDate?: string; dueDate?: string; location?: string;
}

const emptyForm = {
  vehicleId: "", driverId: "", fineNumber: "", violationType: "",
  amount: "", discountedAmount: "", fineDate: new Date().toISOString().slice(0, 10),
  dueDate: "", location: "", notes: "",
};

// Trafik cezalarında peşin/erken ödeme indirimi standart olarak 1/4'tür
// (KTK m.115) — tutar girildiğinde kullanıcı elle değiştirmediği sürece bu
// oranla otomatik hesaplanır.
const DISCOUNT_RATE = 0.75;

function calcDiscounted(amountStr: string): string {
  const n = parseFloat(amountStr);
  if (!amountStr || Number.isNaN(n) || n <= 0) return "";
  return String(Math.round(n * DISCOUNT_RATE * 100) / 100);
}

export interface FineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Düzenlenen ceza kaydı — yeni kayıt için null. */
  editing: TrafficFine | null;
  vehicles: Vehicle[];
  drivers: Profile[];
  /** Formu açarken önceden seçili gelecek araç (örn. araç detay sayfasından açıldığında). */
  defaultVehicleId?: string;
  /** true ise araç seçimi sabitlenir ve dropdown yerine salt-okunur etiket gösterilir. */
  lockVehicle?: boolean;
  onSaved: () => void | Promise<void>;
}

/**
 * Trafik cezası ekleme/düzenleme formu — hem /traffic-fines sayfasından hem de
 * araç detay sayfasından (araç önceden seçili ve kilitli olarak) kullanılır.
 */
export function FineFormDialog({
  open, onOpenChange, editing, vehicles, drivers, defaultVehicleId, lockVehicle, onSaved,
}: FineFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  // İndirimli tutar kullanıcı tarafından elle değiştirildi mi? true olduğunda
  // tutar değişse bile otomatik yeniden hesaplanmaz.
  const [discountedTouched, setDiscountedTouched] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const hasDiscount = editing.discountedAmount !== undefined;
      setForm({
        vehicleId: editing.vehicleId, driverId: editing.driverId ?? "",
        fineNumber: editing.fineNumber, violationType: editing.violationType,
        amount: String(editing.amount),
        discountedAmount: hasDiscount ? String(editing.discountedAmount) : calcDiscounted(String(editing.amount)),
        fineDate: editing.fineDate?.slice(0, 10) ?? "", dueDate: editing.dueDate?.slice(0, 10) ?? "",
        location: editing.location ?? "", notes: editing.notes ?? "",
      });
      setDiscountedTouched(hasDiscount);
    } else {
      setForm({ ...emptyForm, vehicleId: defaultVehicleId ?? "" });
      setDiscountedTouched(false);
    }
    setPhoto(null);
  }, [open, editing, defaultVehicleId]);

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Tutar değişince, kullanıcı indirimli tutarı elle değiştirmediyse
  // otomatik olarak 1/4 indirimli karşılığını hesaplar.
  function handleAmountChange(value: string) {
    setForm((prev) => ({
      ...prev,
      amount: value,
      discountedAmount: discountedTouched ? prev.discountedAmount : calcDiscounted(value),
    }));
  }

  function handleDiscountedChange(value: string) {
    setDiscountedTouched(true);
    set("discountedAmount", value);
  }

  function resetDiscountedToAuto() {
    setDiscountedTouched(false);
    setForm((prev) => ({ ...prev, discountedAmount: calcDiscounted(prev.amount) }));
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

  async function handleAiFill() {
    if (!photo) return;
    setScanning(true);
    try {
      const base64 = await fileToBase64(photo);
      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fileData: base64, mimeType: photo.type || "application/octet-stream", documentType: "fine" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json() as { data: FineExtracted };
      if (!data || Object.keys(data).length === 0) {
        toast.warning("Bilgi bulunamadı", { description: "Tebligattan bilgi çıkarılamadı, alanları elle doldurabilirsiniz." });
        return;
      }

      const updates: Partial<typeof emptyForm> = {};
      if (data.fineNumber) updates.fineNumber = data.fineNumber;
      if (data.violationType) updates.violationType = data.violationType;
      if (data.amount) updates.amount = String(parseFloat(data.amount));
      if (data.discountedAmount) updates.discountedAmount = String(parseFloat(data.discountedAmount));
      if (data.fineDate) updates.fineDate = data.fineDate;
      if (data.dueDate) updates.dueDate = data.dueDate;
      if (data.location) updates.location = data.location;

      let matchedVehicle: Vehicle | undefined;
      if (data.plate && !lockVehicle) {
        const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");
        matchedVehicle = vehicles.find((v) => norm(v.plate) === norm(data.plate!));
        if (matchedVehicle) updates.vehicleId = matchedVehicle.id;
      }

      // Tebligatta indirimli tutar açıkça yazılıysa onu esas al (elle girilmiş
      // sayılır); yazılı değilse ve kullanıcı daha önce elle değiştirmediyse
      // okunan tutardan otomatik hesapla.
      if (updates.discountedAmount) {
        setDiscountedTouched(true);
      } else if (updates.amount && !discountedTouched) {
        updates.discountedAmount = calcDiscounted(updates.amount);
      }

      setForm((prev) => ({ ...prev, ...updates }));
      toast.success("Tebligat okundu", {
        description: matchedVehicle ? `Plaka ${matchedVehicle.plate} otomatik eşleşti.` : "Bulunan bilgileri kontrol edip kaydedin.",
      });
    } catch {
      toast.error("Tebligat okunamadı", { description: "Alanları elle doldurabilirsiniz." });
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit() {
    if (!form.vehicleId) { toast.error("Lütfen bir araç seçin"); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) { toast.error("Lütfen geçerli bir tutar girin"); return; }
    if (!form.fineDate) { toast.error("Lütfen ceza tarihini girin"); return; }

    setSubmitting(true);
    try {
      let photoPath = editing?.photoPath;
      if (photo) {
        try {
          photoPath = await uploadFinePhoto(form.vehicleId, photo);
        } catch {
          toast.error("Fotoğraf yüklenemedi, kayıt fotoğrafsız devam ediyor");
        }
      }

      const payload = {
        vehicleId: form.vehicleId,
        driverId: form.driverId || undefined,
        fineNumber: form.fineNumber.trim(),
        violationType: form.violationType.trim(),
        amount,
        discountedAmount: form.discountedAmount ? parseFloat(form.discountedAmount) : undefined,
        fineDate: form.fineDate,
        dueDate: form.dueDate || undefined,
        location: form.location.trim() || undefined,
        photoPath,
        notes: form.notes.trim(),
      };

      if (editing) {
        await updateTrafficFine(editing.id, payload);
        toast.success("Ceza güncellendi");
      } else {
        await createTrafficFine(payload);
        toast.success("Ceza kaydedildi", {
          description: form.driverId ? "Sürücüye bildirim gönderildi." : undefined,
        });
      }
      onOpenChange(false);
      await onSaved();
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
              <div className="p-2 bg-primary/10 rounded-xl"><Gavel className="h-5 w-5 text-primary" /></div>
              <h2 className="font-bold text-base">{editing ? "Cezayı Düzenle" : "Yeni Trafik Cezası"}</h2>
            </div>

            {/* Tebligat fotoğrafı + AI */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tebligat Fotoğrafı <span className="normal-case font-normal">(isteğe bağlı)</span>
              </label>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handlePhotoSelect} className="hidden" />
              <div className="flex items-center gap-2">
                <button
                  type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-1 h-10 rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-xs font-semibold"
                >
                  <ImagePlus className="h-4 w-4" /> {photo ? photo.name : "Fotoğraf / PDF Seç"}
                </button>
                {photo && (
                  <Button
                    type="button" onClick={handleAiFill} disabled={scanning}
                    className="h-10 rounded-2xl bg-mesh hover:opacity-95 text-white border-none text-xs font-semibold px-3 gap-1.5 shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> {scanning ? "Okunuyor..." : "AI ile Doldur"}
                  </Button>
                )}
              </div>
            </div>

            {/* Araç + Sürücü */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Araç</label>
                {lockVehicle ? (
                  <div className={`${inputCls} flex items-center text-muted-foreground bg-muted/30`}>
                    {lockedVehicle ? `${lockedVehicle.plate} — ${lockedVehicle.brand} ${lockedVehicle.model}` : "—"}
                  </div>
                ) : (
                  <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} className={inputCls}>
                    <option value="">Araç seçin</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sürücüye Yansıt <span className="normal-case font-normal">(isteğe bağlı)</span>
                </label>
                <select value={form.driverId} onChange={(e) => set("driverId", e.target.value)} className={inputCls}>
                  <option value="">Atanmadı</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">İhlal Türü</label>
                <input value={form.violationType} onChange={(e) => set("violationType", e.target.value)} placeholder="Örn: Hız İhlali" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tebligat No</label>
                <input value={form.fineNumber} onChange={(e) => set("fineNumber", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutar (₺)</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => handleAmountChange(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">İndirimli Tutar (₺)</label>
                  {discountedTouched && form.amount && (
                    <button type="button" onClick={resetDiscountedToAuto} className="text-[10px] font-semibold text-primary hover:underline">
                      Otomatiğe dön
                    </button>
                  )}
                </div>
                <input type="number" min="0" step="0.01" value={form.discountedAmount} onChange={(e) => handleDiscountedChange(e.target.value)} className={inputCls} />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {discountedTouched ? "Elle girildi" : "1/4 indirimli — otomatik hesaplandı"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ceza Tarihi</label>
                <input type="date" value={form.fineDate} onChange={(e) => set("fineDate", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Son Ödeme Tarihi</label>
                <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Konum <span className="normal-case font-normal">(isteğe bağlı)</span></label>
                <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Not <span className="normal-case font-normal">(isteğe bağlı)</span></label>
                <input value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} />
              </div>
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
