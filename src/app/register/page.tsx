"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
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

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.companyName,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kayıt sırasında bir hata oluştu.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    router.push("/");
    router.refresh();
  };

  const iCls = "rounded-xl h-11 bg-muted/30 border-border/40";
  const iLabel = "text-xs font-medium text-muted-foreground";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 p-4 rounded-3xl">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-outfit font-black tracking-tight">CarsTrack</h1>
            <p className="text-sm text-muted-foreground mt-1">Yeni şirket kaydı</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <Label className={iLabel}>Şirket Adı</Label>
            <Input
              className={iCls}
              placeholder="ABC Lojistik A.Ş."
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className={iLabel}>Adınız Soyadınız</Label>
            <Input
              className={iCls}
              placeholder="Mehmet Demir"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className={iLabel}>E-posta</Label>
            <Input
              className={iCls}
              type="email"
              placeholder="yonetici@sirket.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className={iLabel}>Şifre</Label>
            <Input
              className={iCls}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className={iLabel}>Şifre Tekrar</Label>
            <Input
              className={iCls}
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading}>
            {loading ? "Kaydediliyor..." : "Şirketi Kaydet"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Hesabınız var mı?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
