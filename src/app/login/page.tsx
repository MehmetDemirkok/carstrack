"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating decorative cars */}
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
        <div className="bg-card/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border/40 p-8">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-3 mb-8"
          >
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-4 rounded-3xl border border-primary/20 shadow-lg">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-lg -z-10" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-outfit font-black tracking-tight">CarsTrack</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Filo Yönetim Sistemi</p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form
            variants={container}
            initial="hidden"
            animate="show"
            onSubmit={handleLogin}
            className="space-y-4"
          >
            {/* Email */}
            <motion.div variants={item} className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    Giriş Yap
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.form>

          {/* Register link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            Şirketiniz yoksa{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              kayıt olun
            </Link>
          </motion.p>
        </div>

        {/* Bottom glow */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
      </motion.div>
    </div>
  );
}
