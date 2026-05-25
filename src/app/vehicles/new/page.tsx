"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAINTENANCE_TEMPLATES } from "@/lib/store";
import { addVehicle } from "@/lib/db";
import { useDemoGuard } from "@/hooks/use-demo-guard";
import type { FuelType, TransmissionType, TireSeasonType, Vehicle } from "@/lib/types";
import { ChevronLeft, ChevronRight, Car, Fuel, Disc3, BatteryCharging, Shield, ShieldCheck, CheckCircle2, Camera, Info, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getVehicles } from "@/lib/db";
import { canAddVehicle } from "@/lib/plans";
import { UpgradeModal } from "@/components/upgrade-modal";
import { DatePicker } from "@/components/ui/date-picker";

const BRANDS = ["Audi","BMW","Chevrolet","Citroën","Dacia","Fiat","Ford","Honda","Hyundai","Kia","Mercedes-Benz","Nissan","Opel","Peugeot","Renault","Seat","Škoda","Tesla","Toyota","Volkswagen","Volvo","Diğer"];
const MODELS: Record<string, string[]> = {
  "Audi":          ["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q5","Q7","Q8","TT","R8","e-tron","e-tron GT","RS3","RS4","RS5","RS6","RS7"],
  "BMW":           ["116i","118i","120i","M135i","218i","220i","M240i","316i","318i","320i","320d","330i","M3","418i","420i","430i","M4","520i","530i","540i","M5","730i","740i","X1","X2","X3","X4","X5","X6","X7","Z4","i3","i4","i5","i7","iX"],
  "Chevrolet":     ["Spark","Aveo","Cruze","Malibu","Camaro","Corvette","Equinox","Trax","Traverse","Suburban","Tahoe","Silverado"],
  "Citroën":       ["C1","C3","C3 Aircross","C4","C4 X","C5","C5 Aircross","C5 X","Berlingo","SpaceTourer","Jumpy","ë-C4"],
  "Dacia":         ["Sandero","Sandero Stepway","Logan","Logan MCV","Duster","Dokker","Lodgy","Spring","Jogger","Bigster"],
  "Fiat":          ["500","500C","500X","500e","Panda","Punto","Tipo","Tipo Cross","Egea","Egea Cross","Doblo","Fiorino","Ducato"],
  "Ford":          ["Fiesta","Focus","Mondeo","Mustang","Mustang Mach-E","Puma","Kuga","Explorer","Edge","Ranger","Transit","Transit Connect","Transit Courier","EcoSport","Galaxy","S-Max"],
  "Honda":         ["Jazz","Civic","Civic Type R","Accord","HR-V","CR-V","e","ZR-V","Pilot","Ridgeline","e:Ny1"],
  "Hyundai":       ["i10","i20","i30","i30 N","Elantra","Sonata","Tucson","Santa Fe","Kona","Venue","Ioniq","Ioniq 5","Ioniq 6","Bayon","Nexo"],
  "Kia":           ["Picanto","Rio","Ceed","Ceed SW","ProCeed","Cerato","Stinger","Sportage","Sorento","Niro","EV6","EV9","XCeed"],
  "Mercedes-Benz": ["A 180","A 200","A 250","B 180","B 200","C 180","C 200","C 220d","C 300","E 200","E 220d","E 300","S 400","S 450","GLA 200","GLA 250","GLB 200","GLC 200","GLC 300","GLE 300d","GLE 350","GLS 400","CLA 200","CLA 250","CLS 300","AMG GT","EQA","EQB","EQC","EQE","EQS","Vito","Sprinter"],
  "Nissan":        ["Micra","Note","Leaf","Juke","Qashqai","X-Trail","Ariya","Navara","NV200","Pulsar","Patrol"],
  "Opel":          ["Corsa","Corsa-e","Astra","Astra Sports Tourer","Insignia","Grandland","Grandland X","Crossland","Mokka","Zafira","Combo","Vivaro"],
  "Peugeot":       ["108","208","308","308 SW","408","508","508 SW","2008","3008","5008","Rifter","Partner","Traveller","Expert","e-208","e-2008"],
  "Renault":       ["Clio","Megane","Megane E-Tech","Laguna","Fluence","Symbol","Zoe","Captur","Kadjar","Koleos","Trafic","Master","Arkana","Austral","Espace"],
  "Seat":          ["Ibiza","Leon","Leon ST","Arona","Ateca","Tarraco","Cupra Born","Cupra Formentor","Cupra Leon"],
  "Škoda":         ["Fabia","Scala","Octavia","Octavia Combi","Superb","Superb Combi","Kamiq","Karoq","Kodiaq","Enyaq","Citigo"],
  "Tesla":         ["Model 3","Model S","Model X","Model Y","Cybertruck"],
  "Toyota":        ["Aygo","Aygo X","Yaris","Yaris Cross","Corolla","Corolla Cross","Camry","C-HR","RAV4","Prius","Land Cruiser","Hilux","HiAce","bZ4X","Proace"],
  "Volkswagen":    ["Polo","Golf","Golf Variant","Passat","Passat Variant","Arteon","T-Cross","T-Roc","Tiguan","Touareg","ID.3","ID.4","ID.5","ID.7","Caddy","Transporter","Amarok"],
  "Volvo":         ["S60","S90","V60","V60 Cross Country","V90","V90 Cross Country","XC40","XC60","XC90","C40 Recharge","EX30","EX90"],
};
const FUEL_TYPES: FuelType[] = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
const TRANSMISSIONS: TransmissionType[] = ["Manuel", "Otomatik", "CVT", "DSG", "Yarı Otomatik"];
const TIRE_SEASONS: TireSeasonType[] = ["Yazlık", "Kışlık", "Dört Mevsim"];
const COLORS = ["Beyaz","Siyah","Gri","Gümüş","Kırmızı","Mavi","Yeşil","Kahverengi","Bej","Sarı","Turuncu","Mor","Diğer"];

function AutocompleteInput({
  options, value, onChange, placeholder, className, allowFreeText = false,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  allowFreeText?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [activeIdx, setActiveIdx] = useState(-1);

  const select = (opt: string) => { onChange(opt); setQuery(opt); setOpen(false); setActiveIdx(-1); };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          className={`${className} w-full pr-8 border px-3 outline-none`}
          onChange={(e) => {
            setQuery(e.target.value);
            if (allowFreeText) onChange(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => {
              if (!allowFreeText) {
                const match = options.find(o => o.toLowerCase() === query.toLowerCase());
                if (match) { onChange(match); setQuery(match); }
                else setQuery(value);
              }
            }, 150);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx(i => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && filtered.length > 0) {
              e.preventDefault();
              select(activeIdx >= 0 ? filtered[activeIdx] : filtered[0]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${i === activeIdx ? "bg-primary/10 text-primary" : opt === value ? "text-primary font-semibold hover:bg-muted" : "text-foreground hover:bg-muted"}`}
              onMouseDown={() => select(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const steps = [
  { id: 1, title: "Kimlik", icon: Car },
  { id: 2, title: "Teknik", icon: Fuel },
  { id: 3, title: "Lastik & Akü", icon: Disc3 },
  { id: 4, title: "Belgeler", icon: Shield },
];

interface FormData {
  image: string;
  imagePosition: number;
  imageZoom: number;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  engineVolume: string;
  fuelType: FuelType;
  transmission: TransmissionType;
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
  greenCardCompany: string;
  greenCardExpiry: string;
  inspectionExpiry: string;
  lastServiceDate: string;
  lastServiceMileage: string;
  notes: string;
}

const defaultForm: FormData = {
  image: "", imagePosition: 50, imageZoom: 100, plate: "", brand: "", model: "", year: String(new Date().getFullYear()),
  color: "Beyaz", mileage: "", engineVolume: "",
  fuelType: "Benzin", transmission: "Otomatik",
  tireStatus: "Yazlık", tireBrand: "", tireSize: "", tireInstallDate: "", tireMileage: "0",
  batteryBrand: "", batteryCapacity: "", batteryInstallDate: "",
  insuranceCompany: "", insuranceExpiry: "", greenCardCompany: "", greenCardExpiry: "", inspectionExpiry: "",
  lastServiceDate: "", lastServiceMileage: "0", notes: "",
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
  const guardDemo = useDemoGuard();
  const { company, profile } = useAuth();

  const limitChecked = useRef(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Sayfa açılınca limit kontrolü yap (tek seferlik)
  useEffect(() => {
    if (!company || limitChecked.current) return;
    limitChecked.current = true;
    let active = true;
    getVehicles().then((vehicles) => {
      if (!active) return;
      if (!canAddVehicle(company.plan ?? "free", vehicles.length)) {
        setShowUpgrade(true);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [company]);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const parseKm = (value: string) =>
    parseInt(value.replace(/\./g, "").replace(/,/g, ""), 10) || 0;

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => set("image", reader.result as string);
    reader.readAsDataURL(file);
  };

  const [error, setError] = useState<string>("");

  const handleSubmit = async () => {
    if (guardDemo()) return;
    setSaving(true);
    setError("");
    const mileage = parseKm(form.mileage);
    const maintenanceItems = MAINTENANCE_TEMPLATES.map((t) => ({ ...t }));

    const data: Omit<Vehicle, "id" | "createdAt" | "updatedAt"> = {
      image: form.image,
      imagePosition: form.imagePosition,
      imageZoom: form.imageZoom,
      plate: form.plate.toUpperCase(),
      brand: form.brand,
      model: form.model,
      year: parseInt(form.year) || new Date().getFullYear(),
      color: form.color,
      mileage,
      engineType: "",
      engineVolume: form.engineVolume,
      power: "",
      fuelType: form.fuelType,
      transmission: form.transmission,
      chassisNo: "",
      tireStatus: form.tireStatus,
      tireBrand: form.tireBrand,
      tireSize: form.tireSize,
      tireInstallDate: form.tireInstallDate,
      tireMileage: parseKm(form.tireMileage),
      batteryBrand: form.batteryBrand,
      batteryCapacity: form.batteryCapacity,
      batteryInstallDate: form.batteryInstallDate,
      insuranceCompany: form.insuranceCompany,
      insuranceExpiry: form.insuranceExpiry,
      greenCardCompany: form.greenCardCompany,
      greenCardExpiry: form.greenCardExpiry,
      inspectionExpiry: form.inspectionExpiry,
      lastServiceDate: form.lastServiceDate,
      lastServiceMileage: parseKm(form.lastServiceMileage),
      nextServiceMileage: parseKm(form.lastServiceMileage) + 10000,
      maintenanceItems,
      notes: form.notes,
    };

    try {
      await addVehicle(data);
      setSaving(false);
      setDone(true);
      toast.success("Araç Eklendi", { description: "Araç başarıyla eklendi, yönlendiriliyorsunuz." });
      setTimeout(() => router.push("/vehicles"), 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Araç eklenirken bir hata oluştu.";
      console.error("Vehicle add error:", err);
      setError(msg);
      toast.error("Hata", { description: msg });
      setSaving(false);
    }
  };

  const cls = "rounded-xl h-11 bg-muted/30 border-border/40 text-sm focus-visible:ring-primary/30";

  if (profile?.role === "driver") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-destructive" />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-xl font-outfit font-bold">
          Yetkiniz Yok
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm text-muted-foreground mt-2 max-w-xs">
          Araç eklemek için şirket yetkilisi iznine ihtiyacınız var. Lütfen şirketinizin yetkilisiyle iletişime geçin.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => router.back()}>
            Geri Dön
          </Button>
        </motion.div>
      </div>
    );
  }

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
    <>
    <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="vehicle" />
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

      <div className="max-w-2xl mx-auto p-4 pb-[160px] md:pb-32">
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
                <div className="space-y-2">
                  <label className="block cursor-pointer">
                    <div className={`relative h-44 rounded-2xl border-2 border-dashed border-border/50 overflow-hidden bg-muted/30 flex items-center justify-center hover:border-primary/50 transition-colors ${form.image ? "border-transparent" : ""}`}>
                      {form.image ? (
                        <>
                          <div
                            className="absolute inset-0 scale-110"
                            style={{
                              backgroundImage: `url(${form.image})`,
                              backgroundSize: "cover",
                              backgroundPosition: `center ${form.imagePosition}%`,
                              filter: "blur(14px) brightness(0.55) saturate(1.4)",
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `url(${form.image})`,
                              backgroundSize: "contain",
                              backgroundPosition: `center ${form.imagePosition}%`,
                              backgroundRepeat: "no-repeat",
                            }}
                          />
                        </>
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
                  {form.image && (
                    <div className="space-y-1.5 px-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">Üst</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={form.imagePosition}
                          onChange={(e) => setForm((prev) => ({ ...prev, imagePosition: Number(e.target.value) }))}
                          className="flex-1 accent-primary cursor-pointer"
                        />
                        <span className="text-[10px] text-muted-foreground w-12 shrink-0">Alt</span>
                      </div>
                    </div>
                  )}
                </div>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <Field label="Plaka" required>
                      <Input className={cls} placeholder="34 ABC 123" value={form.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Marka" required>
                        <AutocompleteInput
                          options={BRANDS}
                          value={form.brand}
                          onChange={(v) => set("brand", v)}
                          placeholder="BMW, Toyota..."
                          className={cls}
                        />
                      </Field>
                      <Field label="Model" required>
                        <AutocompleteInput
                          options={MODELS[form.brand] ?? []}
                          value={form.model}
                          onChange={(v) => set("model", v)}
                          placeholder="320i, Corolla..."
                          className={cls}
                          allowFreeText
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Yıl" required>
                        <Input className={cls} type="number" placeholder="2024" value={form.year} onChange={(e) => set("year", e.target.value)} />
                      </Field>
                      <Field label="Renk">
                        <AutocompleteInput
                          options={COLORS}
                          value={form.color}
                          onChange={(v) => set("color", v)}
                          placeholder="Beyaz, Siyah..."
                          className={cls}
                          allowFreeText
                        />
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
                    <Input className={cls} type="text" inputMode="numeric" placeholder="45000" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} />
                  </Field>
                  <Field label="Motor Hacmi (L)">
                    <Input className={cls} placeholder="2.0" value={form.engineVolume} onChange={(e) => set("engineVolume", e.target.value)} />
                  </Field>
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
                        <DatePicker value={form.tireInstallDate} onChange={(v) => set("tireInstallDate", v)} />
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
                    {/* Battery replacement info note */}
                    <div className="flex gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                      <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Ortalama Akü Ömrü</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Standart kurşun-asit akülerin ömrü genellikle <span className="font-semibold text-foreground">3–5 yıl</span> ya da <span className="font-semibold text-foreground">60.000–100.000 km</span>{'\''}dir. Sıcak iklimler ve kısa mesafe kullanımı ömrü kısaltabilir.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Akü Markası">
                        <Input className={cls} placeholder="Bosch" value={form.batteryBrand} onChange={(e) => set("batteryBrand", e.target.value)} />
                      </Field>
                      <Field label="Kapasite">
                        <Input className={cls} placeholder="72Ah" value={form.batteryCapacity} onChange={(e) => set("batteryCapacity", e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Değişim Tarihi">
                      <DatePicker value={form.batteryInstallDate} onChange={(v) => set("batteryInstallDate", v)} />
                    </Field>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── STEP 4: BELGELER ── */}
            {step === 4 && (
              <Card className="rounded-2xl border-border/40">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zorunlu Mali Sorumluluk Sigortası</h3>
                  <Field label="Sigorta Şirketi">
                    <Input className={cls} placeholder="Allianz, Axa..." value={form.insuranceCompany} onChange={(e) => set("insuranceCompany", e.target.value)} />
                  </Field>
                  <Field label="Sigorta Bitiş Tarihi">
                    <DatePicker value={form.insuranceExpiry} onChange={(v) => set("insuranceExpiry", v)} />
                  </Field>
                  <div className="h-px bg-border/40" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yurtdışı Sigortası (Yeşil Kart)</h3>
                  <Field label="Sigorta Şirketi">
                    <Input className={cls} placeholder="Allianz, Axa..." value={form.greenCardCompany} onChange={(e) => set("greenCardCompany", e.target.value)} />
                  </Field>
                  <Field label="Yeşil Kart Bitiş Tarihi">
                    <DatePicker value={form.greenCardExpiry} onChange={(v) => set("greenCardExpiry", v)} />
                  </Field>
                  <div className="h-px bg-border/40" />
                  <Field label="TÜVTÜRK Muayene Bitiş">
                    <DatePicker value={form.inspectionExpiry} onChange={(v) => set("inspectionExpiry", v)} />
                  </Field>
                  <div className="h-px bg-border/40" />
                  <Field label="Son Servis Tarihi">
                    <DatePicker value={form.lastServiceDate} onChange={(v) => set("lastServiceDate", v)} />
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

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-above-nav left-0 right-0 z-50 p-4 glass border-t border-border/30">
        <div className="max-w-2xl mx-auto space-y-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive text-center">
              {error}
            </div>
          )}
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
    </>
  );
}
