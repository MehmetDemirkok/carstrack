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
import { addVehicle, addVehicleDocument, uploadDocumentFile } from "@/lib/db";
import { useDemoGuard } from "@/hooks/use-demo-guard";
import type { FuelType, TransmissionType, TireSeasonType, OwnershipType, Vehicle } from "@/lib/types";
import { ChevronLeft, ChevronRight, Car, Fuel, Disc3, Shield, ShieldCheck, CheckCircle2, Camera, Info, ChevronDown, Sparkles, FileText, XCircle, Upload } from "lucide-react";
import { useAuth } from "@/context/auth-context";
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

async function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = url;
  });
}

// ── Document scanning helpers ─────────────────────────────────

interface ExtractedDocData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: string;
  chassisNo?: string;
  color?: string;
  fuelType?: string;
  engineVolume?: string;
  mileage?: string;
  ruhsatSahibi?: string;
  insuranceCompany?: string;
  insuranceExpiry?: string;
  greenCardCompany?: string;
  greenCardExpiry?: string;
  inspectionExpiry?: string;
}

type DocKey = "ruhsat" | "trafik_sigortasi" | "kasko";

interface DocSlot {
  file: File | null;
  scanning: boolean;
  extracted: ExtractedDocData | null;
}

const DOC_SLOTS: { key: DocKey; label: string; Icon: React.FC<{ className?: string }>; desc: string }[] = [
  { key: "ruhsat",           label: "Araç Ruhsatı",     Icon: FileText,   desc: "Kimlik ve teknik bilgiler" },
  { key: "trafik_sigortasi", label: "Trafik Sigortası", Icon: Shield,     desc: "Zorunlu sigorta tarihleri" },
  { key: "kasko",            label: "Kasko Poliçesi",   Icon: ShieldCheck, desc: "Kasko bitiş tarihi" },
];

const DOC_TITLES: Record<DocKey, string> = {
  ruhsat:           "Araç Ruhsatı",
  trafik_sigortasi: "Trafik Sigortası Poliçesi",
  kasko:            "Kasko Poliçesi",
};

const SCAN_FIELD_LABELS: Record<string, string> = {
  plate: "Plaka",
  brand: "Marka",
  model: "Model",
  year: "Yıl",
  chassisNo: "Şasi No",
  color: "Renk",
  fuelType: "Yakıt",
  engineVolume: "Motor Hacmi",
  mileage: "Kilometre",
  ruhsatSahibi: "Ruhsat Sahibi",
  insuranceCompany: "Sigorta Şirketi",
  insuranceExpiry: "Sigorta Bitiş",
  greenCardCompany: "Yeşil Kart Şirketi",
  greenCardExpiry: "Yeşil Kart Bitiş",
  inspectionExpiry: "Muayene Bitiş",
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatScanValue(key: string, value: string): string {
  if ((key === "insuranceExpiry" || key === "greenCardExpiry" || key === "inspectionExpiry") && value.includes("-")) {
    return value.split("-").reverse().join(".");
  }
  return value;
}

// ─────────────────────────────────────────────────────────────

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
  { id: 1, title: "Belgeler", icon: Shield },
  { id: 2, title: "Kimlik", icon: Car },
  { id: 3, title: "Teknik", icon: Fuel },
  { id: 4, title: "Lastik & Akü", icon: Disc3 },
];

interface FormData {
  ownershipType: OwnershipType;
  rentCompany: string;
  ruhsatSahibi: string;
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
  ownershipType: "ozmal", rentCompany: "", ruhsatSahibi: "",
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

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Document scan state — multi-doc
  const initDocSlots = (): Record<DocKey, DocSlot> => ({
    ruhsat:           { file: null, scanning: false, extracted: null },
    trafik_sigortasi: { file: null, scanning: false, extracted: null },
    kasko:            { file: null, scanning: false, extracted: null },
  });
  const [scanDocs, setScanDocs] = useState<Record<DocKey, DocSlot>>(initDocSlots);
  const [mergedExtracted, setMergedExtracted] = useState<ExtractedDocData | null>(null);
  const [docsApplied, setDocsApplied] = useState(false);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const parseKm = (value: string) =>
    parseInt(value.replace(/\./g, "").replace(/,/g, ""), 10) || 0;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const compressed = await compressImage(file);
    set("image", compressed);
    // Dik çekilen fotoğraf uyarısı
    const img = new Image();
    img.onload = () => {
      if (img.height > img.width) {
        toast.warning("Telefonunuzu yan tutun", {
          description: "Araç fotoğraflarını yatay (landscape) modda çekmenizi öneririz — kart görünümünde çok daha iyi görünür.",
          duration: 6000,
        });
      }
    };
    img.src = compressed;
  };

  const [error, setError] = useState<string>("");

  const SCAN_MAX = 5 * 1024 * 1024;
  const SCAN_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
  const SCAN_ALLOWED_EXTS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

  const handleDocFileSelect = (key: DocKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SCAN_ALLOWED_TYPES.includes(file.type) && !SCAN_ALLOWED_EXTS.includes(ext)) {
      toast.error("Desteklenmeyen dosya", { description: "PDF veya görsel (JPG, PNG, WebP) seçin." });
      return;
    }
    if (file.size > SCAN_MAX) {
      toast.error("Dosya çok büyük", { description: "Maks. 5 MB." });
      return;
    }
    setScanDocs(prev => ({ ...prev, [key]: { file, scanning: false, extracted: null } }));
    setMergedExtracted(null);
    setDocsApplied(false);
  };

  const handleScanAll = async () => {
    const toScan = (Object.entries(scanDocs) as [DocKey, DocSlot][]).filter(([, d]) => d.file && !d.extracted);
    if (toScan.length === 0) return;

    setScanDocs(prev => {
      const updated = { ...prev };
      toScan.forEach(([key]) => { updated[key] = { ...updated[key], scanning: true }; });
      return updated;
    });

    const results = await Promise.allSettled(
      toScan.map(async ([, doc]) => {
        const base64 = await fileToBase64(doc.file!);
        const mimeType = doc.file!.type || "application/octet-stream";
        const res = await fetch("/api/extract-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ fileData: base64, mimeType }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = await res.json() as { data: ExtractedDocData };
        return data ?? {};
      })
    );

    const extractedByKey: Partial<Record<DocKey, ExtractedDocData>> = {};
    toScan.forEach(([key], i) => {
      if (results[i].status === "fulfilled") {
        extractedByKey[key] = (results[i] as PromiseFulfilledResult<ExtractedDocData>).value;
      }
    });

    setScanDocs(prev => {
      const updated = { ...prev };
      toScan.forEach(([key]) => {
        updated[key] = { ...updated[key], scanning: false, extracted: extractedByKey[key] ?? null };
      });
      return updated;
    });

    // Merge: kasko < trafik_sigortasi < ruhsat (ruhsat has highest priority)
    const merged: ExtractedDocData = {};
    (["kasko", "trafik_sigortasi", "ruhsat"] as DocKey[]).forEach(key => {
      if (extractedByKey[key]) Object.assign(merged, extractedByKey[key]);
    });

    const failCount = results.filter(r => r.status === "rejected").length;
    if (failCount > 0) toast.warning(`${failCount} belge okunamadı`, { description: "Diğer belgeler tarandı." });

    if (Object.keys(merged).length === 0) {
      toast.warning("Bilgi bulunamadı", { description: "Belgelerden bilgi çıkarılamadı." });
      return;
    }

    setMergedExtracted(merged);
    const successCount = results.filter(r => r.status === "fulfilled").length;
    toast.success(`${successCount} belge tarandı`, { description: "Bulunan bilgileri inceleyip uygulayabilirsiniz." });
  };

  const handleApplyMerged = () => {
    if (!mergedExtracted) return;
    const updates: Partial<FormData> = {};
    if (mergedExtracted.plate) updates.plate = mergedExtracted.plate;
    if (mergedExtracted.brand) updates.brand = mergedExtracted.brand;
    if (mergedExtracted.model) updates.model = mergedExtracted.model;
    if (mergedExtracted.year) updates.year = mergedExtracted.year;
    if (mergedExtracted.color) updates.color = mergedExtracted.color;
    if (mergedExtracted.fuelType && FUEL_TYPES.includes(mergedExtracted.fuelType as FuelType))
      updates.fuelType = mergedExtracted.fuelType as FuelType;
    if (mergedExtracted.engineVolume) updates.engineVolume = mergedExtracted.engineVolume;
    if (mergedExtracted.mileage) updates.mileage = mergedExtracted.mileage;
    if (mergedExtracted.ruhsatSahibi) updates.ruhsatSahibi = mergedExtracted.ruhsatSahibi;
    if (mergedExtracted.insuranceCompany) updates.insuranceCompany = mergedExtracted.insuranceCompany;
    if (mergedExtracted.insuranceExpiry) updates.insuranceExpiry = mergedExtracted.insuranceExpiry;
    if (mergedExtracted.greenCardCompany) updates.greenCardCompany = mergedExtracted.greenCardCompany;
    if (mergedExtracted.greenCardExpiry) updates.greenCardExpiry = mergedExtracted.greenCardExpiry;
    if (mergedExtracted.inspectionExpiry) updates.inspectionExpiry = mergedExtracted.inspectionExpiry;

    setForm(prev => ({ ...prev, ...updates }));
    setMergedExtracted(null);
    setDocsApplied(true);

    toast.warning("Bilgileri kontrol edin", {
      description: "AI çıkarımı hatalı olabilir. Lütfen sonraki adımlarda alanları doğrulayın.",
      duration: 8000,
    });

    setStep(2);
  };

  const handleSubmit = async () => {
    if (guardDemo()) return;
    setSaving(true);
    setError("");
    const mileage = parseKm(form.mileage);
    const maintenanceItems = MAINTENANCE_TEMPLATES.map((t) => ({ ...t }));

    const data: Omit<Vehicle, "id" | "createdAt" | "updatedAt"> = {
      ownershipType: form.ownershipType,
      rentCompany: form.rentCompany,
      ruhsatSahibi: form.ruhsatSahibi,
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
      const vehicle = await addVehicle(data);

      // Upload any scanned documents into the vehicle's document library
      const docEntries = (Object.entries(scanDocs) as [DocKey, DocSlot][]).filter(([, d]) => d.file);
      if (docEntries.length > 0) {
        await Promise.allSettled(
          docEntries.map(async ([key, doc]) => {
            const uploaded = await uploadDocumentFile(vehicle.id, doc.file!);
            const expiry =
              key === "trafik_sigortasi" ? (form.insuranceExpiry || undefined) :
              key === "kasko"            ? (form.greenCardExpiry  || undefined) :
              undefined;
            await addVehicleDocument({
              companyId: company?.id ?? "",
              vehicleId: vehicle.id,
              type: key,
              title: DOC_TITLES[key],
              filePath: uploaded.filePath,
              fileName: uploaded.fileName,
              fileSize: uploaded.fileSize,
              mimeType: uploaded.mimeType,
              issueDate: undefined,
              expiryDate: expiry,
              notes: "",
            });
          })
        );
      }

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

  if (profile?.role === "user") {
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
            {/* ── STEP 1: BELGELER ── */}
            {step === 1 && (
              <>
              {/* AI belge tarayıcı */}
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-primary/15 rounded-lg shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Belge ile Otomatik Doldur</p>
                      <p className="text-[11px] text-muted-foreground">Ruhsat, sigorta veya kasko yükleyin — AI alanları doldursun</p>
                    </div>
                  </div>

                  {/* Applied summary */}
                  {docsApplied && !mergedExtracted && (
                    <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Belgeler uygulandı</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(Object.values(scanDocs) as DocSlot[]).filter(d => d.file).length} belge araç kaydedilince yüklenecek
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setDocsApplied(false); setScanDocs(initDocSlots()); setMergedExtracted(null); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        Sıfırla
                      </button>
                    </div>
                  )}

                  {/* Document slots */}
                  {!docsApplied && !mergedExtracted && (
                    <div className="space-y-2">
                      {DOC_SLOTS.map(({ key, label, Icon, desc }) => {
                        const slot = scanDocs[key];
                        return (
                          <div key={key} className="bg-background/60 rounded-xl border border-border/40 p-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${slot.extracted ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                                {slot.extracted
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  : <Icon className="h-4 w-4 text-primary" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold">{label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {slot.file ? slot.file.name : desc}
                                </p>
                              </div>
                              {slot.scanning ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                  className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full shrink-0"
                                />
                              ) : slot.file ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <label className="cursor-pointer">
                                    <span className="text-[10px] text-muted-foreground border border-border/40 rounded-lg px-2 py-1 hover:bg-muted/40 transition-colors">
                                      Değiştir
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                                      className="hidden"
                                      onChange={(e) => handleDocFileSelect(key, e)}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setScanDocs(prev => ({ ...prev, [key]: { file: null, scanning: false, extracted: null } }))}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer shrink-0">
                                  <span className="text-[10px] text-primary font-semibold border border-primary/30 rounded-lg px-2.5 py-1 hover:bg-primary/10 transition-colors">
                                    Seç
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="hidden"
                                    onChange={(e) => handleDocFileSelect(key, e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Merged extracted results */}
                  {mergedExtracted && (
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Şu bilgiler bulundu:
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.entries(mergedExtracted) as [string, string][])
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k} className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 min-w-0">
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{SCAN_FIELD_LABELS[k] ?? k}</p>
                              <p className="text-xs font-semibold truncate">{formatScanValue(k, v)}</p>
                            </div>
                          ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl flex-1 text-xs"
                          onClick={() => setMergedExtracted(null)}
                        >
                          İptal
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl flex-1 gap-1.5 text-xs"
                          onClick={handleApplyMerged}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verileri Uygula
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Scan button — only when files selected and no merged result yet */}
                  {!docsApplied && !mergedExtracted && (Object.values(scanDocs) as DocSlot[]).some(d => d.file && !d.extracted) && (
                    <Button
                      className="w-full rounded-xl gap-2"
                      onClick={handleScanAll}
                      disabled={(Object.values(scanDocs) as DocSlot[]).some(d => d.scanning)}
                    >
                      {(Object.values(scanDocs) as DocSlot[]).some(d => d.scanning) ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                            className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                          />
                          Belgeler okunuyor…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Belgeleri Tara ve Doldur
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

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
              </>
            )}

            {/* ── STEP 2: KİMLİK ── */}
            {step === 2 && (
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
                    <Field label="Ruhsat Sahibi">
                      <Input
                        className={cls}
                        placeholder="Ad Soyad veya Firma Adı"
                        value={form.ruhsatSahibi}
                        onChange={(e) => set("ruhsatSahibi", e.target.value)}
                      />
                    </Field>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.ownershipType === "kiralik"}
                        onChange={(e) => set("ownershipType", e.target.checked ? "kiralik" : "ozmal")}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="text-sm text-foreground">Kiralık araç</span>
                    </label>
                    {form.ownershipType === "kiralik" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Field label="Rent A Car Firması">
                          <Input
                            className={cls}
                            placeholder="Europcar, Avis, Sixt..."
                            value={form.rentCompany}
                            onChange={(e) => set("rentCompany", e.target.value)}
                          />
                        </Field>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>

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

            {/* ── STEP 3: TEKNİK ── */}
            {step === 3 && (
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

            {/* ── STEP 4: LASTİK & AKÜ ── */}
            {step === 4 && (
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
              disabled={step === 2 && (!form.plate || !form.brand || !form.model)}
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
