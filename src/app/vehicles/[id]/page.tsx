"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import {
  getVehicles, updateVehicle, deleteVehicle, getVehicle,
  getVehicleRecords, addRecord, deleteRecord,
} from "@/lib/db";
import { useDemoGuard } from "@/hooks/use-demo-guard";
import {
  calculateHealthScore, getMaintenanceStatusForItem,
  getMaintenanceProgress, MAINTENANCE_TEMPLATES,
} from "@/lib/store";
import type { Vehicle, ServiceRecord, ServiceType, FuelType, TransmissionType, TireSeasonType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, Settings, Trash2, Car, Fuel, Gauge, MapPin, Disc3,
  Sun, Snowflake, Layers, BatteryCharging, ShieldCheck, CalendarDays,
  Wrench, Clock, CheckCircle2, AlertTriangle, XCircle, Plus, FileText,
  Palette, Zap, Hash, ChevronRight, Pencil, FileDown, ChevronDown,
} from "lucide-react";
import { exportVehicleReportPDF } from "@/lib/pdf-export";
import { DatePicker } from "@/components/ui/date-picker";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

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
const FUEL_TYPES: FuelType[] = ["Benzin","Dizel","LPG","Hibrit","Elektrik"];
const TRANSMISSIONS: TransmissionType[] = ["Manuel","Otomatik","CVT","DSG","Yarı Otomatik"];
const TIRE_SEASONS: TireSeasonType[] = ["Yazlık","Kışlık","Dört Mevsim"];
const COLORS = ["Beyaz","Siyah","Gri","Gümüş","Kırmızı","Mavi","Yeşil","Kahverengi","Bej","Sarı","Turuncu","Mor","Diğer"];
const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "routine", label: "Periyodik Bakım" },
  { value: "repair", label: "Onarım" },
  { value: "tire", label: "Lastik" },
  { value: "inspection", label: "Muayene" },
  { value: "battery", label: "Akü" },
  { value: "other", label: "Diğer" },
];

const statusColor = { good: "bg-emerald-500", warning: "bg-amber-500", overdue: "bg-red-500" };
const statusBadge = {
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const statusLabel = { good: "İyi", warning: "Yaklaşıyor", overdue: "Gecikmeli" };
const statusIcon = { good: CheckCircle2, warning: AlertTriangle, overdue: XCircle };

const typeColor = {
  routine: "bg-violet-500/10 text-violet-500",
  repair: "bg-orange-500/10 text-orange-500",
  tire: "bg-teal-500/10 text-teal-500",
  inspection: "bg-violet-500/10 text-violet-500",
  battery: "bg-yellow-500/10 text-yellow-500",
  other: "bg-gray-500/10 text-gray-500",
};
const typeLabel: Record<ServiceType, string> = {
  routine: "Periyodik", repair: "Onarım", tire: "Lastik",
  inspection: "Muayene", battery: "Akü", other: "Diğer",
};

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

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function parseKm(value: string | number): number {
  if (typeof value === "number") return Math.round(value);
  return parseInt(value.replace(/\./g, "").replace(/,/g, ""), 10) || 0;
}

function daysBadge(days: number) {
  if (days < 0) return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (days < 30) return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
  if (days < 90) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

function daysBadgeText(days: number): string {
  if (days < 0) return `${Math.abs(days)} gün geçti`;
  if (days === 0) return "Bugün";
  return `${days} gün`;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const guardDemo = useDemoGuard();
  const { loading: authLoading, company, profile } = useAuth();
  const isDriver = profile?.role === "driver";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showDeleteRecord, setShowDeleteRecord] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [showMaintEdit, setShowMaintEdit] = useState(false);
  const [maintEditItem, setMaintEditItem] = useState<{ id: string; name: string; intervalKm?: number } | null>(null);
  const [maintEditDate, setMaintEditDate] = useState("");
  const [maintEditKm, setMaintEditKm] = useState("");

  const [editData, setEditData] = useState<Partial<Vehicle>>({});
  const [recordForm, setRecordForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "routine" as ServiceType,
    title: "",
    mileage: "",
    serviceCenter: "",
    notes: "",
  });

  const reload = useCallback(async () => {
    try {
      const v = await getVehicle(id);
      if (!v) { router.push("/vehicles"); return; }
      setVehicle(v);
      const recs = await getVehicleRecords(id);
      setRecords(recs);
    } catch (err) {
      console.error(err);
    }
  }, [id, router]);

  useEffect(() => {
    if (!authLoading && company) reload();
  }, [authLoading, company, reload]);

  if (!vehicle) return null;

  const score = calculateHealthScore(vehicle);
  const hasAnyMaintenanceData = vehicle.maintenanceItems.some(
    (item) => item.lastDoneDate !== undefined || item.lastDoneMileage !== undefined
  ) || !!vehicle.lastServiceDate;

  const openEdit = () => {
    setEditData({ ...vehicle });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (guardDemo()) { setShowEdit(false); return; }
    try {
      await updateVehicle(vehicle.id, editData);
      setShowEdit(false);
      reload();
      toast.success("Güncellendi", { description: "Araç bilgileri kaydedildi." });
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "Araç güncellenirken hata oluştu." });
    }
  };

  const handleDelete = async () => {
    if (guardDemo()) return;
    try {
      await deleteVehicle(vehicle.id);
      toast.success("Silindi", { description: "Araç başarıyla silindi." });
      router.push("/vehicles");
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "Araç silinirken hata oluştu." });
    }
  };

  const handleSaveMaintEdit = async () => {
    if (!maintEditItem) return;
    if (guardDemo()) { setShowMaintEdit(false); return; }
    const updatedItems = vehicle.maintenanceItems.map((item) =>
      item.id === maintEditItem.id
        ? {
            ...item,
            lastDoneDate: maintEditDate || undefined,
            lastDoneMileage: maintEditKm ? parseKm(maintEditKm) : undefined,
          }
        : item
    );
    try {
      await updateVehicle(vehicle.id, { maintenanceItems: updatedItems });
      setShowMaintEdit(false);
      reload();
      toast.success("Güncellendi", { description: "Bakım bilgisi kaydedildi." });
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "Bakım bilgisi kaydedilemedi." });
    }
  };

  const handleAddRecord = async () => {
    if (guardDemo()) { setShowAddRecord(false); return; }
    try {
      await addRecord({
        vehicleId: vehicle.id,
        date: recordForm.date,
        type: recordForm.type,
        title: recordForm.title,
        mileage: recordForm.mileage ? parseKm(recordForm.mileage) : vehicle.mileage,
        serviceCenter: recordForm.serviceCenter,
        notes: recordForm.notes,
      });
      setShowAddRecord(false);
      setRecordForm({ date: new Date().toISOString().split("T")[0], type: "routine", title: "", mileage: "", serviceCenter: "", notes: "" });
      reload();
      toast.success("Kayıt Eklendi", { description: "Servis kaydı başarıyla eklendi." });
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "Kayıt eklenirken hata oluştu." });
    }
  };

  const iLabel = "text-xs font-medium text-muted-foreground";
  const iCls = "rounded-xl h-10 bg-muted/30 border-border/40 text-sm";

  return (
    <div className="bg-background min-h-screen">
      {/* Mobile sticky header */}
      <div className="sticky top-0 z-50 glass border-b border-border/30 md:hidden">
        <div className="flex items-center justify-between p-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-9 w-9 hover:bg-primary/10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-outfit font-bold text-sm">{vehicle.plate}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-primary/10" onClick={() => exportVehicleReportPDF(vehicle, records)}>
              <FileDown className="h-4 w-4 text-muted-foreground" />
            </Button>
            {!isDriver && (
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-destructive/10 text-destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!isDriver && (
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-primary/10" onClick={openEdit}>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto md:p-6">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 shadow-sm">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-outfit">{vehicle.plate}</h1>
              <p className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model} • {vehicle.year}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {!isDriver && (
              <Button variant="outline" className="gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" /> Sil
              </Button>
            )}
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => exportVehicleReportPDF(vehicle, records)}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            {!isDriver && (
              <Button variant="outline" className="gap-2 rounded-xl" onClick={openEdit}>
                <Settings className="h-4 w-4" /> Düzenle
              </Button>
            )}
          </div>
        </div>

        {/* Hero image */}
        <div className="relative h-56 md:h-80 w-full bg-muted md:rounded-3xl overflow-hidden shadow-md">
          {vehicle.image ? (
            <>
              <div
                className="absolute inset-0 scale-110"
                style={{
                  backgroundImage: `url(${vehicle.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: `center ${vehicle.imagePosition ?? 50}%`,
                  filter: "blur(18px) brightness(0.55) saturate(1.4)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${vehicle.image})`,
                  backgroundSize: "contain",
                  backgroundPosition: `center ${vehicle.imagePosition ?? 50}%`,
                  backgroundRepeat: "no-repeat",
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-primary/10 flex items-center justify-center">
              <Car className="h-24 w-24 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-outfit font-black text-foreground drop-shadow-lg">
                {vehicle.brand} <span className="font-light">{vehicle.model}</span>
              </motion.h1>
              <p className="text-muted-foreground font-medium text-sm">{vehicle.year} • {vehicle.color} • {vehicle.mileage.toLocaleString("tr-TR")} km</p>
            </div>
            <div className="bg-card/80 backdrop-blur-md rounded-2xl p-2.5 border border-border/50 shadow-lg">
              <div className="relative">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                  <circle cx="28" cy="28" r="22" fill="none"
                    stroke={score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="4"
                    strokeDasharray={`${score * 1.382} ${138.2 - score * 1.382}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black font-outfit leading-none">{score}</span>
                  <span className="text-[8px] text-muted-foreground font-medium">Sağlık</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="p-4 md:p-0 space-y-5 md:space-y-6 pb-28 md:pb-10 mt-4">
          {/* Spec chips */}
          <motion.div variants={fadeUp} className={`grid gap-2 ${vehicle.power ? "grid-cols-4" : "grid-cols-3"}`}>
            {[
              { icon: Fuel, label: "Yakıt", value: vehicle.fuelType },
              { icon: Gauge, label: "Vites", value: vehicle.transmission.replace("Yarı Otomatik", "Y. Otm.") },
              vehicle.power ? { icon: Zap, label: "Güç", value: `${vehicle.power} HP` } : null,
              { icon: MapPin, label: "Km", value: `${(vehicle.mileage / 1000).toFixed(0)}K` },
            ].filter((s): s is NonNullable<typeof s> => s !== null).map((spec, i) => (
              <div key={i} className="bg-muted/50 rounded-2xl p-2.5 flex flex-col items-center gap-1 border border-border/30">
                <spec.icon className="h-4 w-4 text-primary" />
                <span className="text-[9px] text-muted-foreground font-medium">{spec.label}</span>
                <span className="text-[11px] font-bold text-center leading-tight">{spec.value}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp}>
            <Tabs defaultValue="maintenance" className="w-full">
              <TabsList className="grid w-full grid-cols-5 rounded-2xl h-11 bg-muted/50 p-1">
                {[
                  { value: "maintenance", label: "Bakım" },
                  { value: "technical", label: "Teknik" },
                  { value: "tires", label: "Lastik" },
                  { value: "docs", label: "Belgeler" },
                  { value: "history", label: "Geçmiş" },
                ].map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="rounded-xl text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-4 space-y-4">
                {/* ── BAKIM ── */}
                <TabsContent value="maintenance" className="space-y-3 outline-none">
                  {vehicle.maintenanceItems.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Bakım verisi bulunamadı.</p>
                      <p className="text-xs mt-1">Bu araç eski bir kayıt olabilir.</p>
                    </div>
                  )}

                  {/* No maintenance data warning */}
                  {!hasAnyMaintenanceData && vehicle.maintenanceItems.length > 0 && (
                    <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Bakım bilgisi girilmemiş</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Bu araç için henüz bakım veya servis bilgisi girilmedi. Doğru takip yapabilmek için lütfen her kalemin son yapılma tarih ve kilometresini güncelleyin.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Simplified list when no data; full cards when data exists */}
                  {!hasAnyMaintenanceData
                    ? vehicle.maintenanceItems.map((item) => (
                        <div key={item.id} className="bg-card rounded-2xl px-4 py-3 border border-border/40 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground/40" />
                            <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setMaintEditItem({ id: item.id, name: item.name, intervalKm: item.intervalKm });
                              setMaintEditDate(item.lastDoneDate || "");
                              setMaintEditKm(item.lastDoneMileage !== undefined ? String(item.lastDoneMileage) : "");
                              setShowMaintEdit(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    : vehicle.maintenanceItems.map((item) => {
                        const status = getMaintenanceStatusForItem(item, vehicle.mileage);
                        const progress = getMaintenanceProgress(item, vehicle.mileage);
                        const Icon = statusIcon[status];
                        const hasData = item.lastDoneDate !== undefined || item.lastDoneMileage !== undefined;
                        return (
                          <div key={item.id} className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${status === "good" ? "text-emerald-500" : status === "warning" ? "text-amber-500" : "text-red-500"}`} />
                                <span className="text-sm font-semibold">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!hasData && (
                                  <span className="text-[10px] text-amber-500 font-medium">Veri yok</span>
                                )}
                                <Badge className={`text-[10px] font-bold border-none ${statusBadge[status]}`}>
                                  {statusLabel[status]}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    setMaintEditItem({ id: item.id, name: item.name, intervalKm: item.intervalKm });
                                    setMaintEditDate(item.lastDoneDate || "");
                                    setMaintEditKm(item.lastDoneMileage !== undefined ? String(item.lastDoneMileage) : "");
                                    setShowMaintEdit(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <Progress value={progress} className="h-2 mb-2" indicatorClassName={statusColor[status]} />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>
                                {item.lastDoneMileage !== undefined ? `Son: ${item.lastDoneMileage.toLocaleString("tr-TR")} km` : item.lastDoneDate ? `Son: ${item.lastDoneDate.split("-").reverse().join(".")}` : "Kayıt yok"}
                              </span>
                              <span>
                                {item.intervalKm && item.lastDoneMileage !== undefined
                                  ? (() => {
                                      const rem = (item.lastDoneMileage + item.intervalKm) - vehicle.mileage;
                                      return rem > 0 ? `${rem.toLocaleString("tr-TR")} km kaldı` : `${Math.abs(rem).toLocaleString("tr-TR")} km geçti`;
                                    })()
                                  : item.intervalMonths && item.lastDoneDate
                                  ? `${item.intervalMonths} aylık`
                                  : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                  {/* Son Servis — only when maintenance data exists */}
                  {hasAnyMaintenanceData && (
                    <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm flex items-center gap-3">
                      <div className="p-2 bg-violet-500/10 rounded-xl shrink-0">
                        <Clock className="h-5 w-5 text-violet-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Son Servis</p>
                        <p className="text-sm font-bold">{vehicle.lastServiceDate ? vehicle.lastServiceDate.split("-").reverse().join(".") : "—"}</p>
                        {vehicle.lastServiceMileage > 0 && <p className="text-[10px] text-muted-foreground">{vehicle.lastServiceMileage.toLocaleString("tr-TR")} km'de</p>}
                      </div>
                      {vehicle.nextServiceMileage > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Sonraki</p>
                          <p className="text-sm font-bold text-primary">{vehicle.nextServiceMileage.toLocaleString("tr-TR")} km</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── TEKNİK ── */}
                <TabsContent value="technical" className="outline-none">
                  <div className="bg-card rounded-2xl border border-border/40 shadow-sm divide-y divide-border/30">
                    {[
                      { icon: Car, label: "Marka / Model", value: `${vehicle.brand} ${vehicle.model}` },
                      { icon: CalendarDays, label: "Yıl", value: String(vehicle.year) },
                      { icon: Palette, label: "Renk", value: vehicle.color },
                      { icon: Fuel, label: "Yakıt Tipi", value: vehicle.fuelType },
                      { icon: Gauge, label: "Vites Kutusu", value: vehicle.transmission },
                      vehicle.engineVolume ? { icon: Zap, label: "Motor Hacmi", value: `${vehicle.engineVolume} L` } : null,
                      vehicle.power ? { icon: Zap, label: "Motor Gücü", value: `${vehicle.power} HP` } : null,
                      vehicle.engineType ? { icon: Hash, label: "Motor Kodu", value: vehicle.engineType } : null,
                      { icon: MapPin, label: "Kilometre", value: `${vehicle.mileage.toLocaleString("tr-TR")} km` },
                      vehicle.chassisNo ? { icon: FileText, label: "Şasi No", value: vehicle.chassisNo } : null,
                    ].filter((r): r is NonNullable<typeof r> => r !== null).map((row, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <row.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground flex-1">{row.label}</span>
                        <span className="text-xs font-semibold text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {vehicle.notes && (
                    <div className="bg-muted/40 rounded-2xl p-4 border border-border/20 mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Notlar</p>
                      <p className="text-sm leading-relaxed">{vehicle.notes}</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── LASTİK ── */}
                <TabsContent value="tires" className="space-y-3 outline-none">
                  <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <Disc3 className="h-4 w-4 text-primary" /> Lastik Durumu
                        </h3>
                        {vehicle.tireBrand && <p className="text-[11px] text-muted-foreground mt-1">{vehicle.tireBrand} {vehicle.tireSize && `• ${vehicle.tireSize}`}</p>}
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${vehicle.tireStatus === "Yazlık" ? "bg-orange-500/10 border-orange-500/20 text-orange-600" : vehicle.tireStatus === "Kışlık" ? "bg-violet-500/10 border-violet-500/20 text-violet-600" : "bg-teal-500/10 border-teal-500/20 text-teal-600"}`}>
                        {vehicle.tireStatus === "Yazlık" ? <Sun className="h-4 w-4" /> : vehicle.tireStatus === "Kışlık" ? <Snowflake className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                        {vehicle.tireStatus}
                      </div>
                    </div>

                    {/* Tire diagram */}
                    <div className="bg-muted/40 rounded-2xl p-4 border border-border/20 mb-4">
                      <div className="grid grid-cols-2 gap-x-12 gap-y-4 relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-20 h-28 border-2 border-dashed border-border/40 rounded-xl" />
                        </div>
                        {["Sol Ön", "Sağ Ön", "Sol Arka", "Sağ Arka"].map((pos, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 relative z-10">
                            <div className="w-10 h-14 bg-foreground/10 rounded-lg border-2 border-foreground/20 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-muted-foreground">
                                {vehicle.tireStatus === "Yazlık" ? "Y" : vehicle.tireStatus === "Kışlık" ? "K" : "4M"}
                              </span>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-medium">{pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {vehicle.tireInstallDate && (
                        <div className="bg-muted/50 rounded-xl p-3 border border-border/20">
                          <p className="text-[10px] text-muted-foreground">Takılma Tarihi</p>
                          <p className="text-xs font-bold mt-0.5">{vehicle.tireInstallDate.split("-").reverse().join(".")}</p>
                        </div>
                      )}
                      {vehicle.tireMileage >= 0 && (
                        <div className="bg-muted/50 rounded-xl p-3 border border-border/20">
                          <p className="text-[10px] text-muted-foreground">Yapılan Km</p>
                          <p className="text-xs font-bold mt-0.5">{(vehicle.mileage - vehicle.tireMileage).toLocaleString("tr-TR")} km</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <BatteryCharging className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Akü Durumu</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {vehicle.batteryBrand || "—"} {vehicle.batteryCapacity && `• ${vehicle.batteryCapacity}`}
                      </p>
                      {vehicle.batteryInstallDate && (
                        <p className="text-[10px] text-muted-foreground">
                          Değişim: {vehicle.batteryInstallDate.split("-").reverse().join(".")}
                        </p>
                      )}
                    </div>
                    {vehicle.batteryInstallDate && (() => {
                      const months = Math.floor((Date.now() - new Date(vehicle.batteryInstallDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                      const status = months < 24 ? "İyi" : months < 36 ? "Orta" : "Eski";
                      const color = months < 24 ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : months < 36 ? "border-amber-500/30 text-amber-500 bg-amber-500/5" : "border-red-500/30 text-red-500 bg-red-500/5";
                      return <Badge variant="outline" className={`${color} text-[10px] font-bold`}>{status}</Badge>;
                    })()}
                  </div>
                </TabsContent>

                {/* ── BELGELER ── */}
                <TabsContent value="docs" className="space-y-3 outline-none">
                  <div className="bg-card rounded-2xl p-5 border border-border/40 shadow-sm space-y-4">
                    {[
                      { icon: ShieldCheck, iconBg: "bg-violet-500/10", iconColor: "text-violet-500", label: "Kasko & Sigorta", sub: vehicle.insuranceCompany || "—", date: vehicle.insuranceExpiry },
                      { icon: ShieldCheck, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", label: "Yurtdışı Sigortası (Yeşil Kart)", sub: vehicle.greenCardCompany || "—", date: vehicle.greenCardExpiry },
                      { icon: CalendarDays, iconBg: "bg-violet-500/10", iconColor: "text-violet-500", label: "TÜVTÜRK Muayene", sub: "", date: vehicle.inspectionExpiry },
                    ].map((doc, i) => {
                      const days = daysUntil(doc.date);
                      return (
                        <div key={i}>
                          {i > 0 && <Separator />}
                          <div className={`flex justify-between items-center ${i > 0 ? "pt-4" : ""}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 ${doc.iconBg} rounded-xl`}>
                                <doc.icon className={`h-4 w-4 ${doc.iconColor}`} />
                              </div>
                              <div>
                                <p className="text-[11px] text-muted-foreground">{doc.label}</p>
                                {doc.sub && <p className="text-[10px] text-muted-foreground">{doc.sub}</p>}
                                <p className="text-sm font-bold">{doc.date ? doc.date.split("-").reverse().join(".") : "—"}</p>
                              </div>
                            </div>
                            {doc.date && (
                              <Badge variant="secondary" className={`${daysBadge(days)} border-none text-[10px] font-bold`}>
                                {daysBadgeText(days)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {vehicle.chassisNo && (
                    <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" /> Şasi Numarası
                      </p>
                      <div className="bg-muted/50 rounded-xl p-3 border border-border/20">
                        <code className="text-xs font-mono tracking-wider text-muted-foreground select-all">{vehicle.chassisNo}</code>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── GEÇMİŞ ── */}
                <TabsContent value="history" className="outline-none">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-muted-foreground">{records.length} servis kaydı</p>
                    <Button size="sm" className="rounded-full h-8 px-3 gap-1.5 text-xs" onClick={() => setShowAddRecord(true)}>
                      <Plus className="h-3.5 w-3.5" /> Kayıt Ekle
                    </Button>
                  </div>

                  {records.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Henüz servis kaydı yok.</p>
                    </div>
                  ) : (
                    <div className="relative ml-4 space-y-4">
                      <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent" />
                      {records.map((record) => (
                        <div key={record.id} className="relative pl-6">
                          <div className={`absolute -left-2.5 top-3.5 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center shadow-sm ${typeColor[record.type]}`}>
                            <Wrench className="h-2.5 w-2.5" />
                          </div>
                          <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h3 className="font-bold text-sm">{record.title}</h3>
                                  <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 border-none font-bold ${typeColor[record.type]}`}>
                                    {typeLabel[record.type]}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{record.date.split("-").reverse().join(".")} • {record.serviceCenter}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold">{record.mileage.toLocaleString("tr-TR")} km</span>
                                {!isDriver && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive" onClick={() => {
                                    setRecordToDelete(record.id);
                                    setShowDeleteRecord(true);
                                  }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {record.notes && (
                              <div className="bg-muted/40 rounded-xl p-2.5 text-[11px] text-muted-foreground leading-relaxed mt-2">
                                {record.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      {/* ── DELETE DIALOG ── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Aracı Sil
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            <b>{vehicle.plate}</b> plakalı aracı ve tüm servis kayıtlarını silmek istediğinize emin misiniz?
          </p>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-[92vw] md:max-w-2xl rounded-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-outfit">Araç Düzenle</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-5">
            {/* Fotoğraf */}
            <div className="space-y-2">
              <Label className={iLabel}>Araç Fotoğrafı</Label>
              <div className="relative h-36 rounded-2xl overflow-hidden border-2 border-dashed border-border/50 bg-muted/30 group">
                {editData.image ? (
                  <>
                    {/* Blurred backdrop */}
                    <div
                      className="absolute inset-0 scale-110"
                      style={{
                        backgroundImage: `url(${editData.image})`,
                        backgroundSize: "cover",
                        backgroundPosition: `center ${editData.imagePosition ?? 50}%`,
                        filter: "blur(14px) brightness(0.55) saturate(1.4)",
                      }}
                    />
                    {/* Full image */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${editData.image})`,
                        backgroundSize: "contain",
                        backgroundPosition: `center ${editData.imagePosition ?? 50}%`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors">
                        Değiştir
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => setEditData((d) => ({ ...d, image: reader.result as string }));
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditData((d) => ({ ...d, image: "" }))}
                        className="bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Sil
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <Car className="h-8 w-8 opacity-30" />
                    <span className="text-xs font-medium">Fotoğraf ekle</span>
                    <span className="text-[10px] opacity-60">Tıkla veya dosya seç</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => setEditData((d) => ({ ...d, image: reader.result as string }));
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                )}
              </div>
              {editData.image && (
                <div className="space-y-1.5 px-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">Üst</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={editData.imagePosition ?? 50}
                      onChange={(e) => setEditData((d) => ({ ...d, imagePosition: Number(e.target.value) }))}
                      className="flex-1 accent-primary cursor-pointer"
                    />
                    <span className="text-[10px] text-muted-foreground w-12 shrink-0">Alt</span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Kimlik</p>
                <div className="space-y-1"><Label className={iLabel}>Plaka</Label><Input className={iCls} value={editData.plate || ""} onChange={(e) => setEditData((d) => ({ ...d, plate: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className={iLabel}>Marka</Label>
                    <AutocompleteInput
                      options={BRANDS}
                      value={editData.brand || ""}
                      onChange={(v) => setEditData((d) => ({ ...d, brand: v }))}
                      placeholder="BMW, Toyota..."
                      className={iCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={iLabel}>Model</Label>
                    <AutocompleteInput
                      options={MODELS[editData.brand ?? ""] ?? []}
                      value={editData.model || ""}
                      onChange={(v) => setEditData((d) => ({ ...d, model: v }))}
                      placeholder="320i, Corolla..."
                      className={iCls}
                      allowFreeText
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className={iLabel}>Yıl</Label><Input className={iCls} type="number" value={editData.year || ""} onChange={(e) => setEditData((d) => ({ ...d, year: parseInt(e.target.value) || d.year }))} /></div>
                  <div className="space-y-1">
                    <Label className={iLabel}>Renk</Label>
                    <AutocompleteInput
                      options={COLORS}
                      value={editData.color || ""}
                      onChange={(v) => setEditData((d) => ({ ...d, color: v }))}
                      placeholder="Beyaz, Siyah..."
                      className={iCls}
                      allowFreeText
                    />
                  </div>
                </div>
                <div className="space-y-1"><Label className={iLabel}>Kilometre</Label><Input className={iCls} type="text" inputMode="numeric" value={editData.mileage || ""} onChange={(e) => setEditData((d) => ({ ...d, mileage: parseKm(e.target.value) || d.mileage }))} /></div>
                <div className="space-y-1"><Label className={iLabel}>Şasi No</Label><Input className={iCls} value={editData.chassisNo || ""} onChange={(e) => setEditData((d) => ({ ...d, chassisNo: e.target.value }))} /></div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Teknik & Belgeler</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className={iLabel}>Yakıt</Label>
                    <Select value={editData.fuelType || ""} onValueChange={(v) => v && setEditData((d) => ({ ...d, fuelType: v as FuelType }))}>
                      <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                      <SelectContent>{FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className={iLabel}>Vites</Label>
                    <Select value={editData.transmission || ""} onValueChange={(v) => v && setEditData((d) => ({ ...d, transmission: v as TransmissionType }))}>
                      <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                      <SelectContent>{TRANSMISSIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1"><Label className={iLabel}>Motor Hacmi (L)</Label><Input className={iCls} value={editData.engineVolume || ""} onChange={(e) => setEditData((d) => ({ ...d, engineVolume: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label className={iLabel}>Lastik Mevsimi</Label>
                  <Select value={editData.tireStatus || ""} onValueChange={(v) => v && setEditData((d) => ({ ...d, tireStatus: v as TireSeasonType }))}>
                    <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIRE_SEASONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className={iLabel}>Sigorta Bitiş</Label><DatePicker value={editData.insuranceExpiry || ""} onChange={(v) => setEditData((d) => ({ ...d, insuranceExpiry: v }))} /></div>
                <div className="space-y-1"><Label className={iLabel}>Yeşil Kart Bitiş</Label><DatePicker value={editData.greenCardExpiry || ""} onChange={(v) => setEditData((d) => ({ ...d, greenCardExpiry: v }))} /></div>
                <div className="space-y-1"><Label className={iLabel}>Muayene Bitiş</Label><DatePicker value={editData.inspectionExpiry || ""} onChange={(v) => setEditData((d) => ({ ...d, inspectionExpiry: v }))} /></div>
                <div className="space-y-1"><Label className={iLabel}>Son Servis Tarihi</Label><DatePicker value={editData.lastServiceDate || ""} onChange={(v) => setEditData((d) => ({ ...d, lastServiceDate: v }))} /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
            <Button onClick={handleSaveEdit} className="rounded-xl">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD RECORD DIALOG ── */}
      <Dialog open={showAddRecord} onOpenChange={setShowAddRecord}>
        <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-outfit">Servis Kaydı Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={iLabel}>Tarih</Label>
                <DatePicker value={recordForm.date} onChange={(v) => setRecordForm((f) => ({ ...f, date: v }))} />
              </div>
              <div className="space-y-1">
                <Label className={iLabel}>Tür</Label>
                <Select value={recordForm.type} onValueChange={(v) => v && setRecordForm((f) => ({ ...f, type: v as ServiceType }))}>
                  <SelectTrigger className={iCls}>
                    <SelectValue>
                      {(value: unknown) => SERVICE_TYPES.find((t) => t.value === value)?.label ?? "Seçiniz"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className={iLabel}>Başlık</Label><Input className={iCls} placeholder="Periyodik bakım..." value={recordForm.title} onChange={(e) => setRecordForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className={iLabel}>Kilometre</Label><Input className={iCls} type="text" inputMode="numeric" placeholder={String(vehicle.mileage)} value={recordForm.mileage} onChange={(e) => setRecordForm((f) => ({ ...f, mileage: e.target.value }))} /></div>
              <div className="space-y-1"><Label className={iLabel}>Servis Noktası</Label><Input className={iCls} placeholder="Yetkili servis..." value={recordForm.serviceCenter} onChange={(e) => setRecordForm((f) => ({ ...f, serviceCenter: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Notlar</Label>
              <textarea className="w-full rounded-xl bg-muted/30 border border-border/40 text-sm p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Yapılan işlemler..." value={recordForm.notes} onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
            <Button onClick={handleAddRecord} disabled={!recordForm.title} className="rounded-xl">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── DELETE RECORD CONFIRM DIALOG ── */}
      <Dialog open={showDeleteRecord} onOpenChange={setShowDeleteRecord}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Kaydı Sil
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Bu servis kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl flex-1" />}>İptal</DialogClose>
            <Button
              variant="destructive"
              className="rounded-xl flex-1"
              onClick={async () => {
                if (!recordToDelete) return;
                if (guardDemo()) { setShowDeleteRecord(false); return; }
                try {
                  await deleteRecord(recordToDelete);
                  setShowDeleteRecord(false);
                  setRecordToDelete(null);
                  reload();
                  toast.success("Silindi", { description: "Kayıt başarıyla silindi." });
                } catch (err) {
                  toast.error("Hata", { description: "Kayıt silinirken hata oluştu." });
                }
              }}
            >
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BAKIM GÜNCELLE DIALOG ── */}
      <Dialog open={showMaintEdit} onOpenChange={setShowMaintEdit}>
        <DialogContent className="max-w-[92vw] md:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              {maintEditItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">En son ne zaman yapıldığını girin. Boş bırakırsanız kayıt temizlenir.</p>
            <div className="space-y-1">
              <Label className={iLabel}>Son Yapılma Tarihi</Label>
              <DatePicker value={maintEditDate} onChange={setMaintEditDate} />
            </div>
            {maintEditItem?.intervalKm && (
              <div className="space-y-1">
                <Label className={iLabel}>Son Yapılma km</Label>
                <Input className={iCls} type="text" inputMode="numeric" placeholder="100000" value={maintEditKm} onChange={(e) => setMaintEditKm(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-xl flex-1" />}>İptal</DialogClose>
            <Button onClick={handleSaveMaintEdit} className="rounded-xl flex-1">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
