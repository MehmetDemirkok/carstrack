"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Moon, Sun, Bell, Shield, HelpCircle, ChevronRight,
  Smartphone, Languages, Info, Database, Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function SettingItem({
  icon: Icon, iconBg, iconColor, label, description, trailing, onClick,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  label: string; description?: string; trailing?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors tap-highlight-transparent text-left">
      <div className={`p-2 rounded-xl ${iconBg} shrink-0`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showClearData, setShowClearData] = useState(false);

  const handleClearData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("carstrack:vehicles");
      localStorage.removeItem("carstrack:records");
    }
    setShowClearData(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="p-4 space-y-5 pb-28">
      <h1 className="text-2xl font-outfit font-bold tracking-tight">Ayarlar</h1>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
        {/* Profile */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20 shadow-md">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl font-outfit">MD</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold font-outfit">Mehmet Demirkok</h2>
                  <p className="text-xs text-muted-foreground">mehmetdemirkok@gmail.com</p>
                  <Badge variant="secondary" className="mt-1.5 text-[10px] font-bold bg-primary/10 text-primary border-none">
                    Premium Üye
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">Tercihler</h3>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-2">
              <SettingItem
                icon={theme === "dark" ? Moon : Sun}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-500"
                label="Tema"
                description={theme === "dark" ? "Koyu Mod" : theme === "light" ? "Açık Mod" : "Sistem"}
                trailing={
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={`relative w-12 h-7 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                }
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
              <SettingItem icon={Bell} iconBg="bg-orange-500/10" iconColor="text-orange-500" label="Bildirimler" description="Bakım ve belge hatırlatmaları" />
              <SettingItem
                icon={Languages} iconBg="bg-blue-500/10" iconColor="text-blue-500"
                label="Dil" description="Türkçe"
                trailing={<Badge variant="secondary" className="text-[10px] font-bold border-none">TR</Badge>}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* App */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">Uygulama</h3>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-2">
              <SettingItem icon={Smartphone} iconBg="bg-teal-500/10" iconColor="text-teal-500" label="Ana Ekrana Ekle" description="PWA olarak yükle" />
              <SettingItem icon={Shield} iconBg="bg-emerald-500/10" iconColor="text-emerald-500" label="Gizlilik & Güvenlik" />
              <SettingItem icon={HelpCircle} iconBg="bg-amber-500/10" iconColor="text-amber-500" label="Yardım & Destek" />
              <SettingItem
                icon={Database} iconBg="bg-gray-500/10" iconColor="text-gray-500"
                label="Verileri Sıfırla"
                description="Tüm araç ve servis kayıtlarını sil"
                onClick={() => setShowClearData(true)}
              />
              <SettingItem
                icon={Info} iconBg="bg-gray-500/10" iconColor="text-gray-500"
                label="Hakkında" description="Sürüm 1.0.0"
                trailing={<Badge variant="outline" className="text-[10px] font-medium border-border/50">v1.0.0</Badge>}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Data reset dialog */}
      <Dialog open={showClearData} onOpenChange={setShowClearData}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Verileri Sıfırla
            </DialogTitle>
          </DialogHeader>
          <p className="py-3 text-sm text-muted-foreground">
            Tüm araç ve servis kayıtları <b>kalıcı olarak</b> silinecek. Bu işlem geri alınamaz.
          </p>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>İptal</DialogClose>
            <Button variant="destructive" onClick={handleClearData} className="rounded-xl">Sıfırla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
