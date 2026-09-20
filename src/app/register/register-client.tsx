"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Building2, Users, User, Mail, Lock,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthField,
  AuthPasswordField,
  AuthError,
  AuthSubmit,
} from "@/components/auth/auth-field";
import { cn } from "@/lib/utils";

type Mode = "create" | "join" | "invite";

const ROLE_LABELS: Record<string, string> = {
  manager: "Şirket Yetkilisi",
  operator: "Operatör",
  user: "Kullanıcı",
};

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [joinedCompany, setJoinedCompany] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: activeUser } = useAuth();
  const reduce = useReducedMotion();

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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

  return (
    <AuthShell
      title={mode === "invite" ? "Davetinizi tamamlayın" : "Ücretsiz hesap oluşturun"}
      description={
        mode === "invite"
          ? "Bilgilerinizi girin, şirketin filosuna hemen katılın."
          : "Dakikalar içinde ilk aracınızı ekleyin. Kredi kartı gerekmez."
      }
      footer={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      <div className="relative">
        {/* ── Başarı katmanı ── */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 -m-2 flex flex-col items-center justify-center gap-4 rounded-2xl bg-card/95 p-6 text-center backdrop-blur-sm"
            >
              <motion.div
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2 className="h-16 w-16 text-mint-strong" />
              </motion.div>
              <p className="font-outfit text-xl font-black">
                {mode === "create" ? "Şirket oluşturuldu!" : "Katılım başarılı!"}
              </p>
              {(mode === "join" || mode === "invite") && joinedCompany && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{joinedCompany}</span>{" "}
                  şirketine katıldınız.
                </p>
              )}
              <p className="text-xs text-muted-foreground">Yönlendiriliyorsunuz...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Şirket kur / şirkete katıl ── */}
        {mode !== "invite" && (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
            {([
              { id: "create" as const, label: "Şirket kur", icon: Building2 },
              { id: "join" as const, label: "Şirkete katıl", icon: Users },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                aria-pressed={mode === id}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  mode === id
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Davet durumu ── */}
        {inviteToken && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            {inviteChecking ? (
              <p className="text-muted-foreground">Davet doğrulanıyor...</p>
            ) : inviteError ? (
              <p className="text-destructive">{inviteError}</p>
            ) : inviteInfo ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{inviteInfo.companyName}</span>{" "}
                  şirketine{" "}
                  <span className="font-semibold text-foreground">
                    {ROLE_LABELS[inviteInfo.role] ?? inviteInfo.role}
                  </span>{" "}
                  rolüyle katılıyorsunuz.
                </p>
                {activeUser && activeUser.email?.toLowerCase() !== form.email.toLowerCase() && (
                  <p className="text-xs text-muted-foreground">
                    Bu cihazda <b className="text-foreground">{activeUser.email}</b> hesabıyla
                    oturum açık. Kaydı tamamladığınızda o hesaptan çıkış yapılıp bu yeni hesaba
                    geçilecek.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "create" && (
            <AuthField
              id="reg-company"
              label="Şirket / filo adı"
              icon={Building2}
              value={form.companyName}
              onChange={set("companyName")}
              placeholder="ABC Lojistik"
              required
            />
          )}

          {mode === "join" && (
            <AuthField
              id="reg-invite"
              label="Davet kodu"
              value={form.inviteCode}
              onChange={(e) =>
                setForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))
              }
              placeholder="A1B2C3D4"
              inputClassName="font-mono uppercase tracking-[0.2em]"
              maxLength={8}
              required
              hint="Şirket yetkilisinden aldığınız 8 haneli kodu girin."
            />
          )}

          <AuthField
            id="reg-fullname"
            label="Ad soyad"
            icon={User}
            value={form.fullName}
            onChange={set("fullName")}
            placeholder="Ahmet Yılmaz"
            required
          />

          <AuthField
            id="reg-email"
            label="E-posta"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder={mode === "create" ? "yonetici@sirket.com" : "calisan@sirket.com"}
            required
            readOnly={mode === "invite"}
            autoComplete="email"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthPasswordField
              id="reg-password"
              label="Şifre"
              icon={Lock}
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <AuthPasswordField
              id="reg-confirm"
              label="Şifre tekrar"
              icon={Lock}
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          {form.password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      seg <= strength.level ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p
                className={cn(
                  "text-xs",
                  strength.level >= 3 ? "text-mint-strong" : "text-muted-foreground"
                )}
              >
                {strength.label}
              </p>
            </div>
          )}

          <AuthError>{error}</AuthError>

          <AuthSubmit
            loading={loading}
            loadingLabel="Hesap oluşturuluyor..."
            disabled={success}
          >
            Hesap oluştur
            <ArrowRight className="h-4 w-4" />
          </AuthSubmit>
        </form>
      </div>
    </AuthShell>
  );
}
