"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addRecord, deleteRecord, updateRecord, updateVehicle } from "@/lib/db";
import { applyPeriodicService } from "@/lib/store";
import { useData } from "@/context/data-context";
import type { ServiceRecord, ServiceType, TireSeasonType, Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import {
  Wrench, CheckCircle2, AlertTriangle, Disc3, Car, Plus,
  Filter, Trash2, BatteryCharging, ClipboardList, Download, FileDown,
  Sun, Snowflake, Layers, Pencil, Check,
} from "lucide-react";
import { exportServiceHistoryExcel } from "@/lib/export";
import { exportServiceHistoryPDF } from "@/lib/pdf-export";

const typeConfig: Record<ServiceType, { icon: React.ElementType; color: string; dot: string; label: string }> = {
  routine: { icon: CheckCircle2, color: "bg-violet-500/10 text-violet-500", dot: "bg-violet-500", label: "Periyodik" },
  repair: { icon: AlertTriangle, color: "bg-orange-500/10 text-orange-500", dot: "bg-orange-500", label: "Onarım" },
  tire: { icon: Disc3, color: "bg-teal-500/10 text-teal-500", dot: "bg-teal-500", label: "Lastik" },
  inspection: { icon: ClipboardList, color: "bg-violet-500/10 text-violet-500", dot: "bg-violet-500", label: "Muayene" },
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
  const { vehicles, records, loading: dataLoading, refresh, setRecords } = useData();
  const [filter, setFilter] = useState<ServiceType | "all">("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    type: "routine" as ServiceType,
    title: "",
    mileage: "",
    serviceCenter: "",
    notes: "",
  });
  const [form, setForm] = useState({
    vehicleId: "",
    date: new Date().toISOString().split("T")[0],
    type: "routine" as ServiceType,
    title: "",
    mileage: "",
    serviceCenter: "",
    notes: "",
  });
  const [tireForm, setTireForm] = useState<{ season: TireSeasonType; brand: string; size: string; qty: string }>({
    season: "Yazlık",
    brand: "",
    size: "",
    qty: "",
  });
  const [recordMaintIds, setRecordMaintIds] = useState<string[]>([]);

  const reload = refresh;

  const filtered = records.filter((r) => {
    if (filter !== "all" && r.type !== filter) return false;
    if (vehicleFilter !== "all" && r.vehicleId !== vehicleFilter) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!form.vehicleId || !form.title) return;
    const v = vehicles.find((x) => x.id === form.vehicleId);
    const recordMileage = parseInt(form.mileage) || (v?.mileage ?? 0);
    try {
      await addRecord({
        vehicleId: form.vehicleId,
        date: form.date,
        type: form.type,
        title: form.title,
        mileage: recordMileage,
        serviceCenter: form.serviceCenter,
        notes: form.notes,
      });
      if (form.type === "tire" && form.vehicleId) {
        await updateVehicle(form.vehicleId, {
          tireStatus: tireForm.season,
          tireBrand: tireForm.brand || v?.tireBrand,
          tireSize: tireForm.size || v?.tireSize,
          tireInstallDate: form.date,
          tireMileage: recordMileage,
        });
      } else if (form.type === "routine" && v) {
        // Periyodik bakım kaydı → işaretli kalemler + "Son Servis" senkronla
        const update = applyPeriodicService(v, form.date, recordMileage, recordMaintIds);
        await updateVehicle(v.id, update);
      }
      setShowAdd(false);
      setForm({ vehicleId: "", date: new Date().toISOString().split("T")[0], type: "routine", title: "", mileage: "", serviceCenter: "", notes: "" });
      setTireForm({ season: "Yazlık", brand: "", size: "", qty: "" });
      setRecordMaintIds([]);
      await reload();
    } catch (err) {
      console.error("Add record failed:", err instanceof Error ? err.message : err);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteRecord(recordToDelete);
      setRecordToDelete(null);
      setShowDelete(false);
      await reload();
    } catch (err) {
      console.error("Delete record failed:", err instanceof Error ? err.message : err);
    }
  };

  const openDeleteDialog = (id: string) => {
    setRecordToDelete(id);
    setShowDelete(true);
  };

  const openEditDialog = (record: ServiceRecord) => {
    setEditRecord(record);
    setEditForm({
      date: record.date,
      type: record.type,
      title: record.title,
      mileage: record.mileage > 0 ? String(record.mileage) : "",
      serviceCenter: record.serviceCenter,
      notes: record.notes,
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editRecord || !editForm.title) return;
    try {
      await updateRecord(editRecord.id, {
        date: editForm.date,
        type: editForm.type,
        title: editForm.title,
        mileage: parseInt(editForm.mileage) || 0,
        serviceCenter: editForm.serviceCenter,
        notes: editForm.notes,
      });
      setShowEdit(false);
      setEditRecord(null);
      await reload();
    } catch (err) {
      console.error("Update record failed:", err instanceof Error ? err.message : err);
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
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 shadow-sm border-border/50"
            title="PDF'e Aktar"
            disabled={filtered.length === 0}
            onClick={() => exportServiceHistoryPDF(filtered, vehicles)}
          >
            <FileDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 shadow-sm border-border/50"
            title="Excel'e Aktar"
            disabled={filtered.length === 0}
            onClick={() => exportServiceHistoryExcel(filtered, vehicles)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shadow-sm border-border/50" onClick={() => setShowFilters((s) => !s)}>
            <Filter className={`h-4 w-4 ${showFilters ? "text-primary" : ""}`} />
          </Button>
          <Button size="icon" className="rounded-full h-9 w-9 shadow-md" onClick={() => { setRecordMaintIds(["oil"]); setShowAdd(true); }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="relative">
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
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      </div>

      {/* Vehicle filter */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="relative">
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
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {dataLoading ? (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm">Yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
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
            <Button className="rounded-full px-6 gap-2 shadow-md" onClick={() => { setRecordMaintIds(["oil"]); setShowAdd(true); }}>
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
                      <div className="flex items-center gap-0.5 shrink-0 -mt-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary" onClick={() => openEditDialog(record)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(record.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                      <div className="bg-muted/40 rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed border border-border/20 whitespace-pre-wrap break-words">
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
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setTireForm({ season: "Yazlık", brand: "", size: "", qty: "" }); setRecordMaintIds([]); } }}>
        <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
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

            {/* ── Lastik detayları — sadece type === "tire" ── */}
            {form.type === "tire" && (
              <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
                <p className="text-xs font-semibold text-teal-600 flex items-center gap-1.5">
                  <Disc3 className="h-3.5 w-3.5" /> Lastik Detayları
                </p>
                <div className="space-y-1">
                  <Label className={iLabel}>Mevsim</Label>
                  <div className="flex gap-2">
                    {(["Yazlık", "Kışlık", "Dört Mevsim"] as TireSeasonType[]).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setTireForm((f) => ({ ...f, season: s }))}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                          tireForm.season === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 bg-muted/20"
                        }`}
                      >
                        {s === "Yazlık" ? <Sun className="h-3.5 w-3.5" /> : s === "Kışlık" ? <Snowflake className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className={iLabel}>Marka</Label>
                    <Input className={iCls} placeholder="Pirelli, Michelin..." value={tireForm.brand} onChange={(e) => setTireForm((f) => ({ ...f, brand: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className={iLabel}>Ölçü</Label>
                    <Input className={iCls} placeholder="205/55R16" value={tireForm.size} onChange={(e) => setTireForm((f) => ({ ...f, size: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className={iLabel}>Değiştirilen Adet</Label>
                  <Input className={iCls} type="text" inputMode="numeric" placeholder="4" value={tireForm.qty} onChange={(e) => setTireForm((f) => ({ ...f, qty: e.target.value }))} />
                </div>
              </div>
            )}

            {/* ── Yapılan bakım kalemleri — sadece type === "routine" ── */}
            {form.type === "routine" && (() => {
              const selectedVehicle = vehicles.find((vv) => vv.id === form.vehicleId);
              if (!selectedVehicle || selectedVehicle.maintenanceItems.length === 0) return null;
              return (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" /> Yapılan İşlemler
                  </p>
                  <p className="text-[11px] text-muted-foreground -mt-0.5">Bu serviste değişen/yapılan kalemleri işaretleyin. İşaretli kalemlerin sayacı bu tarih ve km&apos;ye sıfırlanır.</p>
                  <div className="space-y-1.5">
                    {selectedVehicle.maintenanceItems.map((item) => {
                      const checked = recordMaintIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRecordMaintIds((p) => checked ? p.filter((id) => id !== item.id) : [...p, item.id])}
                          className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${checked ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card"}`}
                        >
                          <span className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
                            {checked && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          <span className="text-sm">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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
      {/* Edit record dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => { setShowEdit(o); if (!o) setEditRecord(null); }}>
        <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-outfit">Kaydı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={iLabel}>Tarih</Label>
                <Input className={iCls} type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className={iLabel}>Tür</Label>
                <Select value={editForm.type} onValueChange={(v) => v && setEditForm((f) => ({ ...f, type: v as ServiceType }))}>
                  <SelectTrigger className={iCls}>
                    <SelectValue>
                      {(value: unknown) => SERVICE_TYPES.find((t) => t.value === value)?.label ?? "Seçiniz"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Başlık</Label>
              <Input className={iCls} placeholder="Periyodik bakım..." value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={iLabel}>Kilometre</Label>
                <Input className={iCls} type="number" value={editForm.mileage} onChange={(e) => setEditForm((f) => ({ ...f, mileage: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className={iLabel}>Servis Noktası</Label>
                <Input className={iCls} placeholder="Yetkili servis..." value={editForm.serviceCenter} onChange={(e) => setEditForm((f) => ({ ...f, serviceCenter: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className={iLabel}>Notlar</Label>
              <textarea
                className="w-full rounded-xl bg-muted/30 border border-border/40 text-sm p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Yapılan işlemler..."
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
            <Button onClick={handleEdit} disabled={!editForm.title} className="rounded-xl">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
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
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl flex-1">Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
