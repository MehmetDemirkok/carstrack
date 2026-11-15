"use client";

import { useState } from "react";
import { AlertCircle, Info, Mail } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RolePicker } from "./role-picker";
import { inputCls } from "./edit-member-dialog";
import type { InviteResult } from "./team-utils";

export function InviteDialog({
  open,
  onOpenChange,
  onSend,
  pendingEmails = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Daveti gönderir; hata varsa mesajıyla döner. */
  onSend: (email: string, role: UserRole) => Promise<InviteResult>;
  /** Bekleyen davetlerin e-postaları — aynı adrese yazılırsa "yeniden gönder" uyarısı. */
  pendingEmails?: string[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = email.trim().toLowerCase();
  const isPending = normalized !== "" && pendingEmails.some((e) => e.toLowerCase() === normalized);

  function change(o: boolean) {
    if (!o && submitting) return;
    if (!o) setError(null);
    onOpenChange(o);
  }

  async function submit() {
    const value = email.trim();
    if (!value) return;
    setSubmitting(true);
    setError(null);
    const result = await onSend(value, role);
    setSubmitting(false);
    if (result.ok) {
      setEmail("");
      setRole("user");
      onOpenChange(false);
    } else {
      setError(result.error ?? "Davet gönderilemedi");
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="rounded-3xl p-6 gap-5 sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader className="flex-row items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="font-bold">Ekibe Davet Et</DialogTitle>
            <DialogDescription className="text-xs">E-posta ile davet gönder</DialogDescription>
          </div>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">E-posta</label>
            <input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="calisan@sirket.com"
              className={inputCls}
              aria-invalid={!!error}
              aria-describedby={error ? "invite-error" : isPending ? "invite-pending" : undefined}
              required
            />
            {error && (
              <p id="invite-error" role="alert" className="flex gap-1.5 text-[11px] leading-snug text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" /> {error}
              </p>
            )}
            {!error && isPending && (
              <p id="invite-pending" className="flex gap-1.5 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
                Bu adrese zaten bekleyen bir davet var. Gönderirseniz davet seçtiğiniz rolle yenilenir ve 7 gün daha geçerli olur.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</p>
            <RolePicker value={role} onChange={setRole} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => change(false)} disabled={submitting}>İptal</Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-mesh hover:opacity-95 text-white border-none"
              disabled={submitting || !email.trim()}
            >
              {submitting ? "Gönderiliyor..." : isPending ? "Daveti Yenile" : "Davet Gönder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
