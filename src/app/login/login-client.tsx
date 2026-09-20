"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthField,
  AuthPasswordField,
  AuthError,
  AuthSubmit,
} from "@/components/auth/auth-field";
import { ForgotPasswordModal } from "@/components/forgot-password-modal";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const router = useRouter();

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

  return (
    <AuthShell
      title="Panele giriş yapın"
      description="Filo yönetim sistemine erişmek için hesap bilgilerinizi girin."
      footer={
        <>
          Hesabınız yok mu?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Ücretsiz kayıt olun
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <AuthField
          id="login-email"
          label="E-posta"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@sirket.com"
          required
          autoComplete="email"
        />

        <AuthPasswordField
          id="login-password"
          label="Şifre"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          action={
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Şifremi unuttum
            </button>
          }
        />

        <AuthError>{error}</AuthError>

        <AuthSubmit loading={loading} loadingLabel="Giriş yapılıyor...">
          Giriş yap
          <ArrowRight className="h-4 w-4" />
        </AuthSubmit>
      </form>

      <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} />
    </AuthShell>
  );
}
