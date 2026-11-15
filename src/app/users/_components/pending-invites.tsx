"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { inviteExpiryLabel, roleBadge, type InviteResult, type PendingInvite } from "./team-utils";

export function PendingInvites({
  invites,
  onResend,
  onRevoke,
}: {
  invites: PendingInvite[];
  onResend: (email: string, role: UserRole) => Promise<InviteResult>;
  onRevoke: (id: string) => Promise<void>;
}) {
  // Davet başına meşgul durumu — bir davet işlenirken diğerleri ve
  // "Davet Et" penceresi kilitlenmez.
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  }

  if (invites.length === 0) return null;

  return (
    <section className="glass rounded-3xl p-4 border border-border/40 space-y-3" aria-label="Bekleyen davetler">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Bekleyen Davetler ({invites.length})
      </p>
      <ul className="space-y-2">
        {invites.map((invite) => {
          const expiry = inviteExpiryLabel(invite.expires_at);
          const busy = busyId === invite.id;
          return (
            <li key={invite.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-2xl px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  {roleBadge(invite.role).label}
                  {" · "}
                  <span className={cn(expiry.urgent && "text-amber-600 dark:text-amber-400")}>{expiry.label}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => run(invite.id, () => onResend(invite.email, invite.role))}
                        disabled={busy}
                        aria-label={`${invite.email} davetini yeniden gönder`}
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      />
                    }
                  >
                    <Send className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Daveti Yeniden Gönder</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => run(invite.id, () => onRevoke(invite.id))}
                        disabled={busy}
                        aria-label={`${invite.email} davetini iptal et`}
                        className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      />
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>Daveti İptal Et</TooltipContent>
                </Tooltip>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
