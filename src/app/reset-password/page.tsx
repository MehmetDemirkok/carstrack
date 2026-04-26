"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

type Status = "loading" | "ready" | "invalid" | "success";

function getPasswordStrength(pwd: string): { bars: number; label: string; color: string } {
  if (!pwd) return { bars: 0, label: "", color: "" };
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const bars = s <= 1 ? 1 : s === 2 ? 2 : s <= 3 ? 2 : s === 4 ? 3 : 4;
  const labels = ["", "Zayıf", "Orta", "İyi", "Güçlü"];
  const colors = ["", "bg-red-500", "bg-orange-400", "bg-blue-500", "bg-emerald-500"];
  const textColors = ["", "text-red-500", "text-orange-400", "text-blue-500", "text-emerald-500"];
  return { bars, label: labels[bars], color: colors[bars], textColor: textColors[bars] } as ReturnType<typeof getPasswordStrength> & { textColor: string };
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const strength = getPasswordStrength(password) as ReturnType<typeof getPasswordStrength> & { textColor?: string };

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout>;

    // PKCE flow — exchange code from query string for a session
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      void (async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setStatus(error ? "invalid" : "ready");
      })();
      return;
    }

    // Implicit / hash flow — Supabase client fires PASSWORD_RECOVERY after parsing the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        clearTimeout(timer);
        setStatus("ready");
      }
    });

    // Check immediately in case the event already fired before our listener registered
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) {
        clearTimeout(timer);
        setStatus("ready");
      }
    });

    // Fallback: no valid recovery token found within 4 s
    timer = setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "invalid" : prev));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (authError) {
      setError("Şifre güncellenemedi. Lütfen tekrar deneyin.");
      toast.error("Hata", { description: "Şifre güncellenemedi." });
      return;
    }

    toast.success("Şifre güncellendi!", { description: "Yeni şifrenizle giriş yapabilirsiniz." });
    setStatus("success");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background — identical to login page */}
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="orb w-[28rem] h-[28rem] -top-40 -right-40 bg-primary/30"
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="orb w-[24rem] h-[24rem] -bottom-32 -left-32 bg-[color:var(--primary-2)]/30"
      />
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, 25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="orb w-72 h-72 top-1/3 left-1/4 bg-[color:var(--primary-3)]/20"
      />
      <motion.div
        animate={{ y: [-12, 12, -12], rotate: [-4, 4, -4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 left-8 opacity-[0.06] pointer-events-none hidden md:block"
      >
        <Car className="h-28 w-28 text-primary" />
      </motion.div>
      <motion.div
        animate={{ y: [12, -12, 12], rotate: [4, -4, 4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-16 right-8 opacity-[0.06] pointer-events-none hidden md:block"
      >
        <Car className="h-36 w-36 text-primary" />
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-card/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-primary/15 border border-border/40 p-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3 mb-8"
          >
            <div className="relative">
              <div className="bg-mesh p-4 rounded-3xl shadow-xl shadow-primary/40">
                <Car className="h-8 w-8 text-white drop-shadow" />
              </div>
              <div className="absolute inset-0 bg-primary/40 rounded-3xl blur-2xl -z-10 animate-pulse" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-outfit font-black tracking-tight text-gradient">CarsTrack</h1>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Şifre Sıfırlama</p>
            </div>
          </motion.div>

          {/* Status-driven content */}
          <AnimatePresence mode="wait">

            {/* Verifying link */}
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <span className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Bağlantı doğrulanıyor...</p>
              </motion.div>
            )}

            {/* Expired / invalid link */}
            {status === "invalid" && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="font-semibold text-sm">Bağlantı Geçersiz veya Süresi Dolmuş</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bu şifre sıfırlama bağlantısı artık geçerli değil. Lütfen yeniden şifre sıfırlama isteği gönderin.
                </p>
                <Link
                  href="/login"
                  className="text-sm text-primary font-semibold hover:underline mt-1"
                >
                  Giriş sayfasına dön
                </Link>
              </motion.div>
            )}

            {/* Success */}
            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                >
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                </motion.div>
                <p className="font-outfit font-bold text-lg">Şifre Güncellendi!</p>
                <p className="text-xs text-muted-foreground">Yönlendiriliyorsunuz...</p>
              </motion.div>
            )}

            {/* Reset form */}
            {status === "ready" && (
              <motion.form
                key="form"
                variants={container}
                initial="hidden"
                animate="show"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* New password */}
                <motion.div variants={item} className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                  {/* Strength bars */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-1 pt-0.5"
                    >
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= strength.bars ? strength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] font-medium ${strength.textColor ?? "text-muted-foreground"}`}>
                        {strength.label}
                      </p>
                    </motion.div>
                  )}
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`rounded-xl h-11 bg-muted/40 border-border/50 pl-10 pr-11 focus:bg-background transition-colors ${
                        confirmPassword && confirmPassword !== password
                          ? "border-destructive/50"
                          : ""
                      }`}
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
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[10px] text-destructive px-1">Şifreler eşleşmiyor.</p>
                  )}
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
                    className="w-full rounded-xl h-11 font-semibold gap-2 shadow-lg shadow-primary/20 mt-2"
                    disabled={loading || password.length < 6 || password !== confirmPassword}
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        Şifreyi Güncelle
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Back to login */}
          {status === "ready" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-sm text-muted-foreground mt-6"
            >
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Giriş sayfasına dön
              </Link>
            </motion.p>
          )}
        </div>

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
      </motion.div>
    </div>
  );
}
