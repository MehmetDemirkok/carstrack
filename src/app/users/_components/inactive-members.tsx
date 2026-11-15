"use client";

import { useState } from "react";
import { ChevronDown, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { setMemberActive } from "@/lib/db";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getInitials, roleBadge } from "./team-utils";

/** Şirketten çıkarılmış (pasif) üyeler — varsayılan kapalı; yönetici geri alabilir. */
export function InactiveMembers({
  members,
  canReactivate,
  onChanged,
}: {
  members: Profile[];
  canReactivate: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (members.length === 0) return null;

  async function reactivate(m: Profile) {
    setBusyId(m.id);
    try {
      await setMemberActive(m.id, true);
      toast.success(`${m.fullName} yeniden etkinleştirildi`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Üye yeniden etkinleştirilemedi");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="glass rounded-3xl border border-border/40 overflow-hidden" aria-label="Pasif üyeler">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-3xl"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Pasif Üyeler ({members.length})
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="px-4 pb-4 space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 bg-muted/30 rounded-2xl px-3 py-2.5">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0" aria-hidden>
                <span className="text-muted-foreground font-bold text-xs">{getInitials(m.fullName)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-muted-foreground">{m.fullName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {roleBadge(m.role).label}
                  {m.deactivatedAt && ` · ${new Date(m.deactivatedAt).toLocaleDateString("tr-TR")} tarihinde çıkarıldı`}
                </p>
              </div>
              {canReactivate && (
                <button
                  type="button"
                  onClick={() => reactivate(m)}
                  disabled={busyId !== null}
                  className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  {busyId === m.id ? "Açılıyor..." : "Geri Al"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
