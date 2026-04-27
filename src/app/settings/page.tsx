"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Moon, Sun, Bell, Shield, HelpCircle, ChevronRight,
  Smartphone, Languages, Info, Database, Trash2, Car,
  Check, Globe, X, LogOut, Building2, Copy, Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import type { Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

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

  // Invite code (fetched separately for managers in case auth context doesn't have it)
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (profile?.role !== "manager") return;
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
  const [showClearData, setShowClearData] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Notifications
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [notifEnabled, setNotifEnabled] = useState(false);

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

  const handleClearData = async () => {
    // Clear localStorage
    localStorage.removeItem("carstrack:vehicles");
    localStorage.removeItem("carstrack:records");

    // Clear Supabase data scoped to the authenticated user's company
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
        if (profile?.company_id) {
          await supabase.from("service_records").delete().eq("company_id", profile.company_id);
          await supabase.from("vehicles").delete().eq("company_id", profile.company_id);
        }
      }
    } catch {
      // Silent — localStorage already cleared
    }

    setShowClearData(false);
    toast.success("Başarılı", { description: "Veriler başarıyla temizlendi." });
    router.push("/");
    router.refresh();
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
                <Avatar className="h-16 w-16 ring-2 ring-primary/20 shadow-md shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl font-outfit">
                    {profile?.fullName ? getInitials(profile.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold font-outfit truncate">
                    {profile?.fullName ?? user?.email?.split("@")[0] ?? "—"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">{user?.email ?? "—"}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-none">
                      {profile?.role === "driver" ? t("role_driver") : t("role_manager")}
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Invite Code — only for managers */}
        {profile?.role === "manager" && (
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
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
                    Davet kodu oluşturulmamış. Supabase SQL Editor&apos;de migration&apos;ı çalıştırın.
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
                iconBg="bg-purple-500/10"
                iconColor="text-purple-500"
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
                icon={Languages}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
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
                icon={Database}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
                label={t("settings_reset_data")}
                description={t("settings_reset_data_desc")}
                trailing={<Trash2 className="h-4 w-4 text-red-400 shrink-0" />}
                onClick={() => setShowClearData(true)}
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

      {/* ── Reset Data Dialog ── */}
      <Dialog open={showClearData} onOpenChange={setShowClearData}>
        <DialogContent className="rounded-3xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-outfit text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> {t("reset_title")}
            </DialogTitle>
          </DialogHeader>
          <p className="py-3 text-sm text-muted-foreground">{t("reset_body")}</p>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" className="rounded-xl" />}>{t("reset_cancel")}</DialogClose>
            <Button variant="destructive" onClick={handleClearData} className="rounded-xl">{t("reset_confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Language Dialog ── */}
      <Dialog open={showLang} onOpenChange={setShowLang}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" /> {t("lang_title")}
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
                { label: t("about_developer"), value: "Arda Yazılım" },
                { label: t("about_tech"), value: "Next.js 16 · React 19 · Supabase" },
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
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="rounded-3xl max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="font-outfit flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-500" /> {t("help_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1 max-h-72 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t("help_faq_title")}</p>
            {[
              { q: t("help_q1"), a: t("help_a1") },
              { q: t("help_q2"), a: t("help_a2") },
              { q: t("help_q3"), a: t("help_a3") },
            ].map(({ q, a }) => (
              <div key={q} className="p-3 rounded-2xl bg-muted/40">
                <p className="text-sm font-semibold">{q}</p>
                <p className="text-xs text-muted-foreground mt-1">{a}</p>
              </div>
            ))}
            <div className="pt-2 pb-1">
              <p className="text-xs text-muted-foreground">{t("help_contact")}</p>
              <a href="mailto:support@carstrack.com" className="text-sm font-medium text-primary">
                support@carstrack.com
              </a>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="w-full rounded-xl" />}>{t("help_close")}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
