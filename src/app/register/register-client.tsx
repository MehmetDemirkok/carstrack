"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Car, Eye, EyeOff, ArrowRight, CheckCircle2,
  Building2, Users, User, Mail, Lock,
  MapPin, Wrench, BarChart3, Home, Sun, Moon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo-mark";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

type Mode = "create" | "join" | "invite";

const ROLE_LABELS: Record<string, string> = {
  manager: "Şirket Yetkilisi",
  operator: "Operatör",
  user: "Kullanıcı",
};

const statCards = [
  { label: "Aktif Filo", value: "247 Araç", accent: "#4cd7f6" },
  { label: "Uptime Oranı", value: "99.2%", accent: "#d0bcff" },
  { label: "Güvenlik", value: "7/24 Takip", accent: "#c2c1ff" },
];

const features = [
  { icon: MapPin,    title: "Araç Takibi",       desc: "Tüm araçlarınız tek ekranda — model, km, yakıt ve daha fazlası." },
  { icon: Wrench,    title: "Bakım Yönetimi",    desc: "Öngörücü bakım uyarıları ile beklenmedik duruşları minimize edin." },
  { icon: BarChart3, title: "Gelişmiş Analitik", desc: "Yakıt tüketimi ve filo performansı üzerine derinlemesine raporlar." },
];

function getPasswordStrength(pw: string): { level: number; label: string } {
  if (!pw) return { level: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Zayıf", "Orta", "Güçlü", "Çok Güçlü"];
  return { level: score, label: labels[Math.min(score - 1, 3)] || "Zayıf" };
}

export default function RegisterClient() {
  const [mode, setMode] = useState<Mode>("create");
  const [form, setForm] = useState({
    companyName: "", inviteCode: "",
    fullName: "", email: "", password: "", confirmPassword: "",
  });
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [joinedCompany, setJoinedCompany] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();
  const { user: activeUser } = useAuth();

  // ── E-posta daveti (?invite=<token>) ile gelindiyse formu davet moduna al ──
  const inviteToken = searchParams.get("invite");
  const [inviteInfo, setInviteInfo] = useState<{ companyName: string; role: string } | null>(null);
  const [inviteChecking, setInviteChecking] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invites/validate?token=${encodeURIComponent(inviteToken)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setInviteError(data.error || "Davet bağlantısı geçersiz.");
        } else {
          setMode("invite");
          setInviteInfo({ companyName: data.companyName, role: data.role });
          setForm(f => ({ ...f, email: data.email }));
        }
      } catch {
        if (!cancelled) setInviteError("Davet doğrulanamadı. Lütfen tekrar deneyin.");
      } finally {
        if (!cancelled) setInviteChecking(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const switchMode = (m: Mode) => { setMode(m); setError(""); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Şifreler eşleşmiyor."); return; }
    if (form.password.length < 6)               { setError("Şifre en az 6 karakter olmalıdır."); return; }
    if (mode === "create" && !form.companyName.trim()) { setError("Şirket adı gereklidir."); return; }
    if (mode === "join"   && !form.inviteCode.trim())  { setError("Davet kodu gereklidir."); return; }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode, companyName: form.companyName, inviteCode: form.inviteCode, inviteToken,
        fullName: form.fullName, email: form.email, password: form.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Bir hata oluştu.");
      toast.error("Hata", { description: data.error });
      setLoading(false);
      return;
    }
    if (mode === "join" || mode === "invite") setJoinedCompany(data.companyName || "");
    setSuccess(true);
    toast.success(mode === "create" ? "Şirket oluşturuldu!" : "Şirkete katıldınız!");
    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1400);
  };

  const strength = getPasswordStrength(form.password);

  const inputStyle: React.CSSProperties = {
    background: "var(--card)",
    borderLeft: "2px solid #d0bcff",
    borderTop: "1px solid rgba(208,188,255,0.12)",
    borderRight: "1px solid rgba(208,188,255,0.12)",
    borderBottom: "1px solid rgba(208,188,255,0.12)",
    borderRadius: "0 6px 6px 0",
    color: "var(--foreground)",
    fontFamily: "var(--font-ibm-mono), monospace",
    fontSize: "0.85rem",
    outline: "none",
    boxShadow: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--muted-foreground)", fontSize: "0.62rem",
    fontFamily: "var(--font-ibm-mono), monospace",
    letterSpacing: "0.1em", textTransform: "uppercase",
  };

  return (
    <div className="auth-page min-h-[100dvh] w-full flex-1 flex flex-col lg:flex-row overflow-x-hidden bg-background">

      {/* ── LEFT — stats panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[32%] relative overflow-hidden flex-col justify-between"
        style={{ background: "var(--ct-panel-bg)" }}
      >
        {/* Hex grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0 L60 17.3 L60 34.7 L30 52 L0 34.7 L0 17.3Z' fill='none' stroke='rgba(99,102,241,0.06)' stroke-width='0.8'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 52px",
          }}
        />
        {/* Radar pulse */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: "40%", left: "50%", width: 420, height: 420, marginLeft: -210, marginTop: -210,
            background: "radial-gradient(circle, rgba(76,215,246,0.12) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-9 xl:p-11">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <LogoMark size={42} className="shrink-0" />
            <div>
              <span style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", color: "var(--ct-panel-text)", fontWeight: 800, fontSize: "1.15rem" }}>
                Cars<span style={{ background: "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Track</span>
              </span>
              <p style={{ color: "var(--ct-panel-muted)", fontSize: "0.6rem", fontFamily: "var(--font-ibm-mono), monospace", marginTop: 2 }}>
                Filo Yönetim Sistemi
              </p>
            </div>
          </Link>

          {/* Stat cards */}
          <div className="space-y-4">
            {statCards.map(({ label, value, accent }, i) => (
              <motion.div
                key={label}
                className="rounded-xl p-5"
                style={{
                  background: "var(--ct-card-bg)",
                  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid var(--ct-card-border)",
                  borderLeft: `4px solid ${accent}`,
                }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
                whileHover={{ x: 6 }}
              >
                <div style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "var(--ct-panel-muted)", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", color: "var(--ct-panel-text)", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>
                  {value}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tagline */}
          <p style={{ color: "var(--ct-panel-muted)", fontSize: "0.8rem", lineHeight: 1.6, maxWidth: 260 }}>
            Yapay zeka destekli lojistik yönetimi ile operasyonel maliyetlerinizi %30&apos;a kadar azaltın.
          </p>
        </div>
      </div>

      {/* ── MIDDLE — registration form ── */}
      <motion.div
        className="flex-1 flex flex-col lg:overflow-y-auto relative bg-background"
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Diagonal line pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(208,188,255,0.015) 40px, rgba(208,188,255,0.015) 41px)`,
          }}
        />

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-8 pb-4 relative z-10">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-lg"
              style={{ background: "rgba(208,188,255,0.15)", border: "1px solid rgba(208,188,255,0.3)" }}>
              <Car className="h-5 w-5" style={{ color: "#d0bcff" }} />
            </div>
            <span style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", color: "var(--foreground)", fontWeight: 800, fontSize: "1.15rem" }}>
              Cars<span style={{ background: "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Track</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { const next = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(next); }}
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors relative"
              style={{ background: "rgba(208,188,255,0.1)", border: "1px solid rgba(208,188,255,0.2)", color: "#d0bcff" }}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <Link href="/login" style={{ color: "#d0bcff", fontSize: "0.75rem", fontWeight: 600 }}>Giriş yap →</Link>
          </div>
        </div>

        {/* Desktop theme toggle — top right corner */}
        <div className="hidden lg:flex absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={() => { const next = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(next); }}
            className="h-9 w-9 flex items-center justify-center rounded-xl transition-all hover:scale-105 relative"
            style={{ background: "rgba(208,188,255,0.1)", border: "1px solid rgba(208,188,255,0.2)", color: "#d0bcff" }}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
        </div>

        {/* Form area — centered, max-width constrained */}
        <div className="flex-1 flex flex-col justify-center items-center relative z-10 px-4 py-8 lg:py-10">
          <div className="w-full max-w-[440px]">

            {/* Back to home */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 mb-5 transition-colors group"
              style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontFamily: "var(--font-ibm-mono), monospace", textDecoration: "none" }}
            >
              <Home className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" style={{ color: "#d0bcff" }} />
              <span className="group-hover:text-foreground transition-colors" style={{ color: "inherit" }}>Ana Sayfaya Dön</span>
            </Link>

            {/* Header */}
            <div className="mb-6">
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "#d0bcff", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.6rem" }}>
                ▸ YENİ HESAP
              </span>
              <h1 style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1 }}>
                Sisteme Kayıt Ol
              </h1>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginTop: "0.4rem" }}>
                Filo takip sistemine erişim için hesap oluşturun.{" "}
                <Link href="/login" style={{ color: "#d0bcff", fontWeight: 600 }}>Giriş yapın</Link>
              </p>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "#d0bcff", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  ADIM 1 / 2
                </span>
                <span style={{ ...labelStyle }}>TEMEL BİLGİLER</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(208,188,255,0.12)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)", boxShadow: "0 0 16px rgba(208,188,255,0.5)" }}
                  initial={{ width: 0 }}
                  animate={{ width: "50%" }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Mode Switcher — davetle gelindiyse gizli (mod değiştirilemez) */}
            {mode !== "invite" && (
              <div
                className="flex mb-5 gap-1 p-1 rounded-lg"
                style={{ background: "var(--ct-switch-track)", border: "1px solid var(--ct-chip-border)" }}
              >
                {([
                  { id: "create" as Mode, icon: Building2, label: "Şirket Kur" },
                  { id: "join"   as Mode, icon: Users,     label: "Şirkete Katıl" },
                ] as const).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchMode(id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all active:scale-95"
                    style={{
                      background: mode === id ? "var(--ct-chip-bg)" : "transparent",
                      border: mode === id ? "1px solid var(--ct-chip-border)" : "1px solid transparent",
                      color: mode === id ? "var(--ct-purple)" : "var(--muted-foreground)",
                      fontFamily: "var(--font-barlow), sans-serif",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Davet bilgi kartı */}
            {inviteToken && (
              <div
                className="mb-5 px-4 py-3 rounded-xl"
                style={{ background: "var(--ct-chip-bg)", border: "1px solid var(--ct-chip-border)" }}
              >
                {inviteChecking ? (
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Davet doğrulanıyor...</p>
                ) : inviteError ? (
                  <p style={{ color: "#f87171", fontSize: "0.78rem" }}>{inviteError}</p>
                ) : inviteInfo ? (
                  <>
                    <p style={{ color: "var(--foreground)", fontSize: "0.8rem" }}>
                      <span style={{ fontWeight: 700 }}>{inviteInfo.companyName}</span> şirketine{" "}
                      <span style={{ fontWeight: 700 }}>{ROLE_LABELS[inviteInfo.role] ?? inviteInfo.role}</span> rolüyle katılıyorsunuz.
                    </p>
                    {activeUser && activeUser.email?.toLowerCase() !== form.email.toLowerCase() && (
                      <p style={{ color: "#fbbf24", fontSize: "0.74rem", marginTop: 8 }}>
                        Bu cihazda <b>{activeUser.email}</b> hesabıyla oturum açık. Kaydı tamamladığınızda o hesaptan çıkış yapılıp bu yeni hesaba geçilecek.
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* Success overlay */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-20"
                  style={{ background: "rgba(8,12,20,0.97)", borderRadius: 12 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  >
                    <CheckCircle2 className="h-20 w-20" style={{ color: "#4cd7f6" }} />
                  </motion.div>
                  <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "#e8eaf0", textAlign: "center" }}>
                    {mode === "create" ? "Şirket Oluşturuldu!" : "Katılım Başarılı!"}
                  </p>
                  {(mode === "join" || mode === "invite") && joinedCompany && (
                    <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
                      <span style={{ color: "#e8eaf0", fontWeight: 600 }}>{joinedCompany}</span> şirketine katıldınız.
                    </p>
                  )}
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
                    Yönlendiriliyorsunuz...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                variants={container}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -8 }}
                onSubmit={handleSubmit}
                className="space-y-3"
              >
                {mode === "create" ? (
                  <motion.div variants={item} className="space-y-1">
                    <label htmlFor="reg-company" style={labelStyle}>Şirket / Filo Adı</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                      <Input id="reg-company" value={form.companyName} onChange={set("companyName")} placeholder="ABC Lojistik" className="h-11 pl-9 border-0" style={inputStyle} required />
                    </div>
                  </motion.div>
                ) : mode === "join" ? (
                  <motion.div variants={item} className="space-y-1">
                    <label htmlFor="reg-invite" style={labelStyle}>Davet Kodu</label>
                    <Input
                      id="reg-invite"
                      value={form.inviteCode}
                      onChange={e => setForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                      placeholder="A1B2C3D4"
                      className="h-11 pl-4 border-0 tracking-[0.2em] uppercase"
                      style={inputStyle}
                      maxLength={8}
                      required
                    />
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.6rem", fontFamily: "var(--font-ibm-mono), monospace", paddingLeft: 2 }}>
                      Şirket yetkilisinden aldığınız 8 haneli kodu girin.
                    </p>
                  </motion.div>
                ) : null}

                <motion.div variants={item} className="space-y-1">
                  <label htmlFor="reg-fullname" style={labelStyle}>Ad Soyad</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                    <Input id="reg-fullname" value={form.fullName} onChange={set("fullName")} placeholder="Ahmet Yılmaz" className="h-11 pl-9 border-0" style={inputStyle} required />
                  </div>
                </motion.div>

                <motion.div variants={item} className="space-y-1">
                  <label htmlFor="reg-email" style={labelStyle}>E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                    <Input
                      id="reg-email"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder={mode === "create" ? "yonetici@sirket.com" : "calisan@sirket.com"}
                      className="h-11 pl-9 border-0"
                      style={inputStyle}
                      required
                      readOnly={mode === "invite"}
                      autoComplete="email"
                    />
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.div variants={item} className="space-y-1">
                    <label htmlFor="reg-password" style={labelStyle}>Şifre</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                      <Input
                        id="reg-password"
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={set("password")}
                        placeholder="••••••••"
                        className="h-11 pl-9 pr-9 border-0"
                        style={inputStyle}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={item} className="space-y-1">
                    <label htmlFor="reg-confirm" style={labelStyle}>Tekrar</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                      <Input
                        id="reg-confirm"
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={set("confirmPassword")}
                        placeholder="••••••••"
                        className="h-11 pl-9 pr-9 border-0"
                        style={inputStyle}
                        required
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Password strength */}
                {form.password && (
                  <motion.div variants={item} className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: seg <= strength.level ? "#d0bcff" : "rgba(208,188,255,0.12)" }}
                        />
                      ))}
                    </div>
                    <p style={{ color: strength.level >= 3 ? "#4cd7f6" : "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
                      {strength.label}
                    </p>
                  </motion.div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2.5 px-4 py-3"
                    style={{ background: "rgba(220,38,38,0.08)", borderLeft: "2px solid rgba(220,38,38,0.6)", borderRadius: "0 6px 6px 0" }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#dc2626" }} />
                    <p style={{ color: "#f87171", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem" }}>{error}</p>
                  </motion.div>
                )}

                <motion.div variants={item}>
                  <button
                    type="submit"
                    disabled={loading || success}
                    className="w-full h-11 mt-1 relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 rounded-xl"
                    style={{
                      background: "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)",
                      boxShadow: "0 0 24px rgba(109,59,215,0.55)",
                      color: "#23005c",
                      fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      letterSpacing: "0.12em",
                      border: "none",
                      cursor: loading || success ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading
                      ? <span style={{ animation: "blink 1s step-start infinite" }}>İŞLENİYOR...</span>
                      : <span className="flex items-center justify-center gap-2">HESAP OLUŞTUR <ArrowRight className="h-4 w-4" /></span>
                    }
                  </button>
                </motion.div>
              </motion.form>
            </AnimatePresence>

            <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", textAlign: "center", marginTop: "1.25rem" }}>
              Zaten hesabınız var mı?{" "}
              <Link href="/login" style={{ color: "#d0bcff", fontWeight: 600 }}>Giriş yap</Link>
            </p>

          </div>
        </div>
      </motion.div>

      {/* ── RIGHT — features & social proof (xl only) ── */}
      <motion.div
        className="hidden xl:flex xl:w-[28%] relative overflow-hidden flex-col justify-between p-10 2xl:p-12"
        style={{ background: "var(--ct-panel-bg)", borderLeft: "1px solid var(--ct-divider)" }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="space-y-9">
          <div>
            <span style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "var(--ct-purple)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.6rem" }}>
              ▸ NEDEN CARSTRACK?
            </span>
            <h3 style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--ct-panel-text)", lineHeight: 1.2 }}>
              Filo yönetiminin<br /><span style={{ color: "var(--ct-purple)" }}>akıllı</span> yolu
            </h3>
          </div>

          <div className="space-y-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="flex gap-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              >
                <div
                  className="shrink-0 flex items-center justify-center rounded-xl"
                  style={{ width: 44, height: 44, background: "var(--ct-chip-bg)", border: "1px solid var(--ct-chip-border)" }}
                >
                  <Icon style={{ color: "var(--ct-cyan)", width: 18, height: 18 }} />
                </div>
                <div className="min-w-0">
                  <h4 style={{ color: "var(--ct-panel-text)", fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-barlow), sans-serif", marginBottom: 3 }}>
                    {title}
                  </h4>
                  <p style={{ color: "var(--ct-panel-muted)", fontSize: "0.74rem", lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <motion.div
          className="rounded-2xl p-7 relative overflow-hidden"
          style={{
            background: "var(--ct-card-bg)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--ct-card-border)",
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl" style={{ background: "rgba(76,215,246,0.12)" }} />
          <div className="relative flex flex-col items-center text-center">
            <div className="flex -space-x-3 mb-4">
              {["A", "B", "C"].map((l) => (
                <div key={l} className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "var(--ct-chip-bg)", color: "var(--ct-purple)", border: "2px solid var(--ct-ring)" }}>
                  {l}
                </div>
              ))}
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: "linear-gradient(135deg, #d0bcff 0%, #4cd7f6 100%)", color: "#23005c", border: "2px solid var(--ct-ring)" }}>
                +49
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", fontSize: "1.6rem", fontWeight: 800, color: "var(--ct-panel-text)", lineHeight: 1 }}>
              500+
            </div>
            <p style={{ color: "var(--ct-panel-muted)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>
              Şirket Güveniyor
            </p>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        /* Side-panel theming — light defaults, overridden in dark */
        .auth-page {
          --ct-purple: #6d5bd0;
          --ct-cyan: #1c8aa8;
          --ct-panel-bg: linear-gradient(160deg, #f2f1fb 0%, #eaedf7 60%, #e3e7f4 100%);
          --ct-panel-text: #1b2333;
          --ct-panel-muted: #5b6478;
          --ct-card-bg: rgba(255,255,255,0.66);
          --ct-card-border: rgba(99,102,241,0.16);
          --ct-chip-bg: rgba(99,102,241,0.09);
          --ct-chip-border: rgba(99,102,241,0.2);
          --ct-divider: rgba(99,102,241,0.14);
          --ct-ring: #eef0f8;
          --ct-switch-track: rgba(99,102,241,0.07);
        }
        .dark .auth-page {
          --ct-purple: #d0bcff;
          --ct-cyan: #4cd7f6;
          --ct-panel-bg: linear-gradient(160deg, #161a2e 0%, #0f131d 60%, #0a0e18 100%);
          --ct-panel-text: #e8eaf0;
          --ct-panel-muted: rgba(255,255,255,0.5);
          --ct-card-bg: rgba(255,255,255,0.03);
          --ct-card-border: rgba(255,255,255,0.1);
          --ct-chip-bg: rgba(208,188,255,0.1);
          --ct-chip-border: rgba(208,188,255,0.2);
          --ct-divider: rgba(208,188,255,0.1);
          --ct-ring: #0f131d;
          --ct-switch-track: rgba(15,19,29,0.9);
        }
      `}</style>
    </div>
  );
}
