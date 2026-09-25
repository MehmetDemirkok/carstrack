"use client";

/**
 * Hiç aracı olmayan yeni kullanıcı için üç adımlı kurulum akışı.
 *
 * Neden var: kaydolup araç eklemeyen ya da araç ekleyip tarih girmeyen kullanıcıya
 * hiçbir cron (fleet-alerts / license-alerts) e-posta göndermez;
 * yani ürün ona ömrü boyunca hiçbir değer teslim etmez ve sessizce kaybedilir.
 * Bu akış kullanıcıyı ilk hatırlatmanın tetikleneceği noktaya kadar taşır ve
 * son adımda uyarıların TAM OLARAK ne zaman geleceğini tarih vererek gösterir.
 */

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { MAINTENANCE_TEMPLATES } from "@/lib/store";
import { addVehicle } from "@/lib/db";
import { fileToBase64 } from "@/lib/file-utils";
import type { Vehicle } from "@/lib/types";
import { useData } from "@/context/data-context";
import {
  Car,
  Shield,
  CalendarCheck,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  ScanLine,
  Users,
} from "lucide-react";

/**
 * /api/extract-document'in ruhsat/poliçeden okuyabildiği alanlardan bu akışın
 * kullandıkları. Tam liste için bkz. src/app/vehicles/new/page.tsx.
 */
interface ExtractedDocData {
  plate?: string;
  brand?: string;
  model?: string;
  mileage?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
}

/** getFleetAlerts() belge sürelerinde 60 gün kala uyarmaya başlar (14 günde kritik). */
const ALERT_LEAD_DAYS = 60;
const CRITICAL_LEAD_DAYS = 14;

function parseKm(value: string): number {
  return parseInt(value.replace(/\./g, "").replace(/,/g, ""), 10) || 0;
}

/** Bir belge bitiş tarihinden ilk uyarının gideceği günü hesaplar. */
function alertDateFor(expiry: string, leadDays: number): Date {
  const d = new Date(expiry);
  d.setDate(d.getDate() - leadDays);
  return d;
}

function formatTr(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  /** "Şimdilik geç" — kullanıcıyı normal panele bırakır. */
  onSkip: () => void;
}

export function FirstVehicleOnboarding({ onSkip }: Props) {
  const { refresh } = useData();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Adım 1 — araç
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");

  // Adım 2 — hatırlatmayı tetikleyen tarihler
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");

  // Ruhsat taraması — ürünün en güçlü anı, ilk temasta yaşanmalı.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanFilled, setScanFilled] = useState(0);

  const canContinue = plate.trim().length >= 5 && brand.trim().length > 0;

  /**
   * Ruhsat fotoğrafını okuyup formu doldurur. Tarama yalnızca kolaylık;
   * başarısız olursa kullanıcı alanları elle doldurmaya devam eder, akış kesilmez.
   * Ruhsattan sigorta/muayene tarihi de çıkabildiği için tek fotoğraf
   * çoğu zaman 2. adımı da dolduruyor.
   */
  async function handleRuhsatScan(file: File) {
    setScanning(true);
    try {
      const fileData = await fileToBase64(file);
      const res = await fetch("/api/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fileData,
          mimeType: file.type || "application/octet-stream",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { data } = (await res.json()) as { data?: ExtractedDocData };
      const found = data ?? {};
      let filled = 0;
      if (found.plate) { setPlate(found.plate.toUpperCase()); filled += 1; }
      if (found.brand) { setBrand(found.brand); filled += 1; }
      if (found.model) { setModel(found.model); filled += 1; }
      if (found.mileage) { setMileage(found.mileage); filled += 1; }
      if (found.insuranceExpiry) { setInsuranceExpiry(found.insuranceExpiry); filled += 1; }
      if (found.inspectionExpiry) { setInspectionExpiry(found.inspectionExpiry); filled += 1; }

      setScanFilled(filled);
      if (filled === 0) {
        toast.warning("Bilgi bulunamadı", {
          description: "Alanları elle doldurabilirsin.",
        });
      } else {
        toast.success(`${filled} alan dolduruldu`, {
          description: "Kontrol edip devam edebilirsin.",
        });
      }
    } catch (err) {
      console.error("[onboarding] ruhsat okunamadı:", err);
      toast.error("Belge okunamadı", { description: "Alanları elle doldurabilirsin." });
    } finally {
      setScanning(false);
    }
  }
  const hasAnyDate = Boolean(insuranceExpiry || inspectionExpiry);

  async function handleSave() {
    setSaving(true);
    try {
      const data: Omit<Vehicle, "id" | "createdAt" | "updatedAt"> = {
        ownershipType: "ozmal",
        rentCompany: "",
        ruhsatSahibi: "",
        image: "",
        image2: "",
        image3: "",
        image4: "",
        imagePosition: 50,
        imagePositionX: 50,
        imageZoom: 100,
        plate: plate.toUpperCase().trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: new Date().getFullYear(),
        color: "Beyaz",
        mileage: parseKm(mileage),
        engineType: "",
        engineVolume: "",
        power: "",
        fuelType: "Benzin",
        transmission: "Otomatik",
        chassisNo: "",
        tireStatus: "Yazlık",
        tireBrand: "",
        tireSize: "",
        tireInstallDate: "",
        tireMileage: 0,
        batteryBrand: "",
        batteryCapacity: "",
        batteryInstallDate: "",
        insuranceCompany: "",
        insuranceExpiry,
        kaskoCompany: "",
        kaskoExpiry: "",
        greenCardCompany: "",
        greenCardExpiry: "",
        inspectionExpiry,
        lastServiceDate: "",
        lastServiceMileage: 0,
        nextServiceMileage: 0,
        maintenanceItems: MAINTENANCE_TEMPLATES.map((t) => ({ ...t })),
        notes: "",
      };

      await addVehicle(data);
      setStep(3);
    } catch (err) {
      console.error("[onboarding] araç eklenemedi:", err);
      toast.error("Araç eklenemedi", {
        description: "Lütfen tekrar deneyin. Sorun sürerse plakayı kontrol edin.",
      });
    } finally {
      setSaving(false);
    }
  }

  /** Son adımda gösterilecek somut uyarı takvimi. */
  const promises = [
    insuranceExpiry && {
      icon: Shield,
      label: "Trafik sigortası",
      expiry: insuranceExpiry,
    },
    inspectionExpiry && {
      icon: CalendarCheck,
      label: "TÜVTÜRK muayenesi",
      expiry: inspectionExpiry,
    },
  ].filter(Boolean) as { icon: typeof Shield; label: string; expiry: string }[];

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg">
        {/* İlerleme */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                n <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─────────── Adım 1: araç ─────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-3">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <h1 className="font-outfit text-2xl font-bold tracking-tight">İlk aracını ekleyelim</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Sadece birkaç bilgi — detayları sonra tamamlayabilirsin.
                </p>
              </div>

              {/* Ruhsattan otomatik doldurma — elle yazmadan önce sunulan yol */}
              <Card className="rounded-2xl mb-3 border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleRuhsatScan(file);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <div className="inline-flex p-2.5 rounded-xl bg-primary/10 shrink-0">
                      {scanning ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <ScanLine className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Ruhsatı okutarak doldur</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {scanning
                          ? "Belge okunuyor…"
                          : scanFilled > 0
                            ? `${scanFilled} alan dolduruldu — kontrol et`
                            : "Fotoğrafını çek, alanları biz dolduralım."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanning}
                      className="shrink-0"
                    >
                      {scanFilled > 0 ? "Tekrar" : "Seç"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-center text-xs text-muted-foreground mb-3">
                veya bilgileri elle gir
              </p>

              <Card className="rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-plate">Plaka</Label>
                    <Input
                      id="ob-plate"
                      placeholder="34 ABC 123"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-brand">Marka</Label>
                      <Input
                        id="ob-brand"
                        placeholder="Fiat"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-model">Model</Label>
                      <Input
                        id="ob-model"
                        placeholder="Egea"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-km">Güncel kilometre</Label>
                    <Input
                      id="ob-km"
                      inputMode="numeric"
                      placeholder="85000"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between mt-5">
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Şimdilik geç
                </button>
                <Button onClick={() => setStep(2)} disabled={!canContinue} className="gap-1.5">
                  Devam <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─────────── Adım 2: tarihler ─────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-3">
                  <BellRing className="h-6 w-6 text-primary" />
                </div>
                <h1 className="font-outfit text-2xl font-bold tracking-tight">
                  Seni ne için uyaralım?
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Bu tarihler olmadan sana hatırlatma gönderemeyiz — CarsTrack&apos;in asıl işi bu.
                </p>
              </div>

              <Card className="rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      Trafik sigortası bitiş tarihi
                    </Label>
                    <DatePicker value={insuranceExpiry} onChange={setInsuranceExpiry} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      TÜVTÜRK muayene bitiş tarihi
                    </Label>
                    <DatePicker value={inspectionExpiry} onChange={setInspectionExpiry} />
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground bg-muted/50 rounded-xl p-3">
                    Ruhsatında ve poliçende yazıyor. Şimdi girmezsen sorun değil, sonra da
                    ekleyebilirsin — ama o zamana kadar hatırlatma alamazsın.
                  </p>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between mt-5">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5" disabled={saving}>
                  <ChevronLeft className="h-4 w-4" /> Geri
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor
                    </>
                  ) : hasAnyDate ? (
                    <>
                      Kaydet ve bitir <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Tarihsiz devam et <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─────────── Adım 3: somut vaat ─────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <h1 className="font-outfit text-2xl font-bold tracking-tight">
                  {plate.toUpperCase()} takibe alındı
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {promises.length > 0
                    ? "Bundan sonrası bizde. İşte seni ne zaman uyaracağımız:"
                    : "Araç kaydedildi — ama henüz seni uyarabileceğimiz bir tarih yok."}
                </p>
              </div>

              <Card className="rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  {promises.length > 0 ? (
                    promises.map(({ icon: Icon, label, expiry }) => {
                      const first = alertDateFor(expiry, ALERT_LEAD_DAYS);
                      const critical = alertDateFor(expiry, CRITICAL_LEAD_DAYS);
                      return (
                        <div key={label} className="flex gap-3 p-3 rounded-xl bg-muted/40">
                          <div className="p-2 rounded-lg bg-primary/10 h-fit shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Bitiş: {formatTr(new Date(expiry))}
                            </p>
                            <p className="text-[11px] text-primary font-medium mt-1.5">
                              İlk uyarı: {formatTr(first)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Acil uyarı: {formatTr(critical)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Aracın sayfasından sigorta ve muayene tarihlerini eklediğinde
                        hatırlatmalar otomatik olarak devreye girer.
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] leading-relaxed text-muted-foreground pt-1">
                    Uyarılar e-posta ve uygulama bildirimi olarak gelir. Bildirim tercihlerini
                    Ayarlar&apos;dan değiştirebilirsin.
                  </p>
                </CardContent>
              </Card>

              {/*
                Ekip daveti teşviki. Canlı veride 18 kullanıcının 15'i "manager" ve
                kimse kimseyi davet etmemişti; tek kişilik hesapta ürün kişisel bir
                hatırlatıcıdan öteye geçemiyor. Şoför katılınca KM girişi ve arıza
                bildirimi ürünü günlük alışkanlık haline getiriyor.
              */}
              <Link
                href="/users?invite=1"
                className="mt-5 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="inline-flex shrink-0 rounded-xl bg-primary/10 p-2.5">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Şoförünü davet et</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Kilometreyi kendisi girsin, arızayı doğrudan bildirsin.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>

              <Button
                className="w-full mt-3 gap-1.5"
                onClick={() => {
                  void refresh();
                }}
              >
                Panele git <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
