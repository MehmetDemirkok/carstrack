"use client";

import * as React from "react";
import { NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminNoteRow, AdminNoteTarget } from "@/lib/admin/types";
import { EmptyState, Panel, PanelHeader, useAdminFetch } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

/**
 * Bir kullanıcı/şirket/araç üzerine serbest destek notu paneli.
 *
 * Notlar `admin_notes` tablosunda durur ve YALNIZCA bu panelden görünür —
 * kiracıya asla gösterilmez (tablo service-role'e kapalıdır). Hedef silinse
 * bile not kalır: FK yoktur, çünkü "neden sildik" bilgisi silinenden sonra
 * daha da değerlidir.
 */
export function AdminNotes({
  targetType,
  targetId,
  targetLabel,
}: {
  targetType: AdminNoteTarget;
  targetId: string;
  targetLabel: string;
}) {
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  const { data, loading, reload } = useAdminFetch<{ notes: AdminNoteRow[]; unavailable: boolean }>(
    `/api/admin/notes?targetType=${targetType}&targetId=${targetId}`,
    [nonce],
  );

  async function add() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, targetLabel, body: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Not eklenemedi");
      setDraft("");
      setNonce((n) => n + 1);
      toast.success("Not eklendi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Not eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/notes?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Not silinemedi");
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Not silinemedi");
    } finally {
      setBusy(false);
    }
  }

  const notes = data?.notes ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Destek notları"
        description="Yalnızca bu panelde görünür — kiracıya gösterilmez"
      />

      <div className="space-y-2 p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Telefonda konuşuldu, X özelliğini istiyor…"
          rows={3}
          className="w-full resize-y rounded-lg border border-border/60 bg-background p-2 text-sm outline-none focus:border-ring"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">
            {data?.unavailable
              ? "admin_notes tablosu yok — migration çalıştırılmalı."
              : `${notes.length} not`}
          </span>
          <Button size="sm" disabled={busy || !draft.trim()} onClick={add}>
            <NotebookPen /> Not ekle
          </Button>
        </div>
      </div>

      {loading ? null : notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Henüz not yok" />
      ) : (
        <ul className="divide-y divide-border/60 border-t border-border/60">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {n.actorEmail} · {formatDateTime(n.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                onClick={() => remove(n.id)}
                aria-label="Notu sil"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {data === null && !loading ? (
        <div className="border-t border-border/60 px-4 py-2">
          <Button variant="outline" size="sm" onClick={reload}>
            Yeniden dene
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
