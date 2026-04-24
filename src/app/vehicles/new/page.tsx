"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addVehicle, MAINTENANCE_TEMPLATES } from "@/lib/store";
import type { FuelType, TransmissionType, TireSeasonType, Vehicle } from "@/lib/types";
import { ChevronLeft, ChevronRight, Car, Fuel, Disc3, BatteryCharging, Shield, Wrench, CheckCircle2, Camera } from "lucide-react";

const BRANDS = ["Audi","BMW","Chevrolet","Citroën","Dacia","Fiat","Ford","Honda","Hyundai","Kia","Mercedes-Benz","Nissan","Opel","Peugeot","Renault","Seat","Škoda","Tesla","Toyota","Volkswagen","Volvo","Diğer"];
const FUEL_TYPES: FuelType[] = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
const TRANSMISSIONS: TransmissionType[] = ["Manuel", "Otomatik", "CVT", "DSG", "Yarı Otomatik"];
const TIRE_SEASONS: TireSeasonType[] = ["Yazlık", "Kışlık", "Dört Mevsim"];
const COLORS = ["Beyaz","Siyah","Gri","Gümüş","Kırmızı","Mavi","Yeşil","Kahverengi","Bej","Sarı","Turuncu","Mor","Diğer"];

const steps = [
  { id: 1, title: "Kimlik", icon: Car },
  { id: 2, title: "Teknik", icon: Fuel },
  { id: 3, title: "Lastik & Akü", icon: Disc3 },
  { id: 4, title: "Belgeler", icon: Shield },
  { id: 5, title: "Bakım", icon: Wrench },
];

interface FormData {
  image: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  engineType: string;
  engineVolume: string;
  power: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  chassisNo: string;
  tireStatus: TireSeasonType;
  tireBrand: string;
  tireSize: string;
  tireInstallDate: string;
  tireMileage: string;
  batteryBrand: string;
  batteryCapacity: string;
  batteryInstallDate: string;
  insuranceCompany: string;
  insuranceExpiry: string;
  inspectionExpiry: string;
  lastServiceDate: string;
  lastServiceMileage: string;
  notes: string;
  maintenanceDates: Record<string, string>;
  maintenanceMileages: Record<string, string>;
}

const defaultForm: FormData = {
  image: "", plate: "", brand: "", model: "", year: String(new Date().getFullYear()),
  color: "Beyaz", mileage: "", engineType: "", engineVolume: "", power: "",
  fuelType: "Benzin", transmission: "Otomatik", chassisNo: "",
  tireStatus: "Yazlık", tireBrand: "", tireSize: "", tireInstallDate: "", tireMileage: "0",
  batteryBrand: "", batteryCapacity: "", batteryInstallDate: "",
  insuranceCompany: "", insuranceExpiry: "", inspectionExpiry: "",
  lastServiceDate: "", lastServiceMileage: "0", notes: "",
  maintenanceDates: {}, maintenanceMileages: {},
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function NewVehiclePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setMaintDate = (id: string, value: string) =>
    setForm((prev) => ({ ...prev, maintenanceDates: { ...prev.maintenanceDates, [id]: value } }));

  const setMaintKm = (id: string, value: string) =>
    setForm((prev) => ({ ...prev, maintenanceMileages: { ...prev.maintenanceMileages, [id]: value } }));

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => set("image", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const mileage = parseInt(form.mileage) || 0;
    const maintenanceItems = MAINTENANCE_TEMPLATES.map((t) => ({
      ...t,
      lastDoneDate: form.maintenanceDates[t.id] || undefined,
      lastDoneMileage: form.maintenanceMileages[t.id] ? parseInt(form.maintenanceMileages[t.id]) : undefined,
    }));

    const data: Omit<Vehicle, "id" | "createdAt" | "updatedAt"> = {
      image: form.image,
      plate: form.plate.toUpperCase(),
      brand: form.brand,
      model: form.model,
      year: parseInt(form.year) || new Date().getFullYear(),
      color: form.color,
      mileage,
      engineType: form.engineType,
      engineVolume: form.engineVolume,
      power: form.power,
      fuelType: form.fuelType,
      transmission: form.transmission,
      chassisNo: form.chassisNo,
      tireStatus: form.tireStatus,
      tireBrand: form.tireBrand,
      tireSize: form.tireSize,
      tireInstallDate: form.tireInstallDate,
      tireMileage: parseInt(form.tireMileage) || 0,
      batteryBrand: form.batteryBrand,
      batteryCapacity: form.batteryCapacity,
      batteryInstallDate: form.batteryInstallDate,
      insuranceCompany: form.insuranceCompany,
      insuranceExpiry: form.insuranceExpiry,
      inspectionExpiry: form.inspectionExpiry,
      lastServiceDate: form.lastServiceDate,
      lastServiceMileage: parseInt(form.lastServiceMileage) || 0,
      nextServiceMileage: (parseInt(form.lastServiceMileage) || 0) + 10000,
      maintenanceItems,
      notes: form.notes,
    };

    addVehicle(data);
    setSaving(false);
    setDone(true);
    setTimeout(() => router.push("/vehicles"), 1400);
  };

  const cls = "rounded-xl h-11 bg-muted/30 border-border/40 text-sm focus-visible:ring-primary/30";

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl font-outfit font-bold">Araç Eklendi!</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-muted-foreground mt-2">Yönlendiriliyorsunuz…</motion.p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="flex items-center justify-between p-3 px-4 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={step === 1 ? () => router.back() : () => setStep((s) => s - 1)} className="rounded-full h-9 w-9 hover:bg-primary/10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-outfit font-bold text-sm">Yeni Araç — Adım {step}/{steps.length}</span>
          <div className="w-9" />
        </div>
        {/* Progress */}
        <div className="h-1 bg-muted mx-0">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(step / steps.length) * 100}%` }} transition={{ ease: "easeInOut" }} />
        </div>
        {/* Step icons */}
        <div className="flex justify-around items-center py-2 px-4 max-w-2xl mx-auto">
          {steps.map((s) => (
            <button key={s.id} onClick={() => s.id < step && setStep(s.id)} className={`flex flex-col items-center gap-0.5 transition-colors ${s.id <= step ? "text-primary" : "text-muted-foreground/40"}`}>
              <s.icon className="h-4 w-4" />
              <span className="text-[9px] font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* ── STEP 1: KİMLİK ── */}
            {step === 1 && (
              <>
                {/* Image upload */}
                <div>
                  <label className="block cursor-pointer">
                    <div className={`relative h-44 rounded-2xl border-2 border-dashed border-border/50 overflow-hidden bg-muted/30 flex items-center justify-center hover:border-primary/50 transition-colors ${form.image ? "border-transparent" : ""}`}>
                      {form.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.image} alt="Araç" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Camera className="h-8 w-8" />
                          <span className="text-sm font-medium">Araç fotoğrafı ekle</span>
                          <span className="text-xs">Opsiyonel</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <Field label="Plaka" required>
                      <Input className={cls} placeholder="34 ABC 123" value={form.plate} onChange={(e) => set("plate", e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Marka" required>
                        <Select value={form.brand} onValueChange={(v) => v && set("brand", v)}>
                          <SelectTrigger className={cls}><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                          <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                      <Field label="Model" required>
                        <Input className={cls} placeholder="320i, Corolla..." value={form.model} onChange={(e) => set("model", e.target.value)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Yıl" required>
                        <Input className={cls} type="number" placeholder="2024" value={form.year} onChange={(e) => set("year", e.target.value)} />
                      </Field>
                      <Field label="Renk">
                        <Select value={form.color} onValueChange={(v) => v && set("color", v)}>
                          <SelectTrigger className={cls}><SelectValue /></SelectTrigger>
                          <SelectContent>{COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── STEP 2: TEKNİK ── */}
            {step === 2 && (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="p-4 space-y-4">
                  <Field label="Kilometre">
                    <Input className={cls} type="number" placeholder="45000" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Motor Kodu">
                      <Input className={cls} placeholder="B48B20" value={form.engineType} onChange={(e) => set("engineType", e.target.value)} />
                    </Field>
                    <Field label="Hacim (L)">
                      <Input className={cls} placeholder="2.0" value={form.engineVolume} onChange={(e) => set("engineVolume", e.target.value)} />
                    </Field>
                    <Field label="Güç (HP)">
                      <Input className={cls} type="number" placeholder="184" value={form.power} onChange={(e) => set("power", e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Yakıt Tipi">
                      <Select value={form.fuelType} onValueChange={(v) => v && set("fuelType", v as FuelType)}>
                        <SelectTrigger className={cls}><SelectValue /></SelectTrigger>
                        <SelectContent>{FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Vites">
                      <Select value={form.transmission} onValueChange={(v) => v && set("transmission", v as TransmissionType)}>
                        <SelectTrigger className={cls}><SelectValue /></SelectTrigger>
                        <SelectContent>{TRANSMISSIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Şasi Numarası">
                    <Input className={cls} placeholder="WBA3X5C50EF123456" value={form.chassisNo} onChange={(e) => set("chassisNo", e.target.value)} />
                  </Field>
                </CardContent>
              </Card>
            )}

            {/* ── STEP 3: LASTİK & AKÜ ── */}
            {step === 3 && (
              <div className="space-y-4">
                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lastik Bilgileri</h3>
                    <Field label="Lastik Mevsimi">
                      <Select value={form.tireStatus} onValueChange={(v) => v && set("tireStatus", v as TireSeasonType)}>
                        <SelectTrigger className={cls}><SelectValue /></SelectTrigger>
                        <SelectContent>{TIRE_SEASONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Lastik Markası">
                        <Input className={cls} placeholder="Michelin" value={form.tireBrand} onChange={(e) => set("tireBrand", e.target.value)} />
                      </Field>
                      <Field label="Lastik Ebatı">
                        <Input className={cls} placeholder="225/45 R17" value={form.tireSize} onChange={(e) => set("tireSize", e.target.value)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Takılma Tarihi">
                        <Input className={cls} type="date" value={form.tireInstallDate} onChange={(e) => set("tireInstallDate", e.target.value)} />
                      </Field>
                      <Field label="Takıldığındaki km">
                        <Input className={cls} type="number" placeholder="0" value={form.tireMileage} onChange={(e) => set("tireMileage", e.target.value)} />
                      </Field>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Akü Bilgileri</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Akü Markası">
                        <Input className={cls} placeholder="Bosch" value={form.batteryBrand} onChange={(e) => set("batteryBrand", e.target.value)} />
                      </Field>
                      <Field label="Kapasite">
                        <Input className={cls} placeholder="72Ah" value={form.batteryCapacity} onChange={(e) => set("batteryCapacity", e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Değişim Tarihi">
                      <Input className={cls} type="date" value={form.batteryInstallDate} onChange={(e) => set("batteryInstallDate", e.target.value)} />
                    </Field>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── STEP 4: BELGELER ── */}
            {step === 4 && (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="p-4 space-y-4">
                  <Field label="Sigorta Şirketi">
                    <Input className={cls} placeholder="Allianz, Axa..." value={form.insuranceCompany} onChange={(e) => set("insuranceCompany", e.target.value)} />
                  </Field>
                  <Field label="Sigorta Bitiş Tarihi">
                    <Input className={cls} type="date" value={form.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} />
                  </Field>
                  <Field label="TÜVTÜRK Muayene Bitiş">
                    <Input className={cls} type="date" value={form.inspectionExpiry} onChange={(e) => set("inspectionExpiry", e.target.value)} />
                  </Field>
                  <div className="h-px bg-border/40" />
                  <Field label="Son Servis Tarihi">
                    <Input className={cls} type="date" value={form.lastServiceDate} onChange={(e) => set("lastServiceDate", e.target.value)} />
                  </Field>
                  <Field label="Son Servisteki km">
                    <Input className={cls} type="number" placeholder="0" value={form.lastServiceMileage} onChange={(e) => set("lastServiceMileage", e.target.value)} />
                  </Field>
                  <Field label="Notlar">
                    <textarea
                      className="w-full rounded-xl bg-muted/30 border border-border/40 text-sm p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      placeholder="Araç hakkında notlar..."
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                    />
                  </Field>
                </CardContent>
              </Card>
            )}

            {/* ── STEP 5: BAKIM ── */}
            {step === 5 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground px-1">Her bakım kalemi için en son yapılma tarihini ve km'sini girin (opsiyonel).</p>
                {MAINTENANCE_TEMPLATES.map((t) => (
                  <Card key={t.id} className="rounded-2xl border-border/40">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.intervalKm ? `${(t.intervalKm / 1000).toFixed(0)}K km` : ""}
                          {t.intervalKm && t.intervalMonths ? " / " : ""}
                          {t.intervalMonths ? `${t.intervalMonths} ay` : ""}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Son Yapılma Tarihi">
                          <Input className="rounded-xl h-10 bg-muted/30 border-border/40 text-sm" type="date" value={form.maintenanceDates[t.id] || ""} onChange={(e) => setMaintDate(t.id, e.target.value)} />
                        </Field>
                        {t.intervalKm && (
                          <Field label="Son Yapılma km">
                            <Input className="rounded-xl h-10 bg-muted/30 border-border/40 text-sm" type="number" placeholder="0" value={form.maintenanceMileages[t.id] || ""} onChange={(e) => setMaintKm(t.id, e.target.value)} />
                          </Field>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 glass border-t border-border/30">
        <div className="max-w-2xl mx-auto">
          {step < steps.length ? (
            <Button
              className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20 gap-2"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && (!form.plate || !form.brand || !form.model)}
            >
              Devam <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20 gap-2"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Aracı Kaydet</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
