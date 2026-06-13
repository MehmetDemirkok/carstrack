"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Moon, Sun, Bell, Shield, HelpCircle, ChevronRight,
  Smartphone, Languages, Info, Car,
  Check, Globe, X, LogOut, Building2, Copy, Users, Camera, Mail, Lock, Send, BellRing,
} from "lucide-react";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, getPushSubscribed } from "@/lib/push-client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useLanguage } from "@/context/language-context";
import type { Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { HelpDialog } from "@/components/help-dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function SettingItem({
  icon: Icon, iconBg, iconColor, label, description, trailing, onClick,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  label: string; description?: string; trailing?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors tap-highlight-transparent text-left ${onClick ? "cursor-pointer" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`p-2 rounded-xl ${iconBg} shrink-0`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? "bg-primary" : "bg-muted"}`}
      aria-checked={on}
      role="switch"
    >
      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const { user, profile, company, signOut } = useAuth();
  const router = useRouter();

  // Avatar — localAvatar stores freshly uploaded image; falls back to profile value
  const [localAvatar, setLocalAvatar] = useState<string | undefined>(undefined);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const avatarUrl = localAvatar ?? profile?.avatarUrl;

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya çok büyük", { description: "Lütfen 10 MB'dan küçük bir görsel seçin." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = async () => {
        // Center-crop to square, then resize to 400×400
        const SIZE = 400;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarSaving(true);
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from("profiles")
            .update({ avatar_url: dataUrl })
            .eq("id", user!.id);
          if (error) throw error;
          setLocalAvatar(dataUrl);
          toast.success("Profil fotoğrafı güncellendi");
        } catch {
          toast.error("Fotoğraf kaydedilemedi");
        } finally {
          setAvatarSaving(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setAvatarRemoving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user!.id);
      if (error) throw error;
      setLocalAvatar(undefined);
      toast.success("Profil fotoğrafı kaldırıldı");
    } catch {
      toast.error("Kaldırılamadı");
    } finally {
      setAvatarRemoving(false);
    }
  };

  // Department edit
  const [department, setDepartment] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);

  useEffect(() => {
    setDepartment(profile?.department ?? "");
  }, [profile?.department]);

  const handleSaveDept = async () => {
    setDeptSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ department: department.trim() })
        .eq("id", user!.id);
      if (error) throw error;
      toast.success("Departman güncellendi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setDeptSaving(false);
    }
  };

  // Invite code (fetched separately for managers in case auth context doesn't have it)
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (profile?.role !== "manager" && profile?.role !== "operator") return;
    if (company?.inviteCode) { setInviteCode(company.inviteCode); return; }
    setInviteLoading(true);
    const supabase = createClient();
    supabase
      .from("companies")
      .select("invite_code")
      .eq("id", profile.companyId)
      .single()
      .then(({ data }: { data: { invite_code: string } | null }) => {
        if (data?.invite_code) setInviteCode(data.invite_code);
        setInviteLoading(false);
      });
  }, [profile, company]);

  // Dialogs
  const [showLang, setShowLang] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeForm, setEmailChangeForm] = useState({ newEmail: "", password: "" });
  const [emailChanging, setEmailChanging] = useState(false);

  const handleChangeEmail = async () => {
    const { newEmail, password } = emailChangeForm;
    if (!newEmail || !password) return;
    if (newEmail === user?.email) {
      toast.error("Aynı adres", { description: "Yeni e-posta mevcut adresinizle aynı." });
      return;
    }
    setEmailChanging(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password,
      });
      if (authError) {
        toast.error("Şifre hatalı", { description: "Mevcut şifrenizi doğru girdiğinizden emin olun." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setShowEmailChange(false);
      setEmailChangeForm({ newEmail: "", password: "" });
      toast.success("Onay e-postası gönderildi", {
        description: "Mevcut e-posta adresinize onay bağlantısı gönderildi. Onayladıktan sonra e-postanız değişecek.",
        duration: 7000,
      });
    } catch (err) {
      console.error(err);
      toast.error("Hata", { description: "E-posta değiştirilemedi. Lütfen tekrar deneyin." });
    } finally {
      setEmailChanging(false);
    }
  };

  // Notifications
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Telefon (Web Push) bildirimleri — Telegram'a giden uyarılar telefona da düşer
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const handlePushToggle = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        setPushSubscribed(false);
        toast.success("Telefon bildirimleri kapatıldı");
      } else {
        await subscribeToPush();
        setPushSubscribed(true);
        toast.success("Telefon bildirimleri açıldı", { description: "Bu cihaza uyarılar gönderilecek." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu";
      toast.error("Bildirim açılamadı", { description: msg });
    } finally {
      setPushBusy(false);
    }
  };

  // E-posta bildirimleri
  const [emailNotif, setEmailNotif] = useState(true);
  const [emailNotifSaving, setEmailNotifSaving] = useState(false);

  useEffect(() => {
    if (profile?.notifyByEmail !== undefined) setEmailNotif(profile.notifyByEmail);
  }, [profile?.notifyByEmail]);

  const handleEmailNotifToggle = async () => {
    const next = !emailNotif;
    setEmailNotif(next);
    setEmailNotifSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ notify_by_email: next })
        .eq("id", user!.id);
      if (error) throw error;
      toast.success(next ? "E-posta bildirimleri açıldı" : "E-posta bildirimleri kapatıldı");
    } catch {
      setEmailNotif(!next);
      toast.error("Kaydedilemedi");
    } finally {
      setEmailNotifSaving(false);
    }
  };

  // Telegram
  const [telegramChatId, setTelegramChatId] = useState<string | undefined>(undefined);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);

  useEffect(() => {
    setTelegramChatId(profile?.telegramChatId);
  }, [profile?.telegramChatId]);

  // GÜVENLİK: Telegram bağlama artık tahmin edilebilir user.id yerine sunucuda
  // üretilen tek-kullanımlık koda dayanır (C-3). Butona basınca kod alınıp
  // Telegram derin bağlantısı açılır.
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const handleTelegramConnect = async () => {
    // Popup engelleyiciye takılmamak için sekmeyi senkron aç, sonra adres ver.
    const tab = window.open("", "_blank");
    setTelegramConnecting(true);
    try {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.url) {
        if (tab) tab.location.href = json.url as string;
        else window.location.href = json.url as string;
      } else {
        tab?.close();
        toast.error("Bağlantı oluşturulamadı", { description: json?.error || "Tekrar deneyin." });
      }
    } catch {
      tab?.close();
      toast.error("Bağlantı hatası");
    } finally {
      setTelegramConnecting(false);
    }
  };

  const [telegramTesting, setTelegramTesting] = useState(false);
  const handleTelegramTest = async () => {
    setTelegramTesting(true);
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Test mesajı gönderildi", { description: "Telegram'ı kontrol edin." });
      } else {
        toast.error("Test başarısız", { description: json?.error || "Mesaj gönderilemedi." });
      }
    } catch {
      toast.error("Test başarısız", { description: "Bağlantı hatası." });
    } finally {
      setTelegramTesting(false);
    }
  };

  const handleTelegramDisconnect = async () => {
    setTelegramDisconnecting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: null })
        .eq("id", user!.id);
      if (error) throw error;
      setTelegramChatId(undefined);
      toast.success("Telegram bağlantısı kesildi");
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setTelegramDisconnecting(false);
    }
  };

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  // Prevents hydration mismatch for theme-dependent and browser-dependent UI
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reading browser APIs and localStorage on mount — legitimate setState in effect
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true);
    if ("Notification" in window) {
      setNotifSupported(true);
      setNotifPermission(Notification.permission);
      setNotifEnabled(localStorage.getItem("carstrack:notifications") === "true");
    }
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    if (isPushSupported()) {
      setPushSupported(true);
      getPushSubscribed().then(setPushSubscribed).catch(() => {});
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleNotifClick = async () => {
    if (!notifSupported) return;
    if (notifPermission === "denied") return;

    if (notifPermission === "granted") {
      const next = !notifEnabled;
      setNotifEnabled(next);
      localStorage.setItem("carstrack:notifications", String(next));
      return;
    }

    // permission === "default" → request
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      setNotifEnabled(true);
      localStorage.setItem("carstrack:notifications", "true");
      new Notification("CarsTrack", { body: t("settings_notifications_desc"), icon: "/favicon.ico" });
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowInstall(false);
      }
    }
  };

  // Notification trailing UI
  const notifTrailing = !notifSupported ? (
    <Badge variant="secondary" className="text-[10px] border-none">–</Badge>
  ) : notifPermission === "denied" ? (
    <Badge className="bg-red-500/10 text-red-500 border-none text-[10px] font-bold">{t("notif_denied")}</Badge>
  ) : notifPermission === "granted" ? (
    <Toggle on={notifEnabled} onToggle={handleNotifClick} />
  ) : (
    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
  );

  return (
    <div className="p-4 space-y-5 pb-28">
      <h1 className="text-2xl font-outfit font-bold tracking-tight">{t("settings_title")}</h1>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
        {/* Profile */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-3xl border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 ring-2 ring-primary/20 shadow-md">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="Profil fotoğrafı" className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl font-outfit">
                        {profile?.fullName ? getInitials(profile.fullName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Camera badge — always visible, not hover-only (mobile friendly) */}
                    <label
                      htmlFor="avatar-upload"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary shadow-md flex items-center justify-center cursor-pointer ring-2 ring-background transition-transform active:scale-95"
                      title="Fotoğraf değiştir"
                    >
                      {avatarSaving
                        ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-r-transparent animate-spin" />
                        : <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                      }
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => { handleAvatarFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                    />
                  </div>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={avatarRemoving}
                      className="text-[10px] text-destructive/70 hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      {avatarRemoving ? "Kaldırılıyor..." : "Kaldır"}
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold font-outfit truncate">
                    {profile?.fullName ?? user?.email?.split("@")[0] ?? "—"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">{user?.email ?? "—"}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-none">
                      {profile?.role === "manager" ? t("role_manager") : profile?.role === "operator" ? t("role_operator") : t("role_user")}
                    </Badge>
                    {company?.name && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{company.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Department / Title edit */}
              <div className="pt-3 border-t border-border/30 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Departman / Ünvan
                </label>
                <div className="flex gap-2">
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Örn: Satış, Teknik, İdari İşler..."
                    list="dept-suggestions"
                    className="flex-1 h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <datalist id="dept-suggestions">
                    {["Sürücüler", "Satış", "Teknik", "Muhasebe", "İdari İşler", "Pazarlama", "İnsan Kaynakları", "Yönetim"].map(
                      (d) => <option key={d} value={d} />
                    )}
                  </datalist>
                  <button
                    onClick={handleSaveDept}
                    disabled={deptSaving || department.trim() === (profile?.department ?? "")}
                    className="h-9 px-4 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {deptSaving ? "..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invite Code — managers and operators */}
        {(profile?.role === "manager" || profile?.role === "operator") && (
          <motion.div variants={fadeUp} className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">Ekip Daveti</h3>
            <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Ekip arkadaşlarınızı aynı şirkete davet edin</span>
                </div>

                {inviteLoading ? (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin shrink-0" />
                    Kod yükleniyor...
                  </div>
                ) : inviteCode ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-muted/60 border border-border/50 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono font-black text-lg tracking-[0.3em] text-foreground select-all">
                        {inviteCode}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl h-12 w-12 shrink-0 border-border/50"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode);
                        toast.success("Kopyalandı", { description: "Davet kodu panoya kopyalandı." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted/50 border border-border/40 rounded-xl px-4 py-3 text-xs text-muted-foreground">
                    Davet kodu henüz oluşturulmamış. Lütfen şirket yetkilisi ile iletişime geçin.
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Yeni çalışanlar kayıt ekranında <span className="font-semibold text-foreground">&ldquo;Şirkete Katıl&rdquo;</span> seçeneğini seçip bu kodu girerek filonuza erişim sağlayabilir. Katılanlar otomatik olarak <span className="font-semibold text-foreground">Sürücü</span> rolüyle eklenir.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Preferences */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">{t("settings_preferences")}</h3>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-2">
              <SettingItem
                icon={mounted && theme === "dark" ? Moon : Sun}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-500"
                label={t("settings_theme")}
                description={!mounted ? undefined : theme === "dark" ? t("settings_theme_dark") : theme === "light" ? t("settings_theme_light") : t("settings_theme_system")}
                trailing={<Toggle on={mounted && theme === "dark"} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
              <SettingItem
                icon={Bell}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                label={t("settings_notifications")}
                description={
                  notifPermission === "denied"
                    ? t("notif_denied_hint")
                    : t("settings_notifications_desc")
                }
                trailing={notifTrailing}
                onClick={notifPermission !== "granted" ? handleNotifClick : undefined}
              />
              <SettingItem
                icon={Mail}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-500"
                label={emailNotifSaving ? t("notif_email_saving") : t("notif_email")}
                description={t("notif_email_desc")}
                trailing={<Toggle on={emailNotif} onToggle={handleEmailNotifToggle} />}
                onClick={handleEmailNotifToggle}
              />
              {/* Telefon (Web Push) bildirimleri — yönetici/operatör, Telegram ile aynı kitle */}
              {profile?.role !== "user" && (
                <SettingItem
                  icon={BellRing}
                  iconBg="bg-orange-500/10"
                  iconColor="text-orange-500"
                  label="Telefon Bildirimleri"
                  description={
                    !pushSupported
                      ? (isIOS && !isInstalled
                          ? "Önce uygulamayı ana ekrana ekleyin (iOS gereği)"
                          : "Bu cihaz push bildirimini desteklemiyor")
                      : pushSubscribed
                        ? "Açık — uyarılar bu telefona gönderiliyor"
                        : "Telegram uyarılarını telefonunuza da alın"
                  }
                  trailing={
                    !pushSupported ? (
                      <Badge variant="secondary" className="text-[10px] border-none">–</Badge>
                    ) : pushBusy ? (
                      <span className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin shrink-0" />
                    ) : (
                      <Toggle on={pushSubscribed} onToggle={handlePushToggle} />
                    )
                  }
                  onClick={pushSupported && !pushBusy ? handlePushToggle : undefined}
                />
              )}
              {/* Telegram bildirimleri yalnızca yönetici/operatör içindir — sürücü rolünde gizlenir */}
              {profile?.role === "user" ? null : telegramChatId ? (
                <SettingItem
                  icon={Send}
                  iconBg="bg-sky-500/10"
                  iconColor="text-sky-500"
                  label="Telegram Bildirimleri"
                  description="Bağlı — uyarılar Telegram'a gönderiliyor"
                  trailing={
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTelegramTest(); }}
                        disabled={telegramTesting}
                        className="text-[11px] text-sky-600/80 hover:text-sky-600 border border-sky-500/20 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40"
                      >
                        {telegramTesting ? "..." : "Test Et"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTelegramDisconnect(); }}
                        disabled={telegramDisconnecting}
                        className="text-[11px] text-destructive/70 hover:text-destructive border border-destructive/20 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40"
                      >
                        {telegramDisconnecting ? "..." : "Bağlantıyı Kes"}
                      </button>
                    </div>
                  }
                />
              ) : user?.id ? (
                <button
                  type="button"
                  onClick={handleTelegramConnect}
                  disabled={telegramConnecting}
                  className="block w-full text-left disabled:opacity-60"
                >
                  <SettingItem
                    icon={Send}
                    iconBg="bg-sky-500/10"
                    iconColor="text-sky-500"
                    label="Telegram'ı Bağla"
                    description={telegramConnecting ? "Bağlantı oluşturuluyor…" : "Filo uyarılarını Telegram'dan al"}
                    trailing={<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  />
                </button>
              ) : (
                <SettingItem
                  icon={Send}
                  iconBg="bg-sky-500/10"
                  iconColor="text-sky-500"
                  label="Telegram'ı Bağla"
                  description="Filo uyarılarını Telegram'dan al"
                  trailing={<ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                />
              )}
              <SettingItem
                icon={Languages}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-500"
                label={t("settings_language")}
                description={locale === "tr" ? t("lang_tr") : t("lang_en")}
                trailing={
                  <Badge variant="secondary" className="text-[10px] font-bold border-none">
                    {locale.toUpperCase()}
                  </Badge>
                }
                onClick={() => setShowLang(true)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* App */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">{t("settings_app")}</h3>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-2">
              <SettingItem
                icon={Smartphone}
                iconBg="bg-teal-500/10"
                iconColor="text-teal-500"
                label={t("settings_add_to_home")}
                description={isInstalled ? t("install_already") : t("settings_add_to_home_desc")}
                trailing={
                  isInstalled
                    ? <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                }
                onClick={isInstalled ? undefined : () => setShowInstall(true)}
              />
              <Link href="/privacy" className="block">
                <SettingItem
                  icon={Shield}
                  iconBg="bg-emerald-500/10"
                  iconColor="text-emerald-500"
                  label={t("settings_privacy")}
                />
              </Link>
              <SettingItem
                icon={HelpCircle}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                label={t("settings_help")}
                onClick={() => setShowHelp(true)}
              />
              <SettingItem
                icon={Info}
                iconBg="bg-gray-500/10"
                iconColor="text-gray-500"
                label={t("settings_about")}
                description={t("settings_version")}
                trailing={<Badge variant="outline" className="text-[10px] font-medium border-border/50">v1.0.0</Badge>}
                onClick={() => setShowAbout(true)}
              />
            </CardContent>
          </Card>
        </motion.div>


        {/* Account / Logout */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">{t("settings_account")}</h3>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-2">
              <SettingItem
                icon={Mail}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
                label="E-posta Adresini Değiştir"
                description={user?.email ?? "—"}
                onClick={() => setShowEmailChange(true)}
              />
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/5 transition-colors tap-highlight-transparent text-left cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-destructive/10 shrink-0">
                  <LogOut className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-sm font-medium text-destructive">{t("settings_logout")}</span>
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Language Dialog ── */}
      <Dialog open={showLang} onOpenChange={setShowLang}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <Globe className="h-5 w-5 text-violet-500" /> {t("lang_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {(["tr", "en"] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => { setLocale(l); setShowLang(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${locale === l ? "border-primary bg-primary/5" : "border-border/40 hover:bg-muted/50"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{l === "tr" ? "🇹🇷" : "🇬🇧"}</span>
                  <span className="font-medium text-sm">{l === "tr" ? t("lang_tr") : t("lang_en")}</span>
                </div>
                {locale === l && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── About Dialog ── */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-xl">
                <Car className="h-5 w-5 text-primary" />
              </div>
              {t("about_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{t("about_desc")}</p>
            <div className="space-y-2">
              {[
                { label: t("about_version_label"), value: "1.0.0" },
                { label: t("about_developer"), value: "Mehmet Demirkök" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="w-full rounded-xl" />}>{t("about_close")}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Install Dialog ── */}
      <Dialog open={showInstall} onOpenChange={setShowInstall}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-teal-500" /> {t("install_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            {isIOS ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{t("install_ios_hint")}</p>
            ) : deferredPrompt ? (
              <p className="text-sm text-muted-foreground">{t("settings_add_to_home_desc")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("install_not_supported")}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl flex-1" />}>
              <X className="h-4 w-4 mr-1.5" /> {t("reset_cancel")}
            </DialogClose>
            {deferredPrompt && !isIOS && (
              <Button onClick={handleInstall} className="rounded-xl flex-1">
                <Smartphone className="h-4 w-4 mr-1.5" /> {t("install_btn")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Help & Support Dialog ── */}
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />

      {/* ── Email Change Dialog ── */}
      <Dialog open={showEmailChange} onOpenChange={(o) => { setShowEmailChange(o); if (!o) setEmailChangeForm({ newEmail: "", password: "" }); }}>
        <DialogContent className="rounded-3xl max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" /> E-posta Adresini Değiştir
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kimliğinizi doğrulamak için mevcut şifrenizi girin. Değişiklik için <span className="font-semibold text-foreground">eski e-posta adresinize</span> onay bağlantısı gönderilecek.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Yeni E-posta Adresi</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={emailChangeForm.newEmail}
                    onChange={(e) => setEmailChangeForm((f) => ({ ...f, newEmail: e.target.value }))}
                    placeholder="yeni@ornek.com"
                    className="w-full h-10 rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Mevcut Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={emailChangeForm.password}
                    onChange={(e) => setEmailChangeForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    onKeyDown={(e) => { if (e.key === "Enter") handleChangeEmail(); }}
                    className="w-full h-10 rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl flex-1" />}>İptal</DialogClose>
            <Button
              onClick={handleChangeEmail}
              disabled={emailChanging || !emailChangeForm.newEmail || !emailChangeForm.password}
              className="rounded-xl flex-1"
            >
              {emailChanging
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-r-transparent animate-spin" />
                : "Onay Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
