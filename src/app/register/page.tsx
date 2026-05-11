"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight,
  CheckCircle2, Hash, Users, Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };

type Mode = "create" | "join";

export default function RegisterPage() {
  const [mode, setMode] = useState<Mode>("create");
  const [form, setForm] = useState({
    companyName: "", inviteCode: "",
    fullName: "", email: "", password: "", confirmPassword: "",
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
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
    setTimeout(() => { router.push("/"); router.refresh(); }, 1400);
  };

  const inputCls = "h-12 xl:h-14 rounded-2xl bg-muted/50 border-border/60 pl-11 text-sm xl:text-base focus:bg-background transition-colors";

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">

      {/* ── LEFT — brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[40%] xl:w-[42%] 2xl:w-[44%] relative overflow-hidden bg-mesh flex-col justify-between p-10 xl:p-14">
        <motion.div animate={{ x:[0,35,0], y:[0,-25,0] }} transition={{ duration:20, repeat:Infinity, ease:"easeInOut" }}
          className="orb w-[28rem] h-[28rem] -top-40 -right-24 bg-white/10" />
        <motion.div animate={{ x:[0,-25,0], y:[0,35,0] }} transition={{ duration:26, repeat:Infinity, ease:"easeInOut" }}
          className="orb w-80 h-80 -bottom-32 -left-16 bg-white/8" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/15 backdrop-blur-sm p-3 rounded-2xl border border-white/20 shadow-lg">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-outfit font-black text-2xl text-white tracking-tight">CarsTrack</span>
            <p className="text-white/60 text-xs font-medium mt-0.5">Filo Yönetim Sistemi</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl font-outfit font-black text-white leading-tight">
              Filonuzu bugün<br />yönetmeye başlayın
            </h2>
            <p className="text-white/65 text-base xl:text-lg leading-relaxed max-w-xs">
              Ücretsiz hesap oluşturun, şirketinizi kurun ve dakikalar içinde başlayın.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { step:"1", text:"Şirket hesabını oluştur" },
              { step:"2", text:"İlk aracını ekle" },
              { step:"3", text:"Ekibini davet et" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">{step}</span>
                </div>
                <span className="text-white/80 text-sm xl:text-base font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
            <Shield className="h-3.5 w-3.5 text-white/70" />
            <span className="text-white/70 text-xs font-medium">Ücretsiz · Güvenli · Sınırsız araç</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — form panel ── */}
      <div className="flex-1 flex flex-col lg:overflow-y-auto relative">
        <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 pt-8 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-mesh p-2.5 rounded-xl shadow-md shadow-primary/30">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="font-outfit font-black text-xl text-gradient">CarsTrack</span>
          </div>
          <Link href="/login" className="text-xs text-primary font-semibold">
            Giriş yap →
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10 px-5 sm:px-8 md:px-12 lg:px-14 xl:px-20 2xl:px-28 py-6 lg:py-12">

          {/* Header */}
          <div className="mb-6 xl:mb-8">
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-outfit font-bold tracking-tight">Hesap oluşturun</h1>
            <p className="text-muted-foreground text-sm lg:text-base mt-1.5">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline underline-offset-4">
                Giriş yapın
              </Link>
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-muted/60 rounded-2xl mb-5 xl:mb-6 gap-1">
            {([
              { id: "create" as Mode, icon: Building2, label: "Şirket Kur" },
              { id: "join"   as Mode, icon: Users,     label: "Şirkete Katıl" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} type="button" onClick={() => switchMode(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 xl:py-3 rounded-xl text-sm font-semibold transition-all ${
                  mode === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm z-20">
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:300, damping:20, delay:0.1 }}>
                  <CheckCircle2 className="h-20 w-20 text-emerald-500" />
                </motion.div>
                <p className="font-outfit font-bold text-2xl text-center">
                  {mode === "create" ? "Şirket Oluşturuldu!" : "Katılım Başarılı!"}
                </p>
                {mode === "join" && joinedCompany && (
                  <p className="text-muted-foreground text-center">
                    <span className="font-semibold text-foreground">{joinedCompany}</span> şirketine katıldınız.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Yönlendiriliyorsunuz...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form key={mode} variants={container} initial="hidden" animate="show"
              exit={{ opacity:0, y:-8 }} onSubmit={handleSubmit} className="space-y-4 xl:space-y-5">

              {mode === "create" ? (
                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Şirket Adı</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input value={form.companyName} onChange={set("companyName")} placeholder="ABC Lojistik" className={inputCls} required />
                  </div>
                </motion.div>
              ) : (
                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Davet Kodu</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      value={form.inviteCode}
                      onChange={e => setForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                      placeholder="A1B2C3D4"
                      className={`${inputCls} font-mono tracking-[0.2em] uppercase`}
                      maxLength={8} required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground px-1">Yöneticinizden aldığınız 8 haneli kodu girin.</p>
                </motion.div>
              )}

              <motion.div variants={item} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Adınız Soyadınız</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input value={form.fullName} onChange={set("fullName")} placeholder="Ahmet Yılmaz" className={inputCls} required />
                </div>
              </motion.div>

              <motion.div variants={item} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input type="email" value={form.email} onChange={set("email")}
                    placeholder={mode === "create" ? "yonetici@sirket.com" : "calisan@sirket.com"}
                    className={inputCls} required autoComplete="email" />
                </div>
              </motion.div>

              {/* Password — side by side on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:gap-4">
                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Şifre</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                      placeholder="••••••••" className={`${inputCls} pr-12`} required autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Şifre Tekrar</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")}
                      placeholder="••••••••" className={`${inputCls} pr-12`} required autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              </div>

              {error && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                  className="flex items-center gap-2.5 bg-destructive/8 border border-destructive/25 rounded-2xl px-4 py-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              <motion.div variants={item}>
                <Button type="submit" size="lg"
                  className="w-full h-12 xl:h-14 rounded-2xl font-semibold gap-2 text-sm xl:text-base bg-mesh hover:opacity-90 text-white border-none shadow-lg shadow-primary/25"
                  disabled={loading || success}>
                  {loading
                    ? <><span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> {mode === "create" ? "Oluşturuluyor..." : "Katılınıyor..."}</>
                    : <>{mode === "create" ? "Şirketi Kur" : "Şirkete Katıl"} <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </motion.div>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
