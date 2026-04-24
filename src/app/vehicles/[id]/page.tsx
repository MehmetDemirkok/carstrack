"use client";

import { motion } from "framer-motion";
import { mockVehicles } from "@/lib/mock-data";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { deleteVehicles, updateVehicle } from "@/lib/mock-data";
import { useState } from "react";
import {
  ChevronLeft,
  Settings,
  MoreVertical,
  Car,
  Calendar,
  Fuel,
  Wrench,
  AlertCircle,
  Clock,
  Gauge,
  CheckCircle2,
  FileText,
  Trash2,
  MapPin
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicle = mockVehicles.find((v) => v.id === params.id) || mockVehicles[0];

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    plate: vehicle?.plate || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year || new Date().getFullYear(),
    engineType: vehicle?.engineType || "",
    fuelType: vehicle?.fuelType || "",
    tireStatus: vehicle?.tireStatus || "",
    mileage: vehicle?.mileage || 0,
    insuranceExpiry: vehicle?.insuranceExpiry || "",
    inspectionExpiry: vehicle?.inspectionExpiry || "",
  });

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: (name === "mileage" || name === "year") ? parseInt(value) || 0 : value
    }));
  };

  const handleSaveEdit = () => {
    updateVehicle(vehicle.id, editFormData);
    setIsEditModalOpen(false);
    Object.assign(vehicle, editFormData);
  };

  const handleDelete = () => {
    deleteVehicles([vehicle.id]);
    setIsDeleteDialogOpen(false);
    router.push("/vehicles");
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Sticky Header (Mobile Only) */}
      <div className="sticky top-0 z-50 glass border-b border-border/30 md:hidden">
        <div className="flex items-center justify-between p-3 px-4 max-w-md mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full h-9 w-9 hover:bg-primary/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-outfit font-bold text-sm">{vehicle.plate}</span>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 hover:bg-destructive/10 text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 hover:bg-primary/10"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md md:max-w-5xl mx-auto md:p-6">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full h-10 w-10 shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold font-outfit">{vehicle.plate}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Sil
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 rounded-xl"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Settings className="h-4 w-4" /> Düzenle
            </Button>
          </div>
        </div>

        {/* Delete Modal */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="rounded-3xl max-w-[340px]">
            <DialogHeader>
              <DialogTitle className="font-outfit text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Aracı Sil
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm text-muted-foreground">
              <b>{vehicle.plate}</b> plakalı bu aracı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <DialogClose className="w-full sm:w-auto">
                <Button variant="outline" className="w-full rounded-xl">İptal</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto rounded-xl">
                Evet, Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-2xl rounded-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-outfit">Araç Düzenle</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kimlik Bilgileri */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Kimlik Bilgileri</h3>
                  <div className="space-y-2">
                    <Label htmlFor="plate">Plaka</Label>
                    <Input id="plate" name="plate" value={editFormData.plate} onChange={handleEditChange} className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Marka</Label>
                      <Input id="brand" name="brand" value={editFormData.brand} onChange={handleEditChange} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" name="model" value={editFormData.model} onChange={handleEditChange} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="year">Yıl</Label>
                      <Input id="year" name="year" type="number" value={editFormData.year} onChange={handleEditChange} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Kilometre</Label>
                      <Input id="mileage" name="mileage" type="number" value={editFormData.mileage} onChange={handleEditChange} className="rounded-xl" />
                    </div>
                  </div>
                </div>

                {/* Teknik & Tarihler */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 md:mt-0">Teknik & Tarihler</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="engineType">Motor Tipi</Label>
                      <select
                        id="engineType"
                        name="engineType"
                        value={editFormData.engineType}
                        onChange={handleEditChange}
                        className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="1.0 TSI">1.0 TSI</option>
                        <option value="1.2 TSI">1.2 TSI</option>
                        <option value="1.3 TCe">1.3 TCe</option>
                        <option value="1.4 TSI">1.4 TSI</option>
                        <option value="1.5 dCi">1.5 dCi</option>
                        <option value="1.6 dCi">1.6 dCi</option>
                        <option value="1.6 TDI">1.6 TDI</option>
                        <option value="2.0 TDI">2.0 TDI</option>
                        <option value="Elektrik">Elektrik</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuelType">Yakıt Tipi</Label>
                      <select
                        id="fuelType"
                        name="fuelType"
                        value={editFormData.fuelType}
                        onChange={handleEditChange}
                        className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Benzin">Benzin</option>
                        <option value="Dizel">Dizel</option>
                        <option value="Elektrik">Elektrik</option>
                        <option value="Hibrit">Hibrit</option>
                        <option value="LPG">LPG</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tireStatus">Lastik Durumu</Label>
                    <select
                      id="tireStatus"
                      name="tireStatus"
                      value={editFormData.tireStatus}
                      onChange={handleEditChange}
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Yazlık">Yazlık</option>
                      <option value="Kışlık">Kışlık</option>
                      <option value="Dört Mevsim">Dört Mevsim</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="insuranceExpiry">Sigorta Bitiş</Label>
                      <Input id="insuranceExpiry" name="insuranceExpiry" type="date" value={editFormData.insuranceExpiry} onChange={handleEditChange} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inspectionExpiry">Muayene Bitiş</Label>
                      <Input id="inspectionExpiry" name="inspectionExpiry" type="date" value={editFormData.inspectionExpiry} onChange={handleEditChange} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="w-full">
                <Button onClick={handleSaveEdit} className="w-full rounded-xl">Değişiklikleri Kaydet</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hero Image */}
        <div className="relative h-56 md:h-80 w-full bg-muted md:rounded-3xl overflow-hidden shadow-md">
          {vehicle.image ? (
            <Image src={vehicle.image} alt={vehicle.brand} fill className="object-cover" sizes="448px" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-primary/10 flex items-center justify-center pb-8">
              <Car className="h-24 w-24 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-outfit font-black text-foreground drop-shadow-lg"
              >
                {vehicle.brand}{" "}
                <span className="font-light">{vehicle.model}</span>
              </motion.h1>
              <p className="text-muted-foreground font-medium text-sm">
                {vehicle.year} • {vehicle.mileage.toLocaleString("tr-TR")} km
              </p>
            </div>
            {/* Health Ring */}
            <div className="bg-card/80 backdrop-blur-md rounded-2xl p-2.5 border border-border/50 shadow-lg">
              <div className="relative">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke={vehicle.healthScore >= 85 ? "#22c55e" : "#f59e0b"}
                    strokeWidth="4"
                    strokeDasharray={`${vehicle.healthScore * 1.382} ${138.2 - vehicle.healthScore * 1.382}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black font-outfit leading-none">
                    {vehicle.healthScore}
                  </span>
                  <span className="text-[8px] text-muted-foreground font-medium">Sağlık</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="p-4 md:p-0 space-y-5 md:space-y-8 pb-28 md:pb-10 mt-4"
        >
          {/* Spec Grid */}
          <motion.div variants={item} className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-4">
            {[
              { icon: Car, label: "Motor", value: vehicle.engineType.split(" ")[0] },
              { icon: Fuel, label: "Yakıt", value: vehicle.fuelType },
              { icon: Gauge, label: "Vites", value: vehicle.transmission },
              { icon: MapPin, label: "Km", value: `${(vehicle.mileage / 1000).toFixed(0)}K` },
            ].map((spec, i) => (
              <div
                key={i}
                className="bg-muted/50 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 border border-border/30"
              >
                <spec.icon className="h-4 w-4 text-primary" />
                <span className="text-[9px] text-muted-foreground font-medium">{spec.label}</span>
                <span className="text-[11px] font-bold">{spec.value}</span>
              </div>
            ))}
          </motion.div>

          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl h-11 bg-muted/50 p-1">
              <TabsTrigger value="status" className="rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
                Bakım
              </TabsTrigger>
              <TabsTrigger value="tires" className="rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
                Lastik & Akü
              </TabsTrigger>
              <TabsTrigger value="docs" className="rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
                Belgeler
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {/* STATUS TAB */}
              <TabsContent value="status" className="space-y-4 outline-none">
                <motion.div variants={item}>
                  <div className="bg-card rounded-3xl p-5 shadow-sm border border-border/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-orange-500/10 rounded-lg">
                        <Wrench className="h-4 w-4 text-orange-500" />
                      </div>
                      <h3 className="font-bold text-sm">Aktif Bakım Durumu</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Yağ Değişimi</span>
                          <span className="font-bold text-orange-500">
                            {vehicle.nextMaintenance.remainingKm.toLocaleString("tr-TR")} km kaldı
                          </span>
                        </div>
                        <Progress value={88} className="h-2" indicatorClassName="bg-orange-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Fren Balataları</span>
                          <span className="font-bold text-emerald-500">İyi Durumda</span>
                        </div>
                        <Progress value={35} className="h-2" indicatorClassName="bg-emerald-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Hava Filtresi</span>
                          <span className="font-bold">5,000 km kaldı</span>
                        </div>
                        <Progress value={50} className="h-2" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={item}>
                  <div className="bg-card rounded-3xl p-5 shadow-sm border border-border/40 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl shrink-0">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Son Servis</p>
                      <p className="text-sm font-bold">{vehicle.lastServiceDate.split("-").reverse().join(".")}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold border-none bg-blue-500/10 text-blue-500">
                      Borusan
                    </Badge>
                  </div>
                </motion.div>
              </TabsContent>

              {/* TIRES TAB */}
              <TabsContent value="tires" className="space-y-4 outline-none">
                <motion.div variants={item}>
                  <div className="bg-card rounded-3xl p-5 shadow-sm border border-border/40">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <Disc3 className="h-4 w-4 text-primary" />
                          Lastik Durumu
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Aktif Set: {vehicle.tireBrand}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-1.5 border border-border/30">
                        {vehicle.tireStatus === "Yazlık" ? (
                          <Sun className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Snowflake className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-xs font-bold">{vehicle.tireStatus}</span>
                      </div>
                    </div>

                    {/* Tire Visual */}
                    <div className="bg-muted/50 rounded-2xl p-4 border border-border/20 mb-4">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-24 border-2 border-dashed border-border/40 rounded-xl" />
                        </div>
                        {["Sol Ön", "Sağ Ön", "Sol Arka", "Sağ Arka"].map((pos, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 relative z-10">
                            <div className="w-8 h-12 bg-foreground/10 rounded-lg border-2 border-foreground/20 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-muted-foreground">
                                {vehicle.tireStatus === "Yazlık" ? "Y" : "K"}
                              </span>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-medium">{pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3 border border-border/20">
                        <p className="text-[10px] text-muted-foreground">Takılma Tarihi</p>
                        <p className="text-xs font-bold mt-0.5">
                          {vehicle.tireInstallDate.split("-").reverse().join(".")}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3 border border-border/20">
                        <p className="text-[10px] text-muted-foreground">Yapılan Km</p>
                        <p className="text-xs font-bold mt-0.5">
                          {vehicle.tireMileage.toLocaleString("tr-TR")} km
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={item}>
                  <div className="bg-card rounded-3xl p-5 shadow-sm border border-border/40 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <BatteryCharging className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">Akü Durumu</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {vehicle.batteryBrand} • Değişim: {vehicle.batteryYear}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 text-[10px] font-bold">
                      İyi
                    </Badge>
                  </div>
                </motion.div>
              </TabsContent>

              {/* DOCS TAB */}
              <TabsContent value="docs" className="space-y-4 outline-none">
                <motion.div variants={item}>
                  <div className="bg-card rounded-3xl p-5 shadow-sm border border-border/40 space-y-4">
                    {[
                      {
                        icon: ShieldCheck,
                        iconBg: "bg-blue-500/10",
                        iconColor: "text-blue-500",
                        label: "Kasko & Sigorta",
                        date: vehicle.insuranceExpiry.split("-").reverse().join("."),
                        days: daysUntil(vehicle.insuranceExpiry),
                        badgeColor: "bg-blue-500/10 text-blue-500",
                      },
                      {
                        icon: CalendarDays,
                        iconBg: "bg-purple-500/10",
                        iconColor: "text-purple-500",
                        label: "TÜVTÜRK Muayene",
                        date: vehicle.inspectionExpiry.split("-").reverse().join("."),
                        days: daysUntil(vehicle.inspectionExpiry),
                        badgeColor: "bg-purple-500/10 text-purple-500",
                      },
                    ].map((doc, i) => (
                      <div key={i}>
                        {i > 0 && <Separator className="mb-4" />}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 ${doc.iconBg} rounded-xl`}>
                              <doc.icon className={`h-4 w-4 ${doc.iconColor}`} />
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">{doc.label}</p>
                              <p className="text-sm font-bold">{doc.date}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={`${doc.badgeColor} border-none text-[10px] font-bold`}>
                            {doc.days} Gün
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={item}>
                  <div className="bg-card rounded-3xl p-5 shadow-sm border border-border/40">
                    <h3 className="font-bold text-sm mb-3">Şasi Numarası</h3>
                    <div className="bg-muted/50 rounded-xl p-3 border border-border/20">
                      <code className="text-xs font-mono tracking-wider text-muted-foreground">
                        {vehicle.chassisNo}
                      </code>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>

          {/* AI Suggestion */}
          <motion.div variants={item}>
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold">AI Öneri</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Km&apos;nize göre yakında yağ değişimi yapmanızı öneriyoruz.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
