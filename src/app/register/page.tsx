"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car, Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight,
  CheckCircle2, Hash, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

type Mode = "create" | "join";

export default function RegisterPage() {
  const [mode, setMode] = useState<Mode>("create");
  const [form, setForm] = useState({
    companyName: "",
    inviteCode: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [joinedCompany, setJoinedCompany] = useState("");
  const router = useRouter();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (mode === "create" && !form.companyName.trim()) {
      setError("Şirket adı gereklidir.");
      return;
    }
    if (mode === "join" && !form.inviteCode.trim()) {
      setError("Davet kodu gereklidir.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        companyName: form.companyName,
        inviteCode: form.inviteCode,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      }),
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

    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1400);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        animate={{ y: [-12, 12, -12], rotate: [4, -4, 4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 right-10 opacity-[0.06] pointer-events-none hidden md:block"
      >
        <Car className="h-32 w-32 text-primary" />
      </motion.div>
      <motion.div
        animate={{ y: [12, -12, 12], rotate: [-4, 4, -4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-16 left-10 opacity-[0.06] pointer-events-none hidden md:block"
      >
        <Car className="h-24 w-24 text-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-card/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border/40 p-8">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3 mb-6"
          >
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-4 rounded-3xl border border-primary/20 shadow-lg">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-lg -z-10" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-outfit font-black tracking-tight">CarsTrack</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Ücretsiz hesap oluşturun</p>
            </div>
          </motion.div>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-muted/50 rounded-2xl mb-6 gap-1">
            {([
              { id: "create" as Mode, icon: Building2, label: "Şirket Kur" },
              { id: "join" as Mode, icon: Users, label: "Şirkete Katıl" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  mode === id
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
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
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-8 flex flex-col items-center justify-center gap-3 bg-card/95 backdrop-blur-sm rounded-2xl z-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                </motion.div>
                <p className="font-outfit font-bold text-lg text-center">
                  {mode === "create" ? "Şirket Oluşturuldu!" : "Katılım Başarılı!"}
                </p>
                {mode === "join" && joinedCompany && (
                  <p className="text-sm text-muted-foreground text-center">
                    <span className="font-semibold text-foreground">{joinedCompany}</span> şirketine katıldınız.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Yönlendiriliyorsunuz...</p>
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
              className="space-y-3.5"
            >
              {/* Company name (create) */}
              {mode === "create" && (
                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Şirket Adı
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      value={form.companyName}
                      onChange={set("companyName")}
                      placeholder="SSTEK A.Ş."
                      className="rounded-xl h-11 bg-muted/40 border-border/50 pl-10 focus:bg-background transition-colors"
                      required
                    />
                  </div>
                </motion.div>
              )}

              {/* Invite code (join) */}
              {mode === "join" && (
                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Davet Kodu
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      value={form.inviteCode}
                      onChange={(e) => setForm((f) => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                      placeholder="ÖRN: A1B2C3D4"
                      className="rounded-xl h-11 bg-muted/40 border-border/50 pl-10 font-mono tracking-widest focus:bg-background transition-colors uppercase"
                      maxLength={8}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">
                    Yöneticinizden aldığınız 8 haneli kodu girin.
                  </p>
                </motion.div>
              )}

              {/* Full name */}
              <motion.div variants={item} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Adınız Soyadınız
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    value={form.fullName}
                    onChange={set("fullName")}
                    placeholder="Mehmet Demir"
                    className="rounded-xl h-11 bg-muted/40 border-border/50 pl-10 focus:bg-background transition-colors"
                    required
                  />
                </div>
              </motion.div>

              {/* Email */}
              <motion.div variants={item} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder={mode === "create" ? "yonetici@sstek.com" : "calisan@sstek.com"}
                    className="rounded-xl h-11 bg-muted/40 border-border/50 pl-10 focus:bg-background transition-colors"
                    required
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={item} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="••••••••"
                    className="rounded-xl h-11 bg-muted/40 border-border/50 pl-10 pr-11 focus:bg-background transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Confirm password */}
              <motion.div variants={item} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder="••••••••"
                    className="rounded-xl h-11 bg-muted/40 border-border/50 pl-10 pr-11 focus:bg-background transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex items-center gap-2 bg-destructive/8 border border-destructive/20 rounded-xl px-3.5 py-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <motion.div variants={item}>
                <Button
                  type="submit"
                  className="w-full rounded-xl h-11 font-semibold gap-2 shadow-lg shadow-primary/20 mt-1"
                  disabled={loading || success}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                      {mode === "create" ? "Oluşturuluyor..." : "Katılınıyor..."}
                    </>
                  ) : (
                    <>
                      {mode === "create" ? "Şirketi Kur" : "Şirkete Katıl"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </AnimatePresence>

          {/* Login link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-sm text-muted-foreground mt-5"
          >
            Hesabınız var mı?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Giriş yapın
            </Link>
          </motion.p>
        </div>

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
      </motion.div>
    </div>
  );
}
