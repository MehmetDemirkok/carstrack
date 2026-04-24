"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { addVehicle } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Car,
  Fuel,
  Calendar,
  Gauge,
  Shield,
  Hash,
  MapPin,
  CheckCircle2,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const brands = [
  "Audi", "BMW", "Chevrolet", "Citroën", "Dacia", "Fiat", "Ford",
  "Honda", "Hyundai", "Kia", "Mercedes-Benz", "Nissan", "Opel",
  "Peugeot", "Renault", "Seat", "Škoda", "Tesla", "Toyota",
  "Volkswagen", "Volvo",
];

const fuelTypes = ["Benzin", "Dizel", "LPG", "Hibrit", "Elektrik"];
const transmissions = ["Manuel", "Otomatik", "Yarı Otomatik"];
const tireTypes = ["Yazlık", "Kışlık", "4 Mevsim"];

interface FormField {
  icon: React.ElementType;
  label: string;
  name: string;
  type: "text" | "number" | "date" | "select" | "file";
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

const formSections: { title: string; fields: FormField[] }[] = [
  {
    title: "Araç Görseli",
    fields: [
      { icon: Car, label: "Araç Fotoğrafı", name: "image", type: "file" },
    ],
  },
  {
    title: "Araç Kimlik Bilgileri",
    fields: [
      { icon: Car, label: "Plaka", name: "plate", type: "text", placeholder: "34 ABC 123", required: true },
      { icon: Car, label: "Marka", name: "brand", type: "select", options: brands, required: true },
      { icon: Car, label: "Model", name: "model", type: "text", placeholder: "320i, Corolla...", required: true },
      { icon: Calendar, label: "Yıl", name: "year", type: "number", placeholder: "2024", required: true },
    ],
  },
  {
    title: "Teknik Bilgiler",
    fields: [
      { icon: Gauge, label: "Kilometre", name: "mileage", type: "number", placeholder: "45000" },
      { icon: Fuel, label: "Motor Tipi", name: "engineType", type: "text", placeholder: "1.6 TSI" },
      { icon: Fuel, label: "Yakıt Tipi", name: "fuelType", type: "select", options: fuelTypes },
      { icon: Gauge, label: "Vites", name: "transmission", type: "select", options: transmissions },
      { icon: Hash, label: "Şasi No", name: "chassisNo", type: "text", placeholder: "WBA3X5C50EF..." },
    ],
  },
  {
    title: "Tarih & Durum Bilgileri",
    fields: [
      { icon: Shield, label: "Sigorta Bitiş", name: "insuranceExpiry", type: "date" },
      { icon: Calendar, label: "Muayene Bitiş", name: "inspectionExpiry", type: "date" },
      { icon: MapPin, label: "Akü Değişim Tarihi", name: "batteryDate", type: "date" },
      { icon: Car, label: "Lastik Tipi", name: "tireType", type: "select", options: tireTypes },
    ],
  },
];

export default function NewVehiclePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [name]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    
    addVehicle(formData);

    setIsSaving(false);
    setShowSuccess(true);

    setTimeout(() => {
      router.push("/vehicles");
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-outfit font-bold"
        >
          Araç Eklendi!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground mt-2"
        >
          Yönlendiriliyorsunuz...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="flex items-center justify-between p-3 px-4 max-w-md mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full h-9 w-9 hover:bg-primary/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-outfit font-bold text-sm">Yeni Araç Ekle</span>
          <div className="w-9" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-5 pb-28">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {formSections.map((section, sIdx) => (
            <motion.div key={sIdx} variants={item} className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
                {section.title}
              </h2>
              <Card className="rounded-2xl border-border/40 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {section.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <Label
                        htmlFor={field.name}
                        className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
                      >
                        <field.icon className="h-3.5 w-3.5" />
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </Label>

                      {field.type === "select" ? (
                        <Select
                          value={formData[field.name] || ""}
                          onValueChange={(v) => handleChange(field.name, v)}
                        >
                          <SelectTrigger
                            id={field.name}
                            className="rounded-xl h-11 bg-muted/30 border-border/40 text-sm focus:ring-primary/30"
                          >
                            <SelectValue placeholder="Seçiniz..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {field.options?.map((opt) => (
                              <SelectItem key={opt} value={opt} className="rounded-lg">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === "file" ? (
                        <div className="flex flex-col gap-2">
                          {formData[field.name] && (
                            <div className="relative w-full h-32 rounded-xl overflow-hidden mb-2 border border-border/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={formData[field.name]} alt="Preview" className="object-cover w-full h-full" />
                            </div>
                          )}
                          <Input
                            id={field.name}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileChange(field.name, e.target.files ? e.target.files[0] : null)
                            }
                            required={field.required && !formData[field.name]}
                            className="rounded-xl file:bg-primary/10 file:text-primary file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded-lg text-sm bg-muted/30 border-border/40 cursor-pointer"
                          />
                        </div>
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ""}
                          onChange={(e) =>
                            handleChange(field.name, e.target.value)
                          }
                          required={field.required}
                          className="rounded-xl h-11 bg-muted/30 border-border/40 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30"
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Submit */}
          <motion.div variants={item} className="pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full h-12 rounded-2xl font-semibold text-sm shadow-lg shadow-primary/20 relative overflow-hidden"
            >
              {isSaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
              ) : (
                <>
                  <Car className="h-4 w-4 mr-2" />
                  Araç Kaydet
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </div>
  );
}
