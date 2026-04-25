"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getVehicles, updateVehicle, deleteVehicle, getVehicle,
  getVehicleRecords, addRecord, deleteRecord,
} from "@/lib/db";
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
  Palette, Zap, Hash, ChevronRight,
} from "lucide-react";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const BRANDS = ["Audi","BMW","Chevrolet","Citroën","Dacia","Fiat","Ford","Honda","Hyundai","Kia","Mercedes-Benz","Nissan","Opel","Peugeot","Renault","Seat","Škoda","Tesla","Toyota","Volkswagen","Volvo","Diğer"];
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
  routine: "bg-blue-500/10 text-blue-500",
  repair: "bg-orange-500/10 text-orange-500",
  tire: "bg-teal-500/10 text-teal-500",
  inspection: "bg-purple-500/10 text-purple-500",
  battery: "bg-yellow-500/10 text-yellow-500",
  other: "bg-gray-500/10 text-gray-500",
};
const typeLabel: Record<ServiceType, string> = {
  routine: "Periyodik", repair: "Onarım", tire: "Lastik",
  inspection: "Muayene", battery: "Akü", other: "Diğer",
};

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
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

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);

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

  useEffect(() => { reload(); }, [reload]);

  if (!vehicle) return null;

  const score = calculateHealthScore(vehicle);

  const openEdit = () => {
    setEditData({ ...vehicle });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateVehicle(vehicle.id, editData);
      setShowEdit(false);
      reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle(vehicle.id);
      router.push("/vehicles");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRecord = async () => {
    try {
      await addRecord({
        vehicleId: vehicle.id,
        date: recordForm.date,
        type: recordForm.type,
        title: recordForm.title,
        mileage: parseInt(recordForm.mileage) || vehicle.mileage,
        serviceCenter: recordForm.serviceCenter,
        notes: recordForm.notes,
      });
      setShowAddRecord(false);
      setRecordForm({ date: new Date().toISOString().split("T")[0], type: "routine", title: "", mileage: "", serviceCenter: "", notes: "" });
      reload();
    } catch (err) {
      console.error(err);
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
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-destructive/10 text-destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-primary/10" onClick={openEdit}>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
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
            <Button variant="outline" className="gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" /> Sil
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={openEdit}>
              <Settings className="h-4 w-4" /> Düzenle
            </Button>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative h-56 md:h-80 w-full bg-muted md:rounded-3xl overflow-hidden shadow-md">
          {vehicle.image ? (
            <Image src={vehicle.image} alt={vehicle.brand} fill className="object-cover" sizes="768px" />
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
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
            {[
              { icon: Fuel, label: "Yakıt", value: vehicle.fuelType },
              { icon: Gauge, label: "Vites", value: vehicle.transmission.replace("Yarı Otomatik", "Y. Otm.") },
              { icon: Zap, label: "Güç", value: vehicle.power ? `${vehicle.power} HP` : "—" },
              { icon: MapPin, label: "Km", value: `${(vehicle.mileage / 1000).toFixed(0)}K` },
            ].map((spec, i) => (
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
                  {vehicle.maintenanceItems.map((item) => {
                    const status = getMaintenanceStatusForItem(item, vehicle.mileage);
                    const progress = getMaintenanceProgress(item, vehicle.mileage);
                    const Icon = statusIcon[status];
                    return (
                      <div key={item.id} className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${status === "good" ? "text-emerald-500" : status === "warning" ? "text-amber-500" : "text-red-500"}`} />
                            <span className="text-sm font-semibold">{item.name}</span>
                          </div>
                          <Badge className={`text-[10px] font-bold border-none ${statusBadge[status]}`}>
                            {statusLabel[status]}
                          </Badge>
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

                  <div className="bg-card rounded-2xl p-4 border border-border/40 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl shrink-0">
                      <Clock className="h-5 w-5 text-blue-500" />
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
                      { icon: Zap, label: "Motor Hacmi", value: vehicle.engineVolume ? `${vehicle.engineVolume} L` : "—" },
                      { icon: Zap, label: "Motor Gücü", value: vehicle.power ? `${vehicle.power} HP` : "—" },
                      { icon: Hash, label: "Motor Kodu", value: vehicle.engineType || "—" },
                      { icon: MapPin, label: "Kilometre", value: `${vehicle.mileage.toLocaleString("tr-TR")} km` },
                      { icon: FileText, label: "Şasi No", value: vehicle.chassisNo || "—" },
                    ].map((row, i) => (
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
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${vehicle.tireStatus === "Yazlık" ? "bg-orange-500/10 border-orange-500/20 text-orange-600" : vehicle.tireStatus === "Kışlık" ? "bg-blue-500/10 border-blue-500/20 text-blue-600" : "bg-teal-500/10 border-teal-500/20 text-teal-600"}`}>
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
                      { icon: ShieldCheck, iconBg: "bg-blue-500/10", iconColor: "text-blue-500", label: "Kasko & Sigorta", sub: vehicle.insuranceCompany || "—", date: vehicle.insuranceExpiry },
                      { icon: CalendarDays, iconBg: "bg-purple-500/10", iconColor: "text-purple-500", label: "TÜVTÜRK Muayene", sub: "", date: vehicle.inspectionExpiry },
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
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive" onClick={async () => { await deleteRecord(record.id); reload(); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Kimlik</p>
                <div className="space-y-1"><Label className={iLabel}>Plaka</Label><Input className={iCls} value={editData.plate || ""} onChange={(e) => setEditData((d) => ({ ...d, plate: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className={iLabel}>Marka</Label>
                    <Select value={editData.brand || ""} onValueChange={(v) => v && setEditData((d) => ({ ...d, brand: v }))}>
                      <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                      <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className={iLabel}>Model</Label><Input className={iCls} value={editData.model || ""} onChange={(e) => setEditData((d) => ({ ...d, model: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className={iLabel}>Yıl</Label><Input className={iCls} type="number" value={editData.year || ""} onChange={(e) => setEditData((d) => ({ ...d, year: parseInt(e.target.value) || d.year }))} /></div>
                  <div className="space-y-1">
                    <Label className={iLabel}>Renk</Label>
                    <Select value={editData.color || ""} onValueChange={(v) => v && setEditData((d) => ({ ...d, color: v }))}>
                      <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                      <SelectContent>{COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1"><Label className={iLabel}>Kilometre</Label><Input className={iCls} type="number" value={editData.mileage || ""} onChange={(e) => setEditData((d) => ({ ...d, mileage: parseInt(e.target.value) || d.mileage }))} /></div>
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
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className={iLabel}>Motor Kodu</Label><Input className={iCls} value={editData.engineType || ""} onChange={(e) => setEditData((d) => ({ ...d, engineType: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className={iLabel}>Hacim (L)</Label><Input className={iCls} value={editData.engineVolume || ""} onChange={(e) => setEditData((d) => ({ ...d, engineVolume: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className={iLabel}>Güç (HP)</Label><Input className={iCls} value={editData.power || ""} onChange={(e) => setEditData((d) => ({ ...d, power: e.target.value }))} /></div>
                </div>
                <div className="space-y-1">
                  <Label className={iLabel}>Lastik Mevsimi</Label>
                  <Select value={editData.tireStatus || ""} onValueChange={(v) => v && setEditData((d) => ({ ...d, tireStatus: v as TireSeasonType }))}>
                    <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                    <SelectContent>{TIRE_SEASONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className={iLabel}>Sigorta Bitiş</Label><Input className={iCls} type="date" value={editData.insuranceExpiry || ""} onChange={(e) => setEditData((d) => ({ ...d, insuranceExpiry: e.target.value }))} /></div>
                <div className="space-y-1"><Label className={iLabel}>Muayene Bitiş</Label><Input className={iCls} type="date" value={editData.inspectionExpiry || ""} onChange={(e) => setEditData((d) => ({ ...d, inspectionExpiry: e.target.value }))} /></div>
                <div className="space-y-1"><Label className={iLabel}>Son Servis Tarihi</Label><Input className={iCls} type="date" value={editData.lastServiceDate || ""} onChange={(e) => setEditData((d) => ({ ...d, lastServiceDate: e.target.value }))} /></div>
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
                <Input className={iCls} type="date" value={recordForm.date} onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className={iLabel}>Tür</Label>
                <Select value={recordForm.type} onValueChange={(v) => v && setRecordForm((f) => ({ ...f, type: v as ServiceType }))}>
                  <SelectTrigger className={iCls}><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className={iLabel}>Başlık</Label><Input className={iCls} placeholder="Periyodik bakım..." value={recordForm.title} onChange={(e) => setRecordForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className={iLabel}>Kilometre</Label><Input className={iCls} type="number" placeholder={String(vehicle.mileage)} value={recordForm.mileage} onChange={(e) => setRecordForm((f) => ({ ...f, mileage: e.target.value }))} /></div>
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
    </div>
  );
}
