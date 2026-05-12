"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, Eye, EyeOff, ArrowRight, CheckCircle2,
  Building2, Hash, Users, User, Mail, Lock,
  MapPin, Fuel, Signal, Shield, Home, Sun, Moon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

type Mode = "create" | "join";

const floatingIcons = [
  { icon: Fuel,   delay: 0 },
  { icon: Signal, delay: 0.4 },
  { icon: MapPin, delay: 0.8 },
  { icon: Shield, delay: 1.2 },
];

const statCards = [
  { value: "247",   label: "Araç",  sub: "Aktif Filo" },
  { value: "99.2%", label: "Uptime",sub: "Kesintisiz" },
  { value: "7/24",  label: "Takip", sub: "Gerçek Zamanlı" },
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

export default function RegisterPage() {
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
      body: JSON.stringify({ mode, companyName: form.companyName, inviteCode: form.inviteCode, fullName: form.fullName, email: form.email, password: form.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Bir hata oluştu.");
      toast.error("Hata", { description: data.error });
      setLoading(false);
      return;
    }
    if (mode === "join") setJoinedCompany(data.companyName || "");
    setSuccess(true);
    toast.success(mode === "create" ? "Şirket oluşturuldu!" : "Şirkete katıldınız!");
    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1400);
  };

  const { setTheme } = useTheme();

  const strength = getPasswordStrength(form.password);

  const inputStyle: React.CSSProperties = {
    background: "var(--card)",
    borderLeft: "2px solid #6366f1",
    borderTop: "1px solid rgba(99,102,241,0.12)",
    borderRight: "1px solid rgba(99,102,241,0.12)",
    borderBottom: "1px solid rgba(99,102,241,0.12)",
    borderRadius: "0 6px 6px 0",
    color: "var(--foreground)",
    fontFamily: "var(--font-ibm-mono), monospace",
    fontSize: "0.85rem",
    outline: "none",
    boxShadow: "none",
  };

  return (
    <div className="auth-page min-h-[100dvh] w-full flex-1 flex flex-col lg:flex-row overflow-x-hidden bg-background">

      {/* ── LEFT — Fleet panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[42%] relative overflow-hidden flex-col justify-between"
        style={{ background: "linear-gradient(160deg, #12122e 0%, #0d0d21 100%)" }}
      >
        {/* Hex grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0 L60 17.3 L60 34.7 L30 52 L0 34.7 L0 17.3Z' fill='none' stroke='rgba(99,102,241,0.05)' stroke-width='0.8'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 52px",
          }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 50%, rgba(14,14,45,0.8) 100%)",
            backgroundSize: "200% 200%",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              <Car className="h-5 w-5" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <span style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", color: "#e8eaf0", fontWeight: 800, fontSize: "1.2rem" }}>
                Cars<span style={{ color: "#6366f1" }}>Track</span>
              </span>
              <p style={{ color: "#4a5568", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", marginTop: 2 }}>
                Filo Yönetim Sistemi
              </p>
            </div>
          </div>

          {/* Center: vehicle illustration */}
          <div className="flex flex-col items-center justify-center flex-1 py-6">
            <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 70 + i * 52, height: 70 + i * 52,
                    border: `1px solid rgba(99,102,241,${0.35 - i * 0.08})`,
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.3, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                />
              ))}
              <div className="relative z-10" style={{ width: 100, height: 100 }}>
                <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
                  <rect x="18" y="30" width="64" height="100" rx="14" fill="#1a1a3f" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5"/>
                  <rect x="26" y="48" width="48" height="60" rx="8" fill="#12122e" stroke="rgba(99,102,241,0.3)" strokeWidth="1"/>
                  <rect x="29" y="50" width="42" height="22" rx="5" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.4)" strokeWidth="0.8"/>
                  <rect x="29" y="88" width="42" height="16" rx="5" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.3)" strokeWidth="0.8"/>
                  <rect x="20" y="30" width="14" height="8" rx="3" fill="rgba(99,102,241,0.7)"/>
                  <rect x="66" y="30" width="14" height="8" rx="3" fill="rgba(99,102,241,0.7)"/>
                  <rect x="20" y="122" width="14" height="8" rx="3" fill="rgba(129,140,248,0.6)"/>
                  <rect x="66" y="122" width="14" height="8" rx="3" fill="rgba(129,140,248,0.6)"/>
                  <rect x="6" y="38" width="14" height="28" rx="5" fill="#1a1a3f" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
                  <rect x="80" y="38" width="14" height="28" rx="5" fill="#1a1a3f" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
                  <rect x="6" y="94" width="14" height="28" rx="5" fill="#1a1a3f" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
                  <rect x="80" y="94" width="14" height="28" rx="5" fill="#1a1a3f" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="50" y2="106" stroke="rgba(99,102,241,0.15)" strokeWidth="1" strokeDasharray="4 3"/>
                </svg>
              </div>
              {floatingIcons.map(({ icon: Icon, delay }, idx) => {
                const angles = [315, 45, 135, 225];
                const rad = (angles[idx] * Math.PI) / 180;
                const r = 108;
                const x = Math.cos(rad) * r;
                const y = Math.sin(rad) * r;
                return (
                  <motion.div
                    key={idx}
                    className="absolute flex items-center justify-center rounded-lg"
                    style={{
                      left: "50%", top: "50%",
                      marginLeft: x - 14, marginTop: y - 14,
                      width: 28, height: 28,
                      background: "rgba(99,102,241,0.1)",
                      border: "1px solid rgba(99,102,241,0.25)",
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay, ease: "easeInOut" }}
                  >
                    <Icon style={{ color: "#6366f1", width: 12, height: 12 }} />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stat cards */}
          <div className="space-y-3">
            <div className="flex gap-2">
              {statCards.map(({ value, label, sub }, i) => (
                <motion.div
                  key={label}
                  className="flex-1 rounded-lg p-2.5"
                  style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.14)" }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                >
                  <div style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "#6366f1", fontSize: "0.95rem", fontWeight: 600 }}>{value}</div>
                  <div style={{ color: "#e8eaf0", fontSize: "0.62rem", fontFamily: "var(--font-barlow), sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
                  <div style={{ color: "#4a5568", fontSize: "0.58rem" }}>{sub}</div>
                </motion.div>
              ))}
            </div>
            <p style={{ color: "#4a5568", fontSize: "0.72rem", fontStyle: "italic", textAlign: "center" }}>
              Filosunu gerçek zamanlı takip et.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT — form panel ── */}
      <motion.div
        className="flex-1 flex flex-col lg:overflow-y-auto relative bg-background"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(99,102,241,0.018) 40px, rgba(99,102,241,0.018) 41px)`,
          }}
        />

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-8 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-lg"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              <Car className="h-5 w-5" style={{ color: "#6366f1" }} />
            </div>
            <span style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", color: "var(--foreground)", fontWeight: 800, fontSize: "1.15rem" }}>
              Cars<span style={{ color: "#6366f1" }}>Track</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { const next = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(next); }}
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors relative"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#6366f1" }}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <Link href="/login" style={{ color: "#6366f1", fontSize: "0.75rem", fontWeight: 600 }}>Giriş yap →</Link>
          </div>
        </div>

        {/* Desktop theme toggle — top right corner */}
        <div className="hidden lg:flex absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={() => { const next = document.documentElement.classList.contains("dark") ? "light" : "dark"; setTheme(next); }}
            className="h-9 w-9 flex items-center justify-center rounded-xl transition-all hover:scale-105 relative"
            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#6366f1" }}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
        </div>

        {/* Form area — centered, max-width constrained */}
        <div className="flex-1 flex flex-col justify-center items-center relative z-10 px-4 py-8 lg:py-10">
          <div className="w-full max-w-[420px]">

            {/* Back to home */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 mb-5 transition-colors group"
              style={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontFamily: "var(--font-ibm-mono), monospace", textDecoration: "none" }}
            >
              <Home className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" style={{ color: "#6366f1" }} />
              <span className="group-hover:text-foreground transition-colors" style={{ color: "inherit" }}>Ana Sayfaya Dön</span>
            </Link>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: s === 1 ? "#6366f1" : "rgba(99,102,241,0.22)", border: "1px solid rgba(99,102,241,0.35)" }}
                  />
                  {s < 2 && <div className="w-8 h-px" style={{ background: "rgba(99,102,241,0.18)" }} />}
                </div>
              ))}
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", marginLeft: 6 }}>
                ADIM 1 / 2
              </span>
            </div>

            {/* Header */}
            <div className="mb-5">
              <span style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "#6366f1", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: "0.6rem" }}>
                ▸ YENİ HESAP
              </span>
              <h1 style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1 }}>
                Sisteme Kayıt Ol
              </h1>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.4rem" }}>
                Filo takip sistemine erişim için hesap oluşturun.{" "}
                <Link href="/login" style={{ color: "#6366f1", fontWeight: 600 }}>Giriş yapın</Link>
              </p>
            </div>

            {/* Mode Switcher */}
            <div
              className="flex mb-5 gap-1 p-1 rounded-lg"
              style={{ background: "rgba(14,14,45,0.9)", border: "1px solid rgba(99,102,241,0.1)" }}
            >
              {([
                { id: "create" as Mode, icon: Building2, label: "Şirket Kur" },
                { id: "join"   as Mode, icon: Users,     label: "Şirkete Katıl" },
              ] as const).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchMode(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all"
                  style={{
                    background: mode === id ? "rgba(99,102,241,0.14)" : "transparent",
                    border: mode === id ? "1px solid rgba(99,102,241,0.28)" : "1px solid transparent",
                    color: mode === id ? "#6366f1" : "#4a5568",
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
                    <CheckCircle2 className="h-20 w-20" style={{ color: "#6366f1" }} />
                  </motion.div>
                  <p style={{ fontFamily: "var(--font-barlow), sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "var(--foreground)", textAlign: "center" }}>
                    {mode === "create" ? "Şirket Oluşturuldu!" : "Katılım Başarılı!"}
                  </p>
                  {mode === "join" && joinedCompany && (
                    <p style={{ color: "var(--muted-foreground)", textAlign: "center" }}>
                      <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{joinedCompany}</span> şirketine katıldınız.
                    </p>
                  )}
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
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
                    <label htmlFor="reg-company" style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Şirket / Filo Adı
                    </label>
                    <Input id="reg-company" value={form.companyName} onChange={set("companyName")} placeholder="ABC Lojistik" className="h-11 pl-4 border-0" style={inputStyle} required />
                  </motion.div>
                ) : (
                  <motion.div variants={item} className="space-y-1">
                    <label htmlFor="reg-invite" style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Davet Kodu
                    </label>
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
                      Yöneticinizden aldığınız 8 haneli kodu girin.
                    </p>
                  </motion.div>
                )}

                <motion.div variants={item} className="space-y-1">
                  <label htmlFor="reg-fullname" style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Ad Soyad
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                    <Input id="reg-fullname" value={form.fullName} onChange={set("fullName")} placeholder="Ahmet Yılmaz" className="h-11 pl-9 border-0" style={inputStyle} required />
                  </div>
                </motion.div>

                <motion.div variants={item} className="space-y-1">
                  <label htmlFor="reg-email" style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    E-posta
                  </label>
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
                      autoComplete="email"
                    />
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.div variants={item} className="space-y-1">
                    <label htmlFor="reg-password" style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Şifre
                    </label>
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
                    <label htmlFor="reg-confirm" style={{ color: "var(--muted-foreground)", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Tekrar
                    </label>
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
                          style={{ background: seg <= strength.level ? "#6366f1" : "rgba(99,102,241,0.12)" }}
                        />
                      ))}
                    </div>
                    <p style={{ color: strength.level >= 3 ? "#6366f1" : "#4a5568", fontSize: "0.62rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
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
                    className="w-full h-11 relative overflow-hidden transition-all disabled:opacity-60"
                    style={{
                      background: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                      clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                      color: "#fff",
                      fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif",
                      fontWeight: 700,
                      fontSize: "0.88rem",
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

          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
