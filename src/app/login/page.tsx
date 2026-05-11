"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, Eye, EyeOff, Mail, Lock, ArrowRight,
  Play, User, Shield, Activity, Bell, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ForgotPasswordModal } from "@/components/forgot-password-modal";

const features = [
  { icon: Car,      text: "Tüm araç bilgilerini tek ekranda takip edin" },
  { icon: Activity, text: "Filo sağlık skoru ve anlık durum izleme" },
  { icon: Bell,     text: "Sigorta, muayene ve bakım hatırlatmaları" },
  { icon: Users,    text: "Çok kullanıcılı ekip yönetimi" },
];

export default function LoginPage() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [demoLoading, setDemoLoading]   = useState(false);
  const [driverLoading, setDriverLoading] = useState(false);
  const [forgotOpen, setForgotOpen]     = useState(false);
  const router = useRouter();

  const anyBusy = loading || demoLoading || driverLoading;

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
    router.push("/");
    router.refresh();
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res  = await fetch("/api/demo/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error("Demo başlatılamadı"); return; }
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (authError) { toast.error("Demo girişi başarısız"); return; }
      toast.success("Yönetici demo'ya hoş geldiniz!");
      router.push("/");
      router.refresh();
    } finally { setDemoLoading(false); }
  };

  const handleDriverDemo = async () => {
    setDriverLoading(true);
    try {
      await fetch("/api/demo/setup", { method: "POST" });
      const res  = await fetch("/api/demo/driver-setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error("Şoför demo başlatılamadı"); return; }
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (authError) { toast.error("Şoför demo girişi başarısız"); return; }
      toast.success("Şoför demo'ya hoş geldiniz!");
      router.push("/tasks");
      router.refresh();
    } finally { setDriverLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">

      {/* ── LEFT — brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] 2xl:w-[50%] relative overflow-hidden bg-mesh flex-col justify-between p-10 xl:p-14 2xl:p-16">
        {/* Ambient orbs */}
        <motion.div animate={{ x:[0,40,0], y:[0,-30,0] }} transition={{ duration:18, repeat:Infinity, ease:"easeInOut" }}
          className="orb w-[34rem] h-[34rem] -top-48 -right-32 bg-white/10" />
        <motion.div animate={{ x:[0,-30,0], y:[0,40,0] }} transition={{ duration:24, repeat:Infinity, ease:"easeInOut" }}
          className="orb w-96 h-96 -bottom-40 -left-20 bg-white/8" />

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
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl xl:text-5xl 2xl:text-6xl font-outfit font-black text-white leading-tight">
              Filonuzu tam<br />kontrolde tutun
            </h2>
            <p className="text-white/65 text-base xl:text-lg leading-relaxed max-w-sm">
              Araç bakımından sigorta takibine, servis geçmişinden ekip yönetimine kadar tek platform.
            </p>
          </div>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5 text-white" style={{ width:"18px", height:"18px" }} />
                </div>
                <span className="text-white/80 text-sm xl:text-base font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
            <Shield className="h-3.5 w-3.5 text-white/70" />
            <span className="text-white/70 text-xs font-medium">Güvenli · Hızlı · Güvenilir</span>
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
          <Link href="/register" className="text-xs text-primary font-semibold">
            Kayıt ol →
          </Link>
        </div>

        {/* Form area — fills remaining height on mobile, centered on desktop */}
        <div className="flex-1 flex flex-col justify-center relative z-10 px-5 sm:px-8 md:px-12 lg:px-14 xl:px-20 2xl:px-28 py-6 lg:py-12">

          {/* Desktop header */}
          <div className="hidden lg:block mb-8 xl:mb-10">
            <h1 className="text-3xl xl:text-4xl font-outfit font-bold tracking-tight">Hesabınıza girin</h1>
            <p className="text-muted-foreground mt-2">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline underline-offset-4">
                Ücretsiz kayıt olun
              </Link>
            </p>
          </div>

          {/* Mobile header */}
          <div className="lg:hidden mb-6">
            <h1 className="text-2xl font-outfit font-bold tracking-tight">Giriş Yap</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Kayıt olun
              </Link>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 xl:space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="h-12 xl:h-14 rounded-2xl bg-muted/50 border-border/60 pl-11 text-sm xl:text-base focus:bg-background transition-colors"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Şifre</label>
                <button type="button" onClick={() => setForgotOpen(true)}
                  className="text-xs text-primary/80 hover:text-primary transition-colors font-medium" tabIndex={-1}>
                  Şifremi Unuttum?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 xl:h-14 rounded-2xl bg-muted/50 border-border/60 pl-11 pr-12 text-sm xl:text-base focus:bg-background transition-colors"
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                className="flex items-center gap-2.5 bg-destructive/8 border border-destructive/25 rounded-2xl px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <Button type="submit" size="lg"
              className="w-full h-12 xl:h-14 rounded-2xl font-semibold gap-2 text-sm xl:text-base bg-mesh hover:opacity-90 text-white border-none shadow-lg shadow-primary/25"
              disabled={anyBusy}>
              {loading
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> Giriş yapılıyor...</>
                : <>Giriş Yap <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-5 xl:my-6">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">veya dene</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Demo buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={handleDemoLogin} disabled={anyBusy}
              className="h-16 xl:h-20 rounded-2xl border border-border/70 bg-card/60 hover:bg-muted/60 backdrop-blur-sm transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 group">
              {demoLoading
                ? <span className="h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-spin" />
                : <>
                    <div className="flex items-center gap-1.5 text-foreground/80 group-hover:text-foreground transition-colors">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span className="text-sm font-bold">Yönetici</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Demo hesabı</span>
                  </>}
            </button>

            <button type="button" onClick={handleDriverDemo} disabled={anyBusy}
              className="h-16 xl:h-20 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 backdrop-blur-sm transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 group">
              {driverLoading
                ? <span className="h-5 w-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                : <>
                    <div className="flex items-center gap-1.5 text-primary/80 group-hover:text-primary transition-colors">
                      <User className="h-3.5 w-3.5" />
                      <span className="text-sm font-bold">Şoför</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Demo hesabı</span>
                  </>}
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-3">
            Kayıt gerektirmez · Gerçek demo verisi
          </p>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}
