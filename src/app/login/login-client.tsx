"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, Eye, EyeOff, ArrowRight,
  MapPin, Fuel, Signal, Shield,
  Wrench, BarChart3, Users, Bell, Sun, Moon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo-mark";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { ForgotPasswordModal } from "@/components/forgot-password-modal";

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

const features = [
  {
    icon: Car,
    title: "Araç Takibi",
    desc: "Tüm araçlarınız tek ekranda — model, km, yakıt ve daha fazlası.",
  },
  {
    icon: Wrench,
    title: "Bakım Yönetimi",
    desc: "Periyodik bakım zamanlarını asla kaçırmayın, otomatik hatırlatmalar.",
  },
  {
    icon: Shield,
    title: "Sigorta & Muayene",
    desc: "Vade dolmadan önce uyarı alın, belgeleri dijital ortamda saklayın.",
  },
  {
    icon: BarChart3,
    title: "Filo Analitiği",
    desc: "Maliyet raporları, filo sağlık skoru ve trend analizleri.",
  },
  {
    icon: Users,
    title: "Ekip Yönetimi",
    desc: "Şirket yetkilisi ve sürücü rolleri, görev atama ve koordinasyon.",
  },
  {
    icon: Bell,
    title: "Akıllı Bildirimler",
    desc: "Kritik uyarılar anında telefonunuza, hiçbir şeyi kaçırmayın.",
  },
];

export default function LoginClient() {
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [showPass, setShowPass]             = useState(false);
  const [error, setError]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [forgotOpen, setForgotOpen]         = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  const anyBusy = loading;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("E-posta veya şifre hatalı.");
      toast.error("Giriş başarısız");
      setLoading(false);
      return;
    }
    toast.success("Giriş başarılı");
    router.push("/dashboard");
    router.refresh();
  };

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

  return (
    <div className="auth-page min-h-[100dvh] w-full flex-1 flex flex-col lg:flex-row overflow-x-hidden bg-background">

      {/* ── LEFT — Vehicle illustration panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-[36%] xl:w-[38%] relative overflow-hidden flex-col justify-between"
        style={{ background: "linear-gradient(160deg, #161a2e 0%, #0f131d 60%, #0a0e18 100%)" }}
      >
        {/* Hex grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0 L60 17.3 L60 34.7 L30 52 L0 34.7 L0 17.3Z' fill='none' stroke='rgba(208,188,255,0.05)' stroke-width='0.8'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 52px",
          }}
        />
        <motion.div className="absolute inset-0 pointer-events-none"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            background: "linear-gradient(135deg, rgba(208,188,255,0.04) 0%, transparent 50%, rgba(10,14,24,0.8) 100%)",
            backgroundSize: "200% 200%",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-8 xl:p-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <LogoMark size={42} className="shrink-0" />
            <div>
              <span style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif", color: "#e8eaf0", fontWeight: 800, fontSize: "1.15rem" }}>
                Cars<span style={{ background: "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>Track</span>
              </span>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem", fontFamily: "var(--font-ibm-mono), monospace", marginTop: 2 }}>
                Filo Yönetim Sistemi
              </p>
            </div>
          </Link>

          {/* Center: vehicle illustration */}
          <div className="flex flex-col items-center justify-center flex-1 py-6">
            <div className="relative flex items-center justify-center" style={{ width: 230, height: 230 }}>
              {[1, 2, 3].map((i) => (
                <motion.div key={i} className="absolute rounded-full"
                  style={{ width: 70 + i * 50, height: 70 + i * 50, border: `1px solid rgba(208,188,255,${0.35 - i * 0.08})` }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.3, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                />
              ))}
              <div className="relative z-10" style={{ width: 100, height: 100 }}>
                <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} role="img" aria-label="Araç İllüstrasyonu">
                  <rect x="18" y="30" width="64" height="100" rx="14" fill="#1c1f2a" stroke="rgba(208,188,255,0.5)" strokeWidth="1.5"/>
                  <rect x="26" y="48" width="48" height="60" rx="8" fill="#0f131d" stroke="rgba(208,188,255,0.3)" strokeWidth="1"/>
                  <rect x="29" y="50" width="42" height="22" rx="5" fill="rgba(208,188,255,0.12)" stroke="rgba(208,188,255,0.4)" strokeWidth="0.8"/>
                  <rect x="29" y="88" width="42" height="16" rx="5" fill="rgba(208,188,255,0.08)" stroke="rgba(208,188,255,0.3)" strokeWidth="0.8"/>
                  <rect x="20" y="30" width="14" height="8" rx="3" fill="rgba(208,188,255,0.7)"/>
                  <rect x="66" y="30" width="14" height="8" rx="3" fill="rgba(208,188,255,0.7)"/>
                  <rect x="20" y="122" width="14" height="8" rx="3" fill="rgba(76,215,246,0.6)"/>
                  <rect x="66" y="122" width="14" height="8" rx="3" fill="rgba(76,215,246,0.6)"/>
                  <rect x="6" y="38" width="14" height="28" rx="5" fill="#1c1f2a" stroke="rgba(208,188,255,0.4)" strokeWidth="1"/>
                  <rect x="80" y="38" width="14" height="28" rx="5" fill="#1c1f2a" stroke="rgba(208,188,255,0.4)" strokeWidth="1"/>
                  <rect x="6" y="94" width="14" height="28" rx="5" fill="#1c1f2a" stroke="rgba(208,188,255,0.4)" strokeWidth="1"/>
                  <rect x="80" y="94" width="14" height="28" rx="5" fill="#1c1f2a" stroke="rgba(208,188,255,0.4)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="50" y2="106" stroke="rgba(208,188,255,0.15)" strokeWidth="1" strokeDasharray="4 3"/>
                </svg>
              </div>
              {floatingIcons.map(({ icon: Icon, delay }, idx) => {
                const angles = [315, 45, 135, 225];
                const rad = (angles[idx] * Math.PI) / 180;
                const r = 105;
                return (
                  <motion.div key={idx} className="absolute flex items-center justify-center rounded-lg"
                    style={{
                      left: "50%", top: "50%",
                      marginLeft: Math.cos(rad) * r - 14,
                      marginTop: Math.sin(rad) * r - 14,
                      width: 28, height: 28,
                      background: "rgba(208,188,255,0.1)",
                      border: "1px solid rgba(208,188,255,0.25)",
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay, ease: "easeInOut" }}>
                    <Icon style={{ color: "#d0bcff", width: 12, height: 12 }} />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <div className="flex gap-2">
              {statCards.map(({ value, label, sub }, i) => (
                <motion.div key={label} className="flex-1 rounded-xl p-2.5"
                  style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderTop: "1px solid rgba(255,255,255,0.2)", borderLeft: "1px solid rgba(255,255,255,0.2)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}>
                  <div style={{ fontFamily: "var(--font-ibm-mono), monospace", color: "#d0bcff", fontSize: "0.95rem", fontWeight: 600 }}>{value}</div>
                  <div style={{ color: "#e8eaf0", fontSize: "0.6rem", fontFamily: "var(--font-barlow), sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.58rem" }}>{sub}</div>
                </motion.div>
              ))}
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", fontStyle: "italic", textAlign: "center" }}>
              Filosunu gerçek zamanlı takip et.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT — form + features ── */}
      <motion.div
        className="flex-1 flex flex-col lg:overflow-y-auto relative bg-background"
        initial={{ x: 50, opacity: 0 }}
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
            <Link href="/register" style={{ color: "#d0bcff", fontSize: "0.75rem", fontWeight: 600 }}>
              Kayıt ol →
            </Link>
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

        {/* Main content — 2 columns on desktop */}
        <div className="flex-1 flex flex-col justify-center items-center relative z-10 px-4 py-8 lg:py-10">
          <div className="w-full max-w-5xl flex flex-col lg:flex-row lg:gap-0 lg:items-start lg:justify-center">

            {/* ── FORM COLUMN ── */}
            <div className="w-full lg:w-[400px] lg:shrink-0">
              {/* Breadcrumb */}
              <div className="mb-6">
                <span style={{
                  fontFamily: "var(--font-ibm-mono), monospace", color: "#d0bcff",
                  fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase",
                  display: "block", marginBottom: "0.75rem",
                }}>
                  ▸ SİSTEM GİRİŞİ
                </span>
                <h1 style={{
                  fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif",
                  fontSize: "2.4rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1,
                }}>
                  Panele Giriş
                </h1>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginTop: "0.4rem" }}>
                  Filo yönetim sistemine erişmek için kimlik bilgilerinizi girin.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    E-posta
                  </label>
                  <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@sirket.com" className="h-11 pl-4 border-0" style={inputStyle}
                    required autoComplete="email" />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", fontFamily: "var(--font-ibm-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Şifre
                    </label>
                    <button type="button" onClick={() => setForgotOpen(true)} tabIndex={-1}
                      style={{ color: "rgba(208,188,255,0.7)", fontSize: "0.68rem", fontFamily: "var(--font-ibm-mono), monospace", background: "none", border: "none", cursor: "pointer" }}>
                      Şifremi Unuttum?
                    </button>
                  </div>
                  <div className="relative">
                    <Input id="login-password" type={showPass ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      className="h-11 pl-4 pr-11 border-0" style={inputStyle} required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2.5 px-4 py-3"
                    style={{ background: "rgba(220,38,38,0.08)", borderLeft: "2px solid rgba(220,38,38,0.6)", borderRadius: "0 6px 6px 0" }}>
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#dc2626" }} />
                    <p style={{ color: "#f87171", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.75rem" }}>{error}</p>
                  </motion.div>
                )}

                {/* Submit */}
                <button type="submit" disabled={anyBusy} className="w-full h-11 relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 rounded-xl"
                  style={{
                    background: "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)",
                    boxShadow: "0 0 24px rgba(109,59,215,0.55)",
                    color: "#23005c", fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif",
                    fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.12em",
                    border: "none", cursor: anyBusy ? "not-allowed" : "pointer",
                  }}>
                  {loading
                    ? <span style={{ animation: "blink 1s step-start infinite" }}>BAĞLANIYOR...</span>
                    : <span className="flex items-center justify-center gap-2">SİSTEM GİRİŞİ <ArrowRight className="h-4 w-4" /></span>
                  }
                </button>
              </form>

              <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", textAlign: "center", marginTop: "1.25rem" }}>
                Hesabınız yok mu?{" "}
                <Link href="/register" style={{ color: "#d0bcff", fontWeight: 600 }}>Kayıt İsteği Oluştur</Link>
              </p>
            </div>

            {/* ── FEATURES COLUMN — desktop only ── */}
            <motion.div
              className="hidden lg:flex flex-col justify-center pl-10 xl:pl-14 ml-10 xl:ml-14"
              style={{ borderLeft: "1px solid rgba(208,188,255,0.1)", flex: 1, minWidth: 0 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Heading */}
              <div className="mb-8">
                <span style={{
                  fontFamily: "var(--font-ibm-mono), monospace", color: "#d0bcff",
                  fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase",
                  display: "block", marginBottom: "0.6rem",
                }}>
                  ▸ NEDEN CARSTRACK?
                </span>
                <h2 style={{
                  fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif",
                  fontSize: "1.9rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.15,
                }}>
                  Filo yönetiminin<br />
                  <span style={{ color: "#d0bcff" }}>akıllı</span> yolu
                </h2>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginTop: "0.6rem", lineHeight: 1.6, maxWidth: 320 }}>
                  Araç bakımından sigorta takibine, servis geçmişinden ekip koordinasyonuna kadar tek platform.
                </p>
              </div>

              {/* Feature grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {features.map(({ icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    className="flex gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(208,188,255,0.04)",
                      border: "1px solid rgba(208,188,255,0.1)",
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  >
                    <div
                      className="shrink-0 flex items-center justify-center rounded-lg mt-0.5"
                      style={{
                        width: 32, height: 32,
                        background: "rgba(208,188,255,0.1)",
                        border: "1px solid rgba(208,188,255,0.2)",
                      }}
                    >
                      <Icon style={{ color: "#d0bcff", width: 15, height: 15 }} />
                    </div>
                    <div className="min-w-0">
                      <h3 style={{
                        color: "var(--foreground)", fontWeight: 700, fontSize: "0.78rem",
                        fontFamily: "var(--font-barlow), sans-serif", letterSpacing: "0.02em",
                      }}>
                        {title}
                      </h3>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", lineHeight: 1.4, marginTop: 2 }}>
                        {desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom trust badge */}
              <div className="mt-6 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["A", "B", "C"].map((l) => (
                    <div key={l} className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ring-2"
                      style={{ background: "rgba(208,188,255,0.15)", color: "#d0bcff" }}>
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ color: "var(--foreground)", fontSize: "0.72rem", fontWeight: 600 }}>
                    500+ şirket güveniyor
                  </p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", fontFamily: "var(--font-ibm-mono), monospace" }}>
                    Türkiye genelinde aktif kullanım
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}
