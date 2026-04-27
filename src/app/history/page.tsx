"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRecords, getVehicles, addRecord, deleteRecord } from "@/lib/db";
import type { ServiceRecord, ServiceType, Vehicle } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
  Wrench, CheckCircle2, AlertTriangle, Disc3, Car, Plus,
  Filter, Trash2, BatteryCharging, ClipboardList,
} from "lucide-react";

const typeConfig: Record<ServiceType, { icon: React.ElementType; color: string; dot: string; label: string }> = {
  routine: { icon: CheckCircle2, color: "bg-blue-500/10 text-blue-500", dot: "bg-blue-500", label: "Periyodik" },
  repair: { icon: AlertTriangle, color: "bg-orange-500/10 text-orange-500", dot: "bg-orange-500", label: "Onarım" },
  tire: { icon: Disc3, color: "bg-teal-500/10 text-teal-500", dot: "bg-teal-500", label: "Lastik" },
  inspection: { icon: ClipboardList, color: "bg-purple-500/10 text-purple-500", dot: "bg-purple-500", label: "Muayene" },
  battery: { icon: BatteryCharging, color: "bg-yellow-500/10 text-yellow-500", dot: "bg-yellow-500", label: "Akü" },
  other: { icon: Wrench, color: "bg-gray-500/10 text-gray-500", dot: "bg-gray-500", label: "Diğer" },
};

const FILTER_TYPES: { key: ServiceType | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "routine", label: "Periyodik" },
  { key: "repair", label: "Onarım" },
  { key: "tire", label: "Lastik" },
  { key: "inspection", label: "Muayene" },
  { key: "battery", label: "Akü" },
  { key: "other", label: "Diğer" },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "routine", label: "Periyodik Bakım" },
  { value: "repair", label: "Onarım" },
  { value: "tire", label: "Lastik" },
  { value: "inspection", label: "Muayene" },
  { value: "battery", label: "Akü" },
  { value: "other", label: "Diğer" },
];

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeLeft = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { duration: 0.35 } } };

export default function HistoryPage() {
  const { loading: authLoading } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState<ServiceType | "all">("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    date: new Date().toISOString().split("T")[0],
    type: "routine" as ServiceType,
    title: "",
    mileage: "",
    serviceCenter: "",
    notes: "",
  });

  // Records and vehicles are fetched independently so a vehicle-load failure
  // does not block the records list from rendering (and vice-versa).
  const reload = useCallback(async () => {
    try {
      const r = await getRecords();
      setRecords(r);
    } catch (err) {
      console.error("Records load failed:", err instanceof Error ? err.message : err);
    }
    try {
      const v = await getVehicles();
      setVehicles(v);
    } catch (err) {
      console.error("Vehicles load failed:", err instanceof Error ? err.message : err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) reload();
  }, [authLoading, reload]);

  const filtered = records.filter((r) => {
    if (filter !== "all" && r.type !== filter) return false;
    if (vehicleFilter !== "all" && r.vehicleId !== vehicleFilter) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!form.vehicleId || !form.title) return;
    const v = vehicles.find((x) => x.id === form.vehicleId);
    try {
      await addRecord({
        vehicleId: form.vehicleId,
        date: form.date,
        type: form.type,
        title: form.title,
        mileage: parseInt(form.mileage) || (v?.mileage ?? 0),
        serviceCenter: form.serviceCenter,
        notes: form.notes,
      });
      setShowAdd(false);
      setForm({ vehicleId: "", date: new Date().toISOString().split("T")[0], type: "routine", title: "", mileage: "", serviceCenter: "", notes: "" });
      await reload();
    } catch (err) {
      console.error("Add record failed:", err instanceof Error ? err.message : err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      await reload();
    } catch (err) {
      console.error("Delete record failed:", err instanceof Error ? err.message : err);
    }
  };

  const iCls = "rounded-xl h-10 bg-muted/30 border-border/40 text-sm";
  const iLabel = "text-xs font-medium text-muted-foreground";

  return (
    <div className="p-4 space-y-5 pb-28">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-outfit font-bold tracking-tight">Servis Geçmişi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} kayıt</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/50" onClick={() => setShowFilters((s) => !s)}>
            <Filter className={`h-4 w-4 ${showFilters ? "text-primary" : ""}`} />
          </Button>
          <Button size="icon" className="rounded-full h-9 w-9 shadow-md" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTER_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border ${filter === key ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Vehicle filter */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setVehicleFilter("all")}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border ${vehicleFilter === "all" ? "bg-foreground text-background border-foreground" : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted"}`}
              >
                Tüm Araçlar
              </button>
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleFilter(v.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border ${vehicleFilter === v.id ? "bg-foreground text-background border-foreground" : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted"}`}
                >
                  {v.plate}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center py-12 text-center gap-4"
        >
          <div className="p-5 bg-primary/10 rounded-3xl">
            <ClipboardList className="h-10 w-10 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold">Servis Geçmişi Boş</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {records.length > 0
                ? "Seçili filtreler için kayıt bulunamadı."
                : "Araçlarınıza ait servis, bakım ve onarım kayıtlarını buradan takip edebilirsiniz."}
            </p>
          </div>
          {vehicles.length === 0 ? (
            <Link href="/vehicles/new">
              <Button className="rounded-full px-6 gap-2 shadow-md">
                <Car className="h-4 w-4" /> Araç Ekle
              </Button>
            </Link>
          ) : (
            <Button className="rounded-full px-6 gap-2 shadow-md" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Servis Kaydı Ekle
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" key={filtered.length} className="relative ml-4">
          <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent" />
          <div className="space-y-5">
            {filtered.map((record) => {
              const config = typeConfig[record.type] ?? typeConfig.other;
              const Icon = config.icon;
              const vehicle = vehicles.find((v) => v.id === record.vehicleId);
              return (
                <motion.div variants={fadeLeft} key={record.id} className="relative pl-7">
                  <div className={`absolute -left-2.5 top-4 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center shadow-md ${config.dot}`}>
                    <Icon className="h-2.5 w-2.5 text-white" />
                  </div>

                  <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/40 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-sm truncate">{record.title || "(Başlıksız)"}</h3>
                          <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 rounded-md font-bold border-none shrink-0 ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{record.date ? record.date.split("-").reverse().join(".") : "—"}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive shrink-0 -mt-1" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-medium mb-2">
                      {vehicle && (
                        <Link href={`/vehicles/${vehicle.id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Car className="h-3 w-3" />
                          <span>{vehicle.plate}</span>
                        </Link>
                      )}
                      {record.serviceCenter && <><span>•</span><span>{record.serviceCenter}</span></>}
                      {record.mileage > 0 && <><span>•</span><span>{record.mileage.toLocaleString("tr-TR")} km</span></>}
                    </div>

                    {record.notes && (
                      <div className="bg-muted/40 rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed border border-border/20">
                        {record.notes}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Add record dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-outfit">Servis Kaydı Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className={iLabel}>Araç</Label>
              <Select value={form.vehicleId} onValueChange={(v) => v && setForm((f) => ({ ...f, vehicleId: v }))}>
                <SelectTrigger className={iCls}>
                  <SelectValue placeholder="Araç seçiniz...">
                    {(value: unknown) => {
                      const v = vehicles.find((x) => x.id === value);
                      return v ? `${v.plate} — ${v.brand} ${v.model}` : "Araç seçiniz...";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className={iLabel}>Tarih</Label><Input className={iCls} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label className={iLabel}>Tür</Label>
                <Select value={form.type} onValueChange={(v) => v && setForm((f) => ({ ...f, type: v as ServiceType }))}>
                  <SelectTrigger className={iCls}>
                    <SelectValue>
                      {(value: unknown) => SERVICE_TYPES.find((t) => t.value === value)?.label ?? "Seçiniz"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className={iLabel}>Başlık</Label><Input className={iCls} placeholder="Periyodik bakım..." value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className={iLabel}>Kilometre</Label><Input className={iCls} type="number" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} /></div>
              <div className="space-y-1"><Label className={iLabel}>Servis Noktası</Label><Input className={iCls} placeholder="Yetkili servis..." value={form.serviceCenter} onChange={(e) => setForm((f) => ({ ...f, serviceCenter: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Notlar</Label>
              <textarea className="w-full rounded-xl bg-muted/30 border border-border/40 text-sm p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Yapılan işlemler..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
            <Button onClick={handleAdd} disabled={!form.vehicleId || !form.title} className="rounded-xl">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
