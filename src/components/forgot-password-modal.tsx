"use client";

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordModal({ open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleClose = (next: boolean) => {
    if (!next) {
      setEmail("");
      setError("");
      setSent(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data: { found?: boolean; sent?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        setError("İstek gönderilemedi. Lütfen tekrar deneyin.");
        return;
      }

      if (!data.found) {
        setError("No account found with this email address.");
        return;
      }

      setSent(true);
    } catch {
      setError("İstek gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Şifremi Unuttum</DialogTitle>
          <DialogDescription>
            E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-2 text-center"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-sm">Bağlantı gönderildi!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{email}</span>{" "}
                adresine şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.
              </p>
              <Button
                variant="outline"
                className="w-full rounded-xl h-10 mt-1"
                onClick={() => handleClose(false)}
              >
                Kapat
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
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
                    autoFocus
                  />
                </div>
              </div>

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

              <Button
                type="submit"
                className="w-full rounded-xl h-11 font-semibold gap-2 shadow-lg shadow-primary/20"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    Bağlantı Gönder
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
