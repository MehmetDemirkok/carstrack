"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RELEASES, APP_VERSION, CHANGE_TYPE_LABELS, type ChangeType } from "@/lib/app-version";

const TYPE_STYLES: Record<ChangeType, string> = {
  yeni: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  iyilestirme: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  duzeltme: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  guvenlik: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

/** Sürüm notları — kaynak: src/data/changelog.json. En yeni sürüm açık başlar. */
export function ReleaseNotesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [expanded, setExpanded] = useState<string | null>(RELEASES[0]?.version ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-outfit flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Sürüm Notları
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1 space-y-2">
          {RELEASES.map((release) => {
            const isOpen = expanded === release.version;
            const isCurrent = release.version === APP_VERSION;
            return (
              <div key={release.version} className="rounded-2xl border border-border/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : release.version)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">v{release.version}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                          Kullandığınız sürüm
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{release.title}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(release.date)}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <ul className="px-4 pb-3 space-y-1.5">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                        <span className={`shrink-0 mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${TYPE_STYLES[change.type]}`}>
                          {CHANGE_TYPE_LABELS[change.type]}
                        </span>
                        <span className="text-foreground/90">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="w-full rounded-xl" />}>Kapat</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
