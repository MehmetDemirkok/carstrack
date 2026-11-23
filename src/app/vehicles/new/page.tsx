"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getMaintenanceTemplates, applyPeriodicService, MAINTENANCE_TEMPLATES } from "@/lib/store";
import { addVehicle, addVehicleDocument, uploadDocumentFile, getDrivers, assignVehiclesToDriver } from "@/lib/db";
import type { FuelType, TransmissionType, TireSeasonType, OwnershipType, Vehicle } from "@/lib/types";
import { isDriverRole } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, Car, Disc3, Shield, ShieldCheck, CheckCircle2, Camera, Info, ChevronDown,
  Sparkles, FileText, XCircle, FileSpreadsheet, Wrench, AlertTriangle, UserPlus, Plus, Loader2, Circle,
  ScanLine, Paperclip, CalendarCheck,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useData } from "@/context/data-context";
import { DatePicker } from "@/components/ui/date-picker";
import { ImagePositioner } from "@/components/ui/image-positioner";
import { fileToBase64, SCAN_MAX_FILE_SIZE, SCAN_ALLOWED_TYPES, SCAN_ALLOWED_EXTS } from "@/lib/file-utils";
import { compressImage } from "@/lib/image";

const MODELS: Record<string, string[]> = {
  "Alfa Romeo":    ["Giulia","Stelvio","Tonale","Junior"],
  "Audi":          ["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q5","Q7","Q8","TT","R8","e-tron","e-tron GT","RS3","RS4","RS5","RS6","RS7"],
  "BMW":           ["116i","118i","120i","M135i","218i","220i","M240i","316i","318i","320i","320d","330i","M3","418i","420i","430i","M4","520i","530i","540i","M5","730i","740i","X1","X2","X3","X4","X5","X6","X7","Z4","i3","i4","i5","i7","iX"],
  "BYD":           ["Atto 2","Atto 3","Dolphin","Seal","Seal U","Seal U DM-i","Han","Tang","Sealion 7"],
  "Chery":         ["Tiggo 4","Tiggo 7","Tiggo 8","Omoda 5","Omoda E5"],
  "Chevrolet":     ["Spark","Aveo","Cruze","Malibu","Camaro","Corvette","Equinox","Trax","Traverse","Suburban","Tahoe","Silverado"],
  "Citroën":       ["C1","C3","C3 Aircross","C4","C4 X","C5","C5 Aircross","C5 X","Berlingo","SpaceTourer","Jumpy","Jumper","ë-C4"],
  "Cupra":         ["Born","Formentor","Leon","Ateca","Tavascan","Terramar"],
  "Dacia":         ["Sandero","Sandero Stepway","Logan","Logan MCV","Duster","Dokker","Lodgy","Spring","Jogger","Bigster"],
  "DS":            ["DS 3","DS 4","DS 7","DS 9"],
  "Fiat":          ["500","500C","500X","500e","Panda","Punto","Tipo","Tipo Cross","Egea","Egea Cross","Doblo","Fiorino","Ducato"],
  "Ford":          ["Fiesta","Focus","Mondeo","Mustang","Mustang Mach-E","Puma","Kuga","Explorer","Edge","Ranger","Transit","Transit Custom","Transit Connect","Transit Courier","Tourneo Courier","Tourneo Connect","Tourneo Custom","EcoSport","Galaxy","S-Max"],
  "Honda":         ["Jazz","Civic","Civic Type R","Accord","HR-V","CR-V","e","ZR-V","Pilot","Ridgeline","e:Ny1"],
  "Hyundai":       ["i10","i20","i30","i30 N","Elantra","Sonata","Tucson","Santa Fe","Kona","Venue","Ioniq","Ioniq 5","Ioniq 6","Bayon","Staria","Nexo"],
  "Isuzu":         ["D-Max","NPR","NLR","NQR","Novo","Turkuaz"],
  "Iveco":         ["Daily","Eurocargo","S-Way"],
  "Jeep":          ["Renegade","Compass","Avenger","Wrangler","Grand Cherokee"],
  "Kia":           ["Picanto","Rio","Stonic","Ceed","Ceed SW","ProCeed","Cerato","Stinger","Sportage","Sorento","Niro","EV3","EV6","EV9","XCeed"],
  "Land Rover":    ["Defender","Discovery","Discovery Sport","Range Rover","Range Rover Sport","Range Rover Velar","Range Rover Evoque"],
  "Lexus":         ["UX","NX","RX","ES","LBX"],
  "Mazda":         ["2","3","6","CX-3","CX-30","CX-5","CX-60","MX-5"],
  "Mercedes-Benz": ["A 180","A 200","A 250","B 180","B 200","C 180","C 200","C 220d","C 300","E 200","E 220d","E 300","S 400","S 450","GLA 200","GLA 250","GLB 200","GLC 200","GLC 300","GLE 300d","GLE 350","GLS 400","CLA 200","CLA 250","CLS 300","AMG GT","EQA","EQB","EQC","EQE","EQS","Citan","Vito","V-Class","Sprinter"],
  "MG":            ["MG3","MG4","MG5","ZS","ZS EV","HS","Marvel R","Cyberster"],
  "Mini":          ["Cooper","Countryman","Clubman","Aceman"],
  "Mitsubishi":    ["Space Star","ASX","Eclipse Cross","Outlander","L200"],
  "Nissan":        ["Micra","Note","Leaf","Juke","Qashqai","X-Trail","Ariya","Navara","NV200","Pulsar","Patrol"],
  "Opel":          ["Corsa","Corsa-e","Astra","Astra Sports Tourer","Insignia","Grandland","Grandland X","Crossland","Frontera","Mokka","Zafira","Combo","Vivaro","Movano"],
  "Peugeot":       ["108","208","308","308 SW","408","508","508 SW","2008","3008","5008","Rifter","Partner","Traveller","Expert","Boxer","e-208","e-2008"],
  "Porsche":       ["911","718","Macan","Cayenne","Panamera","Taycan"],
  "Renault":       ["Clio","Megane","Megane E-Tech","Laguna","Fluence","Symbol","Taliant","Zoe","Captur","Kadjar","Koleos","Kangoo","Trafic","Master","Arkana","Austral","Espace","Rafale"],
  "Seat":          ["Ibiza","Leon","Leon ST","Arona","Ateca","Tarraco"],
  "Škoda":         ["Fabia","Scala","Octavia","Octavia Combi","Superb","Superb Combi","Kamiq","Karoq","Kodiaq","Elroq","Enyaq","Citigo"],
  "Subaru":        ["Impreza","XV","Crosstrek","Forester","Outback","Solterra"],
  "Suzuki":        ["Swift","Ignis","Vitara","S-Cross","Jimny","Across"],
  "Tesla":         ["Model 3","Model S","Model X","Model Y","Cybertruck"],
  "Togg":          ["T10X","T10F"],
  "Toyota":        ["Aygo","Aygo X","Yaris","Yaris Cross","Corolla","Corolla Cross","Camry","C-HR","RAV4","Prius","Land Cruiser","Hilux","HiAce","bZ4X","Proace","Proace City"],
  "Volkswagen":    ["Polo","Golf","Golf Variant","Passat","Passat Variant","Arteon","T-Cross","T-Roc","Taigo","Tiguan","Touareg","ID.3","ID.4","ID.5","ID.7","ID. Buzz","Caddy","Transporter","Crafter","Amarok"],
  "Volvo":         ["S60","S90","V60","V60 Cross Country","V90","V90 Cross Country","XC40","XC60","XC90","C40 Recharge","EX30","EX40","EX90"],
};
// Liste yalnızca öneri: listede olmayan marka da yazılabilir (bkz. AutocompleteInput allowFreeText).
const BRANDS = Object.keys(MODELS).sort((a, b) => a.localeCompare(b, "tr"));
const FUEL_TYPES: FuelType[] = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
const TRANSMISSIONS: TransmissionType[] = ["Manuel", "Otomatik", "CVT", "DSG", "Yarı Otomatik"];
const TIRE_SEASONS: TireSeasonType[] = ["Yazlık", "Kışlık", "Dört Mevsim"];
const COLORS = ["Beyaz","Siyah","Gri","Gümüş","Kırmızı","Mavi","Yeşil","Kahverengi","Bej","Sarı","Turuncu","Mor"];
// Periyodik bakımda genelde birlikte yapılan kalemler — "Son bakımı biliyorum" seçilince işaretli gelir.
const DEFAULT_SERVICE_ITEMS = ["oil", "airfilter", "cabinfilter"];

const lowerTr = (s: string) => s.toLocaleLowerCase("tr");

// Yerel tarihi YYYY-MM-DD olarak döndürür (UTC kaymasını önlemek için)
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Lastik mevsimi bilinmiyorsa bugünün tarihine göre tahmin: Kasım–Mart kışlık.
function guessTireSeason(): TireSeasonType {
  const m = new Date().getMonth() + 1;
  return m >= 11 || m <= 3 ? "Kışlık" : "Yazlık";
}

const parseKm = (value: string) => parseInt(value.replace(/[.,\s]/g, ""), 10) || 0;
const isKmText = (value: string) => /^[\d.,\s]+$/.test(value.trim());

const formatDateTr = (iso: string) => (iso.includes("-") ? iso.split("-").reverse().join(".") : iso);

// Türkiye plaka biçimi (il kodu + 1-3 harf + 2-4 rakam). Yalnızca uyarı amaçlı:
// yabancı/diplomatik plakalar da kaydedilebilmeli.
const TR_PLATE = /^(0[1-9]|[1-7]\d|8[01])[A-Z]{1,3}\d{2,4}$/;

// ── Belge okuma ─────────────────────────────────────────────

interface ExtractedDocData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: string;
  chassisNo?: string;
  color?: string;
  fuelType?: string;
  mileage?: string;
  ruhsatSahibi?: string;
  insuranceCompany?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
}

type DocKey = "ruhsat" | "trafik_sigortasi" | "kasko";

interface DocSlot {
  file: File | null;
  scanning: boolean;
}

const DOC_TITLES: Record<DocKey, string> = {
  ruhsat:           "Araç Ruhsatı",
  trafik_sigortasi: "Trafik Sigortası Poliçesi",
  kasko:            "Kasko Poliçesi",
};

// ─────────────────────────────────────────────────────────────

function AutocompleteInput({
  options, value, onChange, placeholder, className, allowFreeText = false, id,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  allowFreeText?: boolean;
  id?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => lowerTr(o).includes(lowerTr(query)))
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
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
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
              // Listedeki bir seçenekle büyük/küçük harf farkıyla eşleşiyorsa listedeki yazımı kullan
              // ("toyota" → "Toyota"); serbest yazıya izin yoksa eşleşmeyen girdi geri alınır.
              const match = options.find((o) => lowerTr(o) === lowerTr(query.trim()));
              if (match) { onChange(match); setQuery(match); }
              else if (!allowFreeText) setQuery(value);
              else if (query !== query.trim()) { onChange(query.trim()); setQuery(query.trim()); }
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
            } else if (e.key === "Enter" && filtered.length > 0 && (activeIdx >= 0 || !allowFreeText)) {
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

// Kimlik + km + yakıt/vites + bakım durumu ilk adımda: araç bu adımın sonunda
// kaydedilebilir ve bakım takibi doğru başlar. Belgeler ikinci adımda — canlı
// veride belge-önce akışı, belgeyi yükleyip bir daha dönmeyen kullanıcılar
// üretiyordu. Ruhsattan otomatik doldurma ise yazmayı azalttığı için en üstte.
const steps = [
  { id: 1, title: "Temel", icon: Car },
  { id: 2, title: "Belgeler", icon: Shield },
  { id: 3, title: "Ek Bilgiler", icon: Disc3 },
];

type MaintenanceMode = "" | "new" | "known" | "unknown";

interface FormData {
  ownershipType: OwnershipType;
  rentCompany: string;
  ruhsatSahibi: string;
  image: string;
  image2: string;
  image3: string;
  image4: string;
  imagePosition: number;
  imagePositionX: number;
  imageZoom: number;
  plate: string;
  brand: string;
  model: string;
  year: string;
  chassisNo: string;
  color: string;
  mileage: string;
  insuranceCompany: string;
  insuranceExpiry: string;
  // Boş = henüz seçilmedi. Varsayılan değer verilmez: atlanan alan gerçek bilgi gibi kaydedilmesin.
  fuelType: FuelType | "";
  transmission: TransmissionType | "";
  tireStatus: TireSeasonType;
  tireBrand: string;
  tireSize: string;
  tireInstallDate: string;
  tireMileage: string;
  batteryBrand: string;
  batteryCapacity: string;
  batteryInstallDate: string;
  kaskoCompany: string;
  kaskoExpiry: string;
  inspectionExpiry: string;
  maintenanceMode: MaintenanceMode;
  lastServiceDate: string;
  lastServiceMileage: string;
  lastServiceItems: string[];
  notes: string;
}

const makeDefaultForm = (): FormData => ({
  ownershipType: "ozmal", rentCompany: "", ruhsatSahibi: "",
  image: "", image2: "", image3: "", image4: "", imagePosition: 50, imagePositionX: 50, imageZoom: 100,
  plate: "", brand: "", model: "", year: "", chassisNo: "", color: "", mileage: "",
  insuranceCompany: "", insuranceExpiry: "",
  fuelType: "", transmission: "",
  tireStatus: guessTireSeason(), tireBrand: "", tireSize: "", tireInstallDate: "", tireMileage: "",
  batteryBrand: "", batteryCapacity: "", batteryInstallDate: "",
  kaskoCompany: "", kaskoExpiry: "", inspectionExpiry: "",
  maintenanceMode: "", lastServiceDate: "", lastServiceMileage: "", lastServiceItems: DEFAULT_SERVICE_ITEMS,
  notes: "",
});

// ── Taslak & hatırlanan varsayılanlar (localStorage) ───────────

// v2: form yapısı değişti (bakım durumu, boş yakıt/vites); eski taslaklar okunmaz.
const DRAFT_KEY = "carstrack:vehicle-new-draft:v2";
const OLD_DRAFT_KEYS = ["carstrack:vehicle-new-draft:v1"];
const REMEMBERED_DEFAULTS_KEY = "carstrack:vehicle-new-defaults:v1";
// Görseller base64 olarak çok yer kapladığı için taslağa dahil edilmiyor
const DRAFT_EXCLUDED_KEYS = new Set<keyof FormData>(["image", "image2", "image3", "image4"]);
// Filo genelinde tekrar eden alanlar — bir sonraki araca varsayılan olarak taşınır
const REMEMBERABLE_KEYS: (keyof FormData)[] = ["insuranceCompany", "kaskoCompany", "tireBrand", "batteryBrand", "ruhsatSahibi"];

type DraftShape = Omit<FormData, "image" | "image2" | "image3" | "image4"> & { step?: number };

function readDraft(): DraftShape | null {
  try {
    for (const k of OLD_DRAFT_KEYS) localStorage.removeItem(k);
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftShape;
    // Anlamlı bir şey girilmemişse taslak sayma
    const hasContent = [parsed.plate, parsed.brand, parsed.model, parsed.notes, parsed.mileage, parsed.insuranceExpiry].some((v) => !!v);
    return hasContent ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(form: FormData, step: number) {
  try {
    const toSave: Partial<FormData> = {};
    (Object.keys(form) as (keyof FormData)[]).forEach((k) => {
      if (!DRAFT_EXCLUDED_KEYS.has(k)) (toSave as Record<string, unknown>)[k] = form[k];
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...toSave, step }));
  } catch {
    // localStorage kullanılamıyorsa (gizli sekme vb.) sessizce yok say
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

function readRememberedDefaults(): Partial<FormData> {
  try {
    const raw = localStorage.getItem(REMEMBERED_DEFAULTS_KEY);
    return raw ? (JSON.parse(raw) as Partial<FormData>) : {};
  } catch {
    return {};
  }
}

function saveRememberedDefaults(values: Partial<FormData>) {
  try {
    const merged = { ...readRememberedDefaults() };
    REMEMBERABLE_KEYS.forEach((k) => {
      const v = values[k];
      if (v) (merged as Record<string, unknown>)[k] = v;
    });
    localStorage.setItem(REMEMBERED_DEFAULTS_KEY, JSON.stringify(merged));
  } catch {
    // yok say
  }
}

// ─────────────────────────────────────────────────────────────

function Field({ label, required, htmlFor, children }: { label: string; required?: boolean; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Hint({ tone = "warning", children }: { tone?: "warning" | "error" | "info"; children: React.ReactNode }) {
  const cls = tone === "error" ? "text-destructive" : tone === "info" ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400";
  return <p className={`text-[11px] font-medium ${cls}`}>{children}</p>;
}

// Geçmiş bitiş tarihi büyük ihtimalle yanlış girilmiştir — kaydı engellemez, uyarır.
function PastDateHint({ value }: { value: string }) {
  if (!value || value >= todayISO()) return null;
  return <Hint>Bu tarih geçmişte; araç &quot;süresi doldu&quot; uyarısıyla görünecek. Doğru mu?</Hint>;
}

function ChipGroup<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T | ""; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                : "bg-muted/30 border-border/40 text-foreground hover:bg-muted/60"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const MAINTENANCE_OPTIONS: { key: Exclude<MaintenanceMode, "">; title: string; desc: string }[] = [
  { key: "new",     title: "Sıfır araç",            desc: "Bayiden yeni teslim alındı" },
  { key: "known",   title: "Son bakımı biliyorum",  desc: "Tarih ve km girin" },
  { key: "unknown", title: "Bilmiyorum",            desc: "Takip bugünden başlasın" },
];

// Belge okuma sonucunu forma uygulamadan önce gösterilen satır.
interface ReviewRow {
  key: keyof FormData;
  label: string;
  value: string;
  current: string;
  same: boolean;
  checked: boolean;
}

const REVIEW_LABELS: Partial<Record<keyof FormData, string>> = {
  plate: "Plaka",
  brand: "Marka",
  model: "Model",
  year: "Yıl",
  chassisNo: "Şasi No",
  color: "Renk",
  fuelType: "Yakıt",
  mileage: "Kilometre",
  ruhsatSahibi: "Ruhsat Sahibi",
  insuranceCompany: "Trafik Sigortası Şirketi",
  insuranceExpiry: "Trafik Sigortası Bitiş",
  kaskoCompany: "Kasko Şirketi",
  kaskoExpiry: "Kasko Bitiş",
  inspectionExpiry: "Muayene Bitiş",
};
const DATE_KEYS = new Set<keyof FormData>(["insuranceExpiry", "kaskoExpiry", "inspectionExpiry"]);

// Okunan belge verisini belge türüne göre form alanlarına eşler. Kasko
// poliçesindeki sigorta alanları kasko alanlarına gider (trafik sigortasının
// üzerine yazılmaz).
function mapExtracted(docKey: DocKey, d: ExtractedDocData): { key: keyof FormData; value: string }[] {
  const out: { key: keyof FormData; value: string }[] = [];
  const push = (key: keyof FormData, value: string | undefined | null) => {
    const v = (value ?? "").toString().trim();
    if (v) out.push({ key, value: v });
  };
  push("plate", d.plate?.toUpperCase());
  push("brand", d.brand ? (BRANDS.find((b) => lowerTr(b) === lowerTr(d.brand!.trim())) ?? d.brand) : undefined);
  push("model", d.model);
  push("year", d.year && /^\d{4}$/.test(d.year.trim()) ? d.year : undefined);
  push("chassisNo", d.chassisNo?.toUpperCase().replace(/\s+/g, ""));
  push("color", d.color);
  push("fuelType", d.fuelType && FUEL_TYPES.includes(d.fuelType as FuelType) ? d.fuelType : undefined);
  push("mileage", d.mileage && isKmText(d.mileage) ? d.mileage : undefined);
  push("ruhsatSahibi", d.ruhsatSahibi);
  push("inspectionExpiry", d.inspectionExpiry);
  if (docKey === "kasko") {
    push("kaskoCompany", d.insuranceCompany);
    push("kaskoExpiry", d.insuranceExpiry);
  } else {
    push("insuranceCompany", d.insuranceCompany);
    push("insuranceExpiry", d.insuranceExpiry);
  }
  return out;
}

const sameValue = (key: keyof FormData, a: string, b: string) =>
  key === "plate" || key === "chassisNo"
    ? a.replace(/\s+/g, "").toUpperCase() === b.replace(/\s+/g, "").toUpperCase()
    : key === "mileage"
      ? parseKm(a) === parseKm(b)
      : lowerTr(a.trim()) === lowerTr(b.trim());

interface CreatedVehicle {
  id: string;
  plate: string;
  name: string;
}

export default function NewVehiclePage() {
  const router = useRouter();
  const { company, profile } = useAuth();
  const { refresh, vehicles } = useData();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(makeDefaultForm);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedVehicle | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [error, setError] = useState<string>("");

  const initDocSlots = (): Record<DocKey, DocSlot> => ({
    ruhsat:           { file: null, scanning: false },
    trafik_sigortasi: { file: null, scanning: false },
    kasko:            { file: null, scanning: false },
  });
  const [docs, setDocs] = useState<Record<DocKey, DocSlot>>(initDocSlots);
  const [review, setReview] = useState<{ docKey: DocKey; rows: ReviewRow[] } | null>(null);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const resetAll = () => {
    setForm({ ...makeDefaultForm(), ...readRememberedDefaults() });
    setDocs(initDocSlots());
    setReview(null);
    setStep(1);
    setError("");
  };

  // Taslağı ve tüm form durumunu temizleyip sıfırdan başlar
  const startFresh = () => {
    clearDraft();
    resetAll();
    setRestoredFromDraft(false);
    toast.success("Taslak temizlendi", { description: "Sıfırdan başlıyorsunuz." });
  };

  // Sayfa açılışında: önce yarım kalmış taslağı, yoksa filo genelinde hatırlanan
  // varsayılanları (sigorta şirketi, lastik/akü markası vb.) geri yükle.
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      const { step: draftStep, ...draftForm } = draft;
      setForm((prev) => ({ ...prev, ...draftForm }));
      if (draftStep && draftStep >= 1 && draftStep <= steps.length) setStep(draftStep);
      setRestoredFromDraft(true);
    } else {
      const remembered = readRememberedDefaults();
      if (Object.keys(remembered).length > 0) {
        setForm((prev) => ({ ...prev, ...remembered }));
      }
    }
    setDraftRestored(true);
  }, []);

  // Form değiştikçe (görseller hariç) taslağı debounce ile localStorage'a yaz
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftRestored || created) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => writeDraft(form, step), 600);
    return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current); };
  }, [form, step, draftRestored, created]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Bakım durumu: "Sıfır araç" seçilince km boşsa 0 yapılır, lastik & akü
  // montaj tarihi bugüne ayarlanır; başka seçeneğe geçince bu otomatik değerler geri alınır.
  const setMaintenanceMode = (mode: Exclude<MaintenanceMode, "">) => {
    setForm((prev) => {
      const wasNew = prev.maintenanceMode === "new";
      const isNew = mode === "new";
      if (wasNew === isNew) return { ...prev, maintenanceMode: mode };
      const today = todayISO();
      return {
        ...prev,
        maintenanceMode: mode,
        mileage: isNew && !prev.mileage.trim() ? "0" : prev.mileage,
        tireInstallDate: isNew ? today : prev.tireInstallDate === today ? "" : prev.tireInstallDate,
        batteryInstallDate: isNew ? today : prev.batteryInstallDate === today ? "" : prev.batteryInstallDate,
      };
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const compressed = await compressImage(file);
    setForm((prev) => ({ ...prev, image: compressed, imagePosition: 50, imagePositionX: 50 }));
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

  // Ek araç fotoğrafları (arka, yan vb.) — kart görünümünde ana fotoğraf `image` kullanılır
  const handleExtraPhoto = async (field: "image2" | "image3" | "image4", file: File | null) => {
    if (!file) return;
    const compressed = await compressImage(file);
    set(field, compressed);
  };

  // ── Belge seçme / okuma ────────────────────────────────────

  const validateDocFile = (file: File): boolean => {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!SCAN_ALLOWED_TYPES.includes(file.type) && !SCAN_ALLOWED_EXTS.includes(ext)) {
      toast.error("Desteklenmeyen dosya", { description: "PDF veya görsel (JPG, PNG, WebP) seçin." });
      return false;
    }
    if (file.size > SCAN_MAX_FILE_SIZE) {
      toast.error("Dosya çok büyük", { description: "Maks. 5 MB." });
      return false;
    }
    return true;
  };

  const attachDoc = (key: DocKey, file: File | null) => {
    if (file && !validateDocFile(file)) return false;
    setDocs((prev) => ({ ...prev, [key]: { file, scanning: false } }));
    return true;
  };

  const scanDoc = async (key: DocKey, fileArg?: File) => {
    const file = fileArg ?? docs[key].file;
    if (!file) return;
    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], scanning: true } }));
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fileData: base64, mimeType: file.type || "application/octet-stream", vehicleDocHint: key }),
      });
      if (res.status === 429) {
        toast.error("Çok fazla deneme", { description: "Lütfen birkaç dakika sonra tekrar deneyin." });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = (await res.json()) as { data?: ExtractedDocData };
      const found = mapExtracted(key, data ?? {});
      if (found.length === 0) {
        toast.warning("Bilgi okunamadı", { description: "Belgeden bilgi çıkarılamadı. Alanları elle doldurabilirsiniz; belge yine de kayıtta saklanır." });
        return;
      }
      // Okuma sürerken kullanıcı yazmaya devam etmiş olabilir: güncel formla karşılaştır.
      const current = formRef.current;
      const rows: ReviewRow[] = found.map(({ key: k, value }) => {
        const cur = String(current[k] ?? "");
        const same = !!cur && sameValue(k, cur, value);
        return { key: k, label: REVIEW_LABELS[k] ?? String(k), value, current: cur, same, checked: !cur };
      });
      setReview({ docKey: key, rows });
    } catch (err) {
      console.error("Document scan failed:", err instanceof Error ? err.message : err);
      toast.error("Belge okunamadı", { description: "Bağlantınızı kontrol edip tekrar deneyin. Belge yine de kayıtta saklanır." });
    } finally {
      setDocs((prev) => ({ ...prev, [key]: { ...prev[key], scanning: false } }));
    }
  };

  // Yalnızca işaretli satırlar uygulanır: boş alanlar varsayılan olarak
  // işaretli, kullanıcının yazdığından farklı olanlar işaretsiz gelir.
  const applyReview = () => {
    if (!review) return;
    const chosen = review.rows.filter((r) => r.checked && !r.same);
    if (chosen.length > 0) {
      setForm((prev) => {
        const next = { ...prev } as Record<string, unknown>;
        for (const r of chosen) next[r.key] = r.value;
        return next as unknown as FormData;
      });
      toast.success(`${chosen.length} alan dolduruldu`, {
        description: "Belge okuması hatalı olabilir; lütfen alanları kontrol edin.",
        duration: 6000,
      });
    }
    setReview(null);
  };

  // ── Doğrulama ──────────────────────────────────────────────

  const normalizedPlate = form.plate.trim().toUpperCase().replace(/\s+/g, "");
  const isDuplicatePlate = normalizedPlate.length > 0 && vehicles.some(
    (v) => v.plate.trim().toUpperCase().replace(/\s+/g, "") === normalizedPlate
  );
  const plateLooksOdd = normalizedPlate.length >= 5 && !TR_PLATE.test(normalizedPlate);
  const maxYear = new Date().getFullYear() + 1;
  const yearNum = parseInt(form.year, 10);
  const yearValid = /^\d{4}$/.test(form.year.trim()) && yearNum >= 1950 && yearNum <= maxYear;
  const mileageValid = form.mileage.trim() !== "" && isKmText(form.mileage);
  const mileage = parseKm(form.mileage);
  const chassis = form.chassisNo.trim();
  const chassisLooksOdd = chassis.length > 0 && (chassis.length !== 17 || /[IOQ]/.test(chassis));

  const lastServiceKm = parseKm(form.lastServiceMileage);
  const lastServiceErrors: string[] = [];
  if (form.maintenanceMode === "known") {
    if (!form.lastServiceDate) lastServiceErrors.push("son bakım tarihi");
    else if (form.lastServiceDate > todayISO()) lastServiceErrors.push("son bakım tarihi bugünden sonra olamaz");
    if (!form.lastServiceMileage.trim() || !isKmText(form.lastServiceMileage)) lastServiceErrors.push("son bakım km'si");
    else if (mileageValid && lastServiceKm > mileage) lastServiceErrors.push("son bakım km'si güncel km'den büyük olamaz");
    if (form.lastServiceItems.length === 0) lastServiceErrors.push("bakımda yapılan en az bir kalem");
  }

  const missing: string[] = [];
  if (!form.plate.trim()) missing.push("plaka");
  if (!form.brand.trim()) missing.push("marka");
  if (!form.model.trim()) missing.push("model");
  if (!yearValid) missing.push("yıl");
  if (!mileageValid) missing.push("km");
  if (!form.fuelType) missing.push("yakıt");
  if (!form.transmission) missing.push("vites");
  if (!form.maintenanceMode) missing.push("bakım durumu");
  const basicsValid = missing.length === 0 && !isDuplicatePlate && lastServiceErrors.length === 0;

  // ── Kaydet ─────────────────────────────────────────────────

  // andNew: true ise kayıt sonrası formu sıfırlayıp aynı sayfada kalır.
  const handleSubmit = async (andNew: boolean = false) => {
    // Belge okuma ya da taslak plakayı/zorunlu alanı sonradan değiştirmiş olabilir:
    // son adımda da kontrol et.
    if (!basicsValid) {
      setStep(1);
      toast.error("Eksik veya hatalı bilgi", {
        description: isDuplicatePlate ? "Bu plaka filoda zaten kayıtlı." : "Temel bilgiler adımını kontrol edin.",
      });
      return;
    }
    setSaving(true);
    setError("");
    const today = todayISO();
    const templates = getMaintenanceTemplates(form.brand, form.model);

    // Bakım başlangıcı: sıfır/bilinmiyor → tüm kalemler bugünden ve güncel km'den
    // sayılır; biliniyor → yalnızca o bakımda yapılan kalemler.
    let maintenance: Pick<Vehicle, "maintenanceItems" | "lastServiceDate" | "lastServiceMileage" | "nextServiceMileage"> = {
      maintenanceItems: templates, lastServiceDate: "", lastServiceMileage: 0, nextServiceMileage: 0,
    };
    const base = { maintenanceItems: templates, nextServiceMileage: 0 } as Vehicle;
    if (form.maintenanceMode === "new" || form.maintenanceMode === "unknown") {
      const r = applyPeriodicService(base, today, mileage, templates.map((t) => t.id));
      maintenance = {
        maintenanceItems: r.maintenanceItems!,
        nextServiceMileage: r.nextServiceMileage ?? 0,
        // "Bilmiyorum"da bugün bakım yapılmış gibi kayıt düşülmez.
        lastServiceDate: form.maintenanceMode === "new" ? today : "",
        lastServiceMileage: form.maintenanceMode === "new" ? mileage : 0,
      };
    } else if (form.maintenanceMode === "known") {
      const r = applyPeriodicService(base, form.lastServiceDate, lastServiceKm, form.lastServiceItems);
      maintenance = {
        maintenanceItems: r.maintenanceItems!,
        nextServiceMileage: r.nextServiceMileage ?? 0,
        lastServiceDate: form.lastServiceDate,
        lastServiceMileage: lastServiceKm,
      };
    }

    const isNew = form.maintenanceMode === "new";
    const data: Omit<Vehicle, "id" | "createdAt" | "updatedAt"> = {
      ownershipType: form.ownershipType,
      rentCompany: form.ownershipType === "kiralik" ? form.rentCompany.trim() : "",
      ruhsatSahibi: form.ruhsatSahibi.trim(),
      image: form.image,
      image2: form.image2,
      image3: form.image3,
      image4: form.image4,
      imagePosition: form.imagePosition,
      imagePositionX: form.imagePositionX,
      imageZoom: form.imageZoom,
      plate: form.plate.trim().toUpperCase(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: yearNum,
      color: form.color.trim(),
      mileage,
      engineType: "",
      engineVolume: "",
      power: "",
      fuelType: form.fuelType as FuelType,
      transmission: form.transmission as TransmissionType,
      chassisNo: chassis,
      tireStatus: form.tireStatus,
      tireBrand: form.tireBrand.trim(),
      tireSize: form.tireSize.trim(),
      tireInstallDate: form.tireInstallDate,
      tireMileage: isNew ? mileage : parseKm(form.tireMileage),
      batteryBrand: form.batteryBrand.trim(),
      batteryCapacity: form.batteryCapacity.trim(),
      batteryInstallDate: form.batteryInstallDate,
      insuranceCompany: form.insuranceCompany.trim(),
      insuranceExpiry: form.insuranceExpiry,
      kaskoCompany: form.kaskoCompany.trim(),
      kaskoExpiry: form.kaskoExpiry,
      greenCardCompany: "",
      greenCardExpiry: "",
      inspectionExpiry: form.inspectionExpiry,
      ...maintenance,
      notes: form.notes.trim(),
    };

    try {
      const vehicle = await addVehicle(data);

      // Eklenen belgeleri aracın belge kütüphanesine yükle
      const docEntries = (Object.entries(docs) as [DocKey, DocSlot][]).filter(([, d]) => d.file);
      let failedDocs = 0;
      if (docEntries.length > 0) {
        const results = await Promise.allSettled(
          docEntries.map(async ([key, doc]) => {
            const uploaded = await uploadDocumentFile(vehicle.id, doc.file!);
            const expiry =
              key === "trafik_sigortasi" ? (form.insuranceExpiry || undefined) :
              key === "kasko"            ? (form.kaskoExpiry  || undefined) :
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
        failedDocs = results.filter((r) => r.status === "rejected").length;
      }

      // Yeni aracın listede anında görünmesi için ortak veri context'ini tazele
      await refresh();
      saveRememberedDefaults(form);
      clearDraft();
      setRestoredFromDraft(false);
      setSaving(false);

      if (failedDocs > 0) {
        toast.warning(`${failedDocs} belge yüklenemedi`, { description: "Araç kaydedildi; belgeyi araç detayındaki Belgeler bölümünden tekrar ekleyebilirsiniz." });
      }

      if (andNew) {
        resetAll();
        toast.success("Araç Eklendi", { description: `${data.plate} kaydedildi. Yeni bir araç daha ekleyebilirsiniz.` });
        window.scrollTo({ top: 0 });
      } else {
        setCreated({ id: vehicle.id, plate: data.plate, name: `${data.brand} ${data.model}` });
      }
    } catch (err) {
      console.error("Vehicle add error:", err);
      const code = (err as { code?: string })?.code;
      const msg = code === "23505"
        ? "Bu plaka filoda zaten kayıtlı."
        : "Araç kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.";
      setError(msg);
      toast.error("Kaydedilemedi", { description: msg });
      setSaving(false);
    }
  };

  const cls = "rounded-xl h-11 bg-muted/30 border-border/40 text-sm focus-visible:ring-primary/30";

  if (isDriverRole(profile?.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-destructive" />
          </div>
        </motion.div>
        <h2 className="text-xl font-outfit font-bold">Yetkiniz Yok</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Araç eklemek için şirket yetkilisi iznine ihtiyacınız var. Lütfen şirketinizin yetkilisiyle iletişime geçin.
        </p>
        <Button variant="outline" className="mt-6 rounded-xl" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>
    );
  }

  if (created) {
    return (
      <CreatedScreen
        vehicle={created}
        onAddAnother={() => { setCreated(null); resetAll(); }}
      />
    );
  }

  const ruhsat = docs.ruhsat;

  return (
    <>
    <div className="bg-background min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="flex items-center justify-between p-3 px-4 max-w-2xl mx-auto">
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={step === 1 ? () => router.back() : () => setStep((s) => s - 1)} className="rounded-full h-9 w-9 hover:bg-primary/10" />}>
              <ChevronLeft className="h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>{step === 1 ? "Vazgeç" : "Önceki Adım"}</TooltipContent>
          </Tooltip>
          <span className="font-outfit font-bold text-sm">Yeni Araç — Adım {step}/{steps.length}</span>
          <div className="w-9" />
        </div>
        {/* Progress */}
        <div className="h-1 bg-muted mx-0">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${(step / steps.length) * 100}%` }} transition={{ ease: "easeInOut" }} />
        </div>
        {/* Step icons — temel bilgiler tamamsa ileri adımlara da atlanabilir */}
        <div className="flex justify-around items-center py-2 px-4 max-w-2xl mx-auto">
          {steps.map((s) => {
            const reachable = s.id <= step || basicsValid;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!reachable}
                onClick={() => setStep(s.id)}
                className={`flex flex-col items-center gap-0.5 transition-colors ${s.id <= step ? "text-primary" : reachable ? "text-muted-foreground" : "text-muted-foreground/40"}`}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-[180px] md:pb-36">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Yarım kalmış taslak geri yüklendiyse, sıfırdan başlama seçeneği */}
            {restoredFromDraft && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5 text-xs">
                <Info className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="flex-1 text-muted-foreground">
                  Yarım kalan taslağınız geri yüklendi. Fotoğraflar ve belge dosyaları taslakta saklanmaz, yeniden eklemeniz gerekir.
                </span>
                <button type="button" onClick={startFresh} className="text-amber-600 dark:text-amber-400 font-semibold shrink-0 hover:underline">
                  Sıfırdan Başla
                </button>
              </div>
            )}

            {/* ── ADIM 1: TEMEL ── */}
            {step === 1 && (
              <>
                {/* Ruhsattan otomatik doldurma */}
                <Card className="rounded-2xl border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-primary/15 rounded-lg shrink-0">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Ruhsatı okut, alanları doldurayım</p>
                        <p className="text-[11px] text-muted-foreground">
                          Ruhsatın fotoğrafını çekin veya PDF seçin; plaka, marka, model, yıl ve şasi no doldurulur.
                          Görsel okunmak üzere Google Gemini&apos;ye iletilir. Ruhsat, kayıtta aracın belgelerine de eklenir.
                        </p>
                      </div>
                    </div>
                    {ruhsat.file ? (
                      <div className="flex items-center gap-2.5 bg-background/60 rounded-xl border border-border/40 p-3">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 min-w-0 text-xs font-medium truncate">{ruhsat.file.name}</span>
                        {ruhsat.scanning ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Okunuyor…
                          </span>
                        ) : (
                          <>
                            <button type="button" onClick={() => scanDoc("ruhsat")} className="text-[11px] font-semibold text-primary hover:underline shrink-0">
                              Tekrar oku
                            </button>
                            <button type="button" aria-label="Ruhsatı kaldır" onClick={() => attachDoc("ruhsat", null)} className="text-muted-foreground hover:text-destructive shrink-0">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-colors">
                        <ScanLine className="h-4 w-4" /> Ruhsat seç veya fotoğraf çek
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            if (f && attachDoc("ruhsat", f)) void scanDoc("ruhsat", f);
                          }}
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>

                {/* Çok sayıda araç ekleyenler için toplu içe aktarma kısayolu */}
                <Link
                  href="/vehicles?import=1"
                  className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3.5 py-2.5 text-xs hover:bg-muted/40 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 text-muted-foreground">
                    Çok sayıda araç mı ekliyorsunuz? <span className="text-foreground font-semibold">Excel ile toplu içe aktarın</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </Link>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <Field label="Plaka" required htmlFor="plate">
                      <Input id="plate" className={cls} placeholder="34 ABC 123" autoComplete="off" value={form.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())} />
                      {isDuplicatePlate ? (
                        <Hint tone="error">Bu plaka filoda zaten kayıtlı.</Hint>
                      ) : plateLooksOdd ? (
                        <Hint>Türkiye plaka biçimine benzemiyor (örn. 34 ABC 123). Yabancı plakaysa devam edebilirsiniz.</Hint>
                      ) : null}
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Marka" required htmlFor="brand">
                        <AutocompleteInput
                          id="brand"
                          options={BRANDS}
                          value={form.brand}
                          onChange={(v) => set("brand", v)}
                          placeholder="Togg, Renault..."
                          className={cls}
                          allowFreeText
                        />
                      </Field>
                      <Field label="Model" required htmlFor="model">
                        <AutocompleteInput
                          id="model"
                          options={MODELS[form.brand] ?? []}
                          value={form.model}
                          onChange={(v) => set("model", v)}
                          placeholder="T10X, Clio..."
                          className={cls}
                          allowFreeText
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Model Yılı" required htmlFor="year">
                        <Input id="year" className={cls} inputMode="numeric" maxLength={4} placeholder={String(new Date().getFullYear())} value={form.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))} />
                        {form.year.length === 4 && !yearValid && <Hint tone="error">1950–{maxYear} arasında olmalı.</Hint>}
                      </Field>
                      <Field label="Güncel Kilometre" required htmlFor="mileage">
                        <Input id="mileage" className={cls} inputMode="numeric" placeholder="45000" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} />
                        {form.mileage.trim() !== "" && !mileageValid && <Hint tone="error">Yalnızca rakam girin.</Hint>}
                      </Field>
                    </div>
                    <Field label="Yakıt" required>
                      <ChipGroup label="Yakıt" options={FUEL_TYPES} value={form.fuelType} onChange={(v) => set("fuelType", v)} />
                    </Field>
                    <Field label="Vites" required>
                      <ChipGroup label="Vites" options={TRANSMISSIONS} value={form.transmission} onChange={(v) => set("transmission", v)} />
                    </Field>
                  </CardContent>
                </Card>

                {/* Bakım durumu — bakım uyarılarının doğru başlaması için şart */}
                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Bakım durumu<span className="text-destructive ml-0.5">*</span></h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground -mt-1">
                      Yağ, filtre, triger gibi bakım uyarıları bu bilgiye göre hesaplanır.
                    </p>
                    <div role="radiogroup" aria-label="Bakım durumu" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {MAINTENANCE_OPTIONS.map((o) => {
                        const active = form.maintenanceMode === o.key;
                        return (
                          <button
                            key={o.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setMaintenanceMode(o.key)}
                            className={`flex items-center sm:flex-col sm:items-start gap-2.5 sm:gap-1 rounded-xl border p-3 text-left transition-colors ${
                              active ? "border-primary bg-primary/10" : "border-border/40 bg-muted/20 hover:bg-muted/40"
                            }`}
                          >
                            {active ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{o.title}</span>
                              <span className="block text-[11px] text-muted-foreground">{o.desc}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {form.maintenanceMode === "new" && (
                      <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/15 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p>Tüm periyodik bakımlar teslimden itibaren sayılmaya başlar; lastik ve akü montaj tarihi <b className="text-foreground">bugün</b> olarak işaretlenir.</p>
                      </div>
                    )}

                    {form.maintenanceMode === "unknown" && (
                      <div className="flex gap-2 rounded-lg bg-amber-500/8 border border-amber-500/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p>
                          Bakım kalemleri <b className="text-foreground">bugünden ve girdiğiniz km&apos;den</b> sayılmaya başlar.
                          Araç bakımı gecikmiş olabilir; ilk servisten sonra servis kaydını girdiğinizde yapılan kalemler güncellenir.
                        </p>
                      </div>
                    )}

                    {form.maintenanceMode === "known" && (
                      <div className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Son bakım tarihi" required>
                            <DatePicker value={form.lastServiceDate} onChange={(v) => set("lastServiceDate", v)} />
                          </Field>
                          <Field label="Son bakımdaki km" required htmlFor="lastServiceMileage">
                            <Input id="lastServiceMileage" className={cls} inputMode="numeric" placeholder="40000" value={form.lastServiceMileage} onChange={(e) => set("lastServiceMileage", e.target.value)} />
                          </Field>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Bu bakımda yapılanlar</p>
                          <div className="flex flex-wrap gap-1.5">
                            {MAINTENANCE_TEMPLATES.map((t) => {
                              const on = form.lastServiceItems.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => set("lastServiceItems", on ? form.lastServiceItems.filter((x) => x !== t.id) : [...form.lastServiceItems, t.id])}
                                  className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${on ? "bg-primary/10 border-primary/40 text-primary" : "bg-background border-border/40 text-muted-foreground hover:bg-muted/50"}`}
                                >
                                  {on && "✓ "}{t.name}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground">İşaretlemediğiniz kalemler, servis kaydı girilene kadar takipte görünmez.</p>
                        </div>
                        {lastServiceErrors.length > 0 && (form.lastServiceDate || form.lastServiceMileage) && (
                          <Hint tone="error">Kontrol edin: {lastServiceErrors.join(", ")}.</Hint>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── ADIM 2: BELGELER ── */}
            {step === 2 && (
              <>
                <p className="text-xs text-muted-foreground px-1">
                  Hepsi isteğe bağlı. Poliçe eklerseniz tarihleri belgeden okuyabilirim; dosyalar aracın belgelerinde saklanır.
                </p>

                <DocCard
                  title="Zorunlu Trafik Sigortası"
                  icon={Shield}
                  slot={docs.trafik_sigortasi}
                  attachLabel="Poliçe ekle"
                  onAttach={(f) => attachDoc("trafik_sigortasi", f)}
                  onScan={() => scanDoc("trafik_sigortasi")}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Sigorta Şirketi" htmlFor="insuranceCompany">
                      <Input id="insuranceCompany" className={cls} placeholder="Allianz, Axa..." value={form.insuranceCompany} onChange={(e) => set("insuranceCompany", e.target.value)} />
                    </Field>
                    <Field label="Bitiş Tarihi">
                      <DatePicker value={form.insuranceExpiry} onChange={(v) => set("insuranceExpiry", v)} />
                    </Field>
                  </div>
                  <PastDateHint value={form.insuranceExpiry} />
                </DocCard>

                <DocCard
                  title="TÜVTÜRK Muayene"
                  icon={CalendarCheck}
                  slot={docs.ruhsat}
                  attachLabel="Ruhsat ekle"
                  onAttach={(f) => attachDoc("ruhsat", f)}
                  onScan={() => scanDoc("ruhsat")}
                >
                  <Field label="Muayene Bitiş Tarihi">
                    <DatePicker value={form.inspectionExpiry} onChange={(v) => set("inspectionExpiry", v)} />
                  </Field>
                  <PastDateHint value={form.inspectionExpiry} />
                </DocCard>

                <DocCard
                  title="Kasko"
                  icon={ShieldCheck}
                  slot={docs.kasko}
                  attachLabel="Poliçe ekle"
                  onAttach={(f) => attachDoc("kasko", f)}
                  onScan={() => scanDoc("kasko")}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Kasko Şirketi" htmlFor="kaskoCompany">
                      <Input id="kaskoCompany" className={cls} placeholder="Allianz, Axa..." value={form.kaskoCompany} onChange={(e) => set("kaskoCompany", e.target.value)} />
                    </Field>
                    <Field label="Bitiş Tarihi">
                      <DatePicker value={form.kaskoExpiry} onChange={(v) => set("kaskoExpiry", v)} />
                    </Field>
                  </div>
                  <PastDateHint value={form.kaskoExpiry} />
                  <p className="text-[10px] text-muted-foreground">Kasko yoksa boş bırakın.</p>
                </DocCard>
              </>
            )}

            {/* ── ADIM 3: EK BİLGİLER ── */}
            {step === 3 && (
              <>
                <p className="text-xs text-muted-foreground px-1">Hepsi isteğe bağlı; sonradan araç detayından da doldurabilirsiniz.</p>

                {/* Fotoğraflar */}
                <div className="space-y-2">
                  {form.image ? (
                    <>
                      <div className="flex items-center justify-end px-1">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, imagePosition: 50, imagePositionX: 50 }))}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          Ortala
                        </button>
                      </div>
                      <div className="relative h-44 rounded-2xl overflow-hidden border-2 border-dashed border-border/50 bg-muted/30">
                        <ImagePositioner
                          imageUrl={form.image}
                          x={form.imagePositionX}
                          y={form.imagePosition}
                          onChange={({ x, y }) => setForm((prev) => ({ ...prev, imagePositionX: x, imagePosition: y }))}
                          className="absolute inset-0"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-3 py-2 pointer-events-none">
                          <label className="pointer-events-auto cursor-pointer bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors">
                            Değiştir
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                          </label>
                          <button
                            type="button"
                            onClick={() => set("image", "")}
                            className="pointer-events-auto bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">Odak noktasını ayarlamak için görseli sürükleyin</p>
                    </>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="relative h-36 rounded-2xl border-2 border-dashed border-border/50 overflow-hidden bg-muted/30 flex items-center justify-center hover:border-primary/50 transition-colors">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Camera className="h-7 w-7" />
                          <span className="text-sm font-medium">Araç fotoğrafı ekle</span>
                        </div>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                    </label>
                  )}

                  {/* Ek fotoğraflar — toplamda 4 (ana + 3 ek) */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { field: "image2", label: "Arka" },
                      { field: "image3", label: "Sol Yan" },
                      { field: "image4", label: "Sağ Yan" },
                    ] as const).map(({ field, label }) => {
                      const val = form[field];
                      return (
                        <div key={field} className="relative">
                          <label className="block cursor-pointer">
                            <div className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-border/50 overflow-hidden bg-muted/30 flex items-center justify-center hover:border-primary/50 transition-colors">
                              {val ? (
                                <div className="absolute inset-0" style={{ backgroundImage: `url(${val})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <Camera className="h-4 w-4" />
                                  <span className="text-[10px] font-medium">{label}</span>
                                </div>
                              )}
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleExtraPhoto(field, e.target.files?.[0] ?? null)} />
                          </label>
                          {val && (
                            <button
                              type="button"
                              onClick={() => set(field, "")}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                              aria-label={`${label} fotoğrafını kaldır`}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Araç Bilgileri</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Renk" htmlFor="color">
                        <AutocompleteInput id="color" options={COLORS} value={form.color} onChange={(v) => set("color", v)} placeholder="Beyaz, Siyah..." className={cls} allowFreeText />
                      </Field>
                      <Field label="Şasi No (VIN)" htmlFor="chassisNo">
                        <Input id="chassisNo" className={cls} maxLength={17} placeholder="17 karakter" value={form.chassisNo} onChange={(e) => set("chassisNo", e.target.value.toUpperCase().replace(/\s+/g, ""))} />
                      </Field>
                    </div>
                    {chassisLooksOdd && <Hint>Şasi numarası genelde 17 karakterdir ve I, O, Q harflerini içermez.</Hint>}
                    <Field label="Ruhsat Sahibi" htmlFor="ruhsatSahibi">
                      <Input id="ruhsatSahibi" className={cls} placeholder="Ad Soyad veya Firma Adı" value={form.ruhsatSahibi} onChange={(e) => set("ruhsatSahibi", e.target.value)} />
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
                      <Field label="Kiralama Firması" htmlFor="rentCompany">
                        <Input id="rentCompany" className={cls} placeholder="Europcar, Avis, Sixt..." value={form.rentCompany} onChange={(e) => set("rentCompany", e.target.value)} />
                      </Field>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lastik</h3>
                    <Field label="Takılı Lastik">
                      <Select value={form.tireStatus} onValueChange={(v) => v && set("tireStatus", v as TireSeasonType)}>
                        <SelectTrigger className={cls}><SelectValue /></SelectTrigger>
                        <SelectContent>{TIRE_SEASONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Hint tone="info">Mevsime göre önceden seçildi; farklıysa değiştirin.</Hint>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Marka" htmlFor="tireBrand">
                        <Input id="tireBrand" className={cls} placeholder="Michelin" value={form.tireBrand} onChange={(e) => set("tireBrand", e.target.value)} />
                      </Field>
                      <Field label="Ebat" htmlFor="tireSize">
                        <Input id="tireSize" className={cls} placeholder="225/45 R17" value={form.tireSize} onChange={(e) => set("tireSize", e.target.value)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Takılma Tarihi">
                        <DatePicker value={form.tireInstallDate} onChange={(v) => set("tireInstallDate", v)} />
                      </Field>
                      <Field label="Takıldığındaki km" htmlFor="tireMileage">
                        <Input id="tireMileage" className={cls} inputMode="numeric" placeholder="0" value={form.maintenanceMode === "new" ? form.mileage : form.tireMileage} disabled={form.maintenanceMode === "new"} onChange={(e) => set("tireMileage", e.target.value)} />
                      </Field>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Akü</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Marka" htmlFor="batteryBrand">
                        <Input id="batteryBrand" className={cls} placeholder="Bosch" value={form.batteryBrand} onChange={(e) => set("batteryBrand", e.target.value)} />
                      </Field>
                      <Field label="Kapasite" htmlFor="batteryCapacity">
                        <Input id="batteryCapacity" className={cls} placeholder="72Ah" value={form.batteryCapacity} onChange={(e) => set("batteryCapacity", e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Değişim Tarihi">
                      <DatePicker value={form.batteryInstallDate} onChange={(v) => set("batteryInstallDate", v)} />
                    </Field>
                    <Hint tone="info">Akü ömrü genelde 3–5 yıl ya da 60.000–100.000 km&apos;dir.</Hint>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/40">
                  <CardContent className="p-4">
                    <Field label="Notlar" htmlFor="notes">
                      <textarea
                        id="notes"
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
          {step === 1 && !basicsValid && missing.length > 0 && (
            <p className="text-[11px] text-center text-muted-foreground">Eksik: {missing.join(", ")}</p>
          )}
          {step < steps.length ? (
            <>
              <Button
                className="w-full h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20 gap-2"
                onClick={() => { setStep((s) => s + 1); window.scrollTo({ top: 0 }); }}
                disabled={step === 1 && !basicsValid}
              >
                Devam <ChevronRight className="h-4 w-4" />
              </Button>
              {/* Belgeler ve ek bilgiler opsiyonel — temel bilgiler tamamsa hemen kaydedilebilir */}
              {basicsValid && (
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                  className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 disabled:opacity-40"
                >
                  {saving ? "Kaydediliyor…" : "Kalan adımları atla, aracı şimdi kaydet"}
                </button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-semibold gap-2"
                onClick={() => handleSubmit(true)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kaydet ve Yeni Ekle"}
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold shadow-lg shadow-primary/20 gap-2"
                onClick={() => handleSubmit(false)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Aracı Kaydet</>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Belgeden okunan bilgiler — uygulamadan önce onay */}
    <Dialog open={!!review} onOpenChange={(o) => { if (!o) setReview(null); }}>
      <DialogContent className="rounded-3xl max-w-[92vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-outfit flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Belgeden okunanlar
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          İşaretli alanlar forma yazılır. Sizin girdiğinizden farklı olanlar işaretsiz gelir; belge okuması hatalı olabilir.
        </p>
        {review && (
          <div className="rounded-2xl border border-border/40 divide-y divide-border/30">
            {review.rows.map((r, i) => {
              const display = DATE_KEYS.has(r.key) ? formatDateTr(r.value) : r.value;
              return (
                <label key={r.key} className={`flex items-start gap-3 px-3.5 py-2.5 ${r.same ? "opacity-60" : "cursor-pointer hover:bg-muted/40"}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    disabled={r.same}
                    checked={r.same || r.checked}
                    onChange={(e) => setReview((prev) => prev && ({
                      ...prev,
                      rows: prev.rows.map((row, j) => (j === i ? { ...row, checked: e.target.checked } : row)),
                    }))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</span>
                    <span className="block text-sm font-semibold break-words">{display}</span>
                    {r.same ? (
                      <span className="block text-[11px] text-emerald-600 dark:text-emerald-400">Girdiğinizle aynı</span>
                    ) : r.current ? (
                      <span className="block text-[11px] text-amber-600 dark:text-amber-400">
                        Şu an: {DATE_KEYS.has(r.key) ? formatDateTr(r.current) : r.current}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <DialogClose render={<Button variant="outline" className="w-full sm:w-auto rounded-xl" />}>Vazgeç</DialogClose>
          <Button onClick={applyReview} className="w-full sm:w-auto rounded-xl gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {(() => {
              const n = review?.rows.filter((r) => r.checked && !r.same).length ?? 0;
              return n > 0 ? `${n} Alanı Uygula` : "Tamam";
            })()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// Belge kartı: alanlar + isteğe bağlı dosya ekleme ve belgeden okuma.
function DocCard({
  title, icon: Icon, slot, attachLabel, onAttach, onScan, children,
}: {
  title: string;
  icon: React.FC<{ className?: string }>;
  slot: DocSlot;
  attachLabel: string;
  onAttach: (file: File | null) => boolean;
  onScan: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold flex-1">{title}</h3>
        </div>
        {children}
        {slot.file ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 min-w-0 text-xs truncate">{slot.file.name}</span>
            {slot.scanning ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Okunuyor…
              </span>
            ) : (
              <>
                <button type="button" onClick={onScan} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0">
                  <Sparkles className="h-3 w-3" /> Belgeden oku
                </button>
                <button type="button" aria-label="Dosyayı kaldır" onClick={() => onAttach(null)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <XCircle className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ) : (
          <label className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-primary transition-colors">
            <Paperclip className="h-3.5 w-3.5" /> {attachLabel} <span className="opacity-70">(isteğe bağlı)</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; if (f) onAttach(f); }}
            />
          </label>
        )}
      </CardContent>
    </Card>
  );
}

// Kayıt sonrası: sık yapılan sonraki işler tek ekranda.
function CreatedScreen({ vehicle, onAddAnother }: { vehicle: CreatedVehicle; onAddAnother: () => void }) {
  const router = useRouter();
  const [drivers, setDrivers] = useState<{ id: string; fullName: string }[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  const openPicker = () => {
    setPicking(true);
    if (drivers) return;
    getDrivers()
      .then((list) => setDrivers(list.map((d) => ({ id: d.id, fullName: d.fullName || "İsimsiz sürücü" }))))
      .catch((err) => {
        console.error("getDrivers failed:", err instanceof Error ? err.message : err);
        setDrivers([]);
        toast.error("Sürücüler yüklenemedi");
      });
  };

  const assign = async (driver: { id: string; fullName: string }) => {
    setAssigning(driver.id);
    try {
      await assignVehiclesToDriver([vehicle.id], driver.id);
      setAssignedTo(driver.fullName);
      setPicking(false);
      toast.success("Sürücü atandı", { description: `${vehicle.plate} artık ${driver.fullName} kullanımında.` });
    } catch (err) {
      console.error("Assign failed:", err instanceof Error ? err.message : err);
      toast.error("Atama yapılamadı", { description: "Lütfen tekrar deneyin." });
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[70dvh] p-6 pt-14 max-w-md mx-auto">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mb-5">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
      </motion.div>
      <h2 className="text-xl font-outfit font-bold text-center">Araç Eklendi</h2>
      <p className="text-sm text-muted-foreground mt-1 text-center">
        <span className="font-mono font-semibold text-foreground">{vehicle.plate}</span> · {vehicle.name}
      </p>
      {assignedTo && (
        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Sürücü: {assignedTo}</p>
      )}

      <div className="w-full mt-8 space-y-2.5">
        {!assignedTo && (
          picking ? (
            <Card className="rounded-2xl border-border/40">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <p className="text-sm font-semibold">Sürücü seçin</p>
                  <button type="button" onClick={() => setPicking(false)} className="text-xs text-muted-foreground hover:text-foreground">Vazgeç</button>
                </div>
                {drivers === null ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
                  </div>
                ) : drivers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Henüz sürücü yok. <Link href="/users" className="text-primary font-semibold hover:underline">Ekibe sürücü ekleyin</Link>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
                    {drivers.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!!assigning}
                        onClick={() => assign(d)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                      >
                        <span className="font-medium truncate">{d.fullName}</span>
                        {assigning === d.id ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Button className="w-full h-12 rounded-2xl font-semibold gap-2" onClick={openPicker}>
              <UserPlus className="h-4 w-4" /> Sürücü Ata
            </Button>
          )
        )}
        <Button variant="outline" className="w-full h-12 rounded-2xl font-semibold gap-2" onClick={() => router.push(`/vehicles/${vehicle.id}`)}>
          <Car className="h-4 w-4" /> Araç Detayına Git
        </Button>
        <Button variant="outline" className="w-full h-12 rounded-2xl font-semibold gap-2" onClick={onAddAnother}>
          <Plus className="h-4 w-4" /> Yeni Araç Ekle
        </Button>
        <Button variant="ghost" className="w-full h-11 rounded-2xl text-muted-foreground" onClick={() => router.push("/vehicles")}>
          Araçlarıma Dön
        </Button>
      </div>
    </div>
  );
}
