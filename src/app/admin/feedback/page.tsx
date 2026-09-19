"use client";

import * as React from "react";
import Link from "next/link";
import { Bug, CheckCircle2, Download, Eye, Lightbulb, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import type { AdminFeedbackRow } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  LoadingRows,
  Panel,
  Pill,
  StatCard,
  useAdminFetch,
} from "@/components/admin/ui";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  bug: { label: "Hata", icon: Bug, cls: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400" },
  suggestion: {
    label: "Öneri",
    icon: Lightbulb,
    cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  },
  other: {
    label: "Genel",
    icon: MessageSquareText,
    cls: "bg-muted text-muted-foreground ring-border",
  },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: "Yeni", cls: "bg-primary/10 text-primary ring-primary/20" },
  seen: {
    label: "Görüldü",
    cls: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  },
  resolved: {
    label: "Çözüldü",
    cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  },
};

export default function AdminFeedbackPage() {
  const [status, setStatus] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [pending, setPending] = React.useState<string | null>(null);

  const url = `/api/admin/feedback?status=${status}&type=${type}&limit=200`;
  const { data, loading, error, reload } = useAdminFetch<{
    feedback: AdminFeedbackRow[];
    counts: { all: number; new: number; seen: number; resolved: number };
  }>(url);

  async function setFeedbackStatus(id: string, next: string) {
    setPending(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Güncellenemedi");
      toast.success("Durum güncellendi");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Geri Bildirim</h1>
          <p className="text-sm text-muted-foreground">
            Tüm şirketlerden gelen hata bildirimleri ve öneriler.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href="/api/admin/export?kind=feedback" />}
        >
          <Download /> CSV indir
        </Button>
      </header>

      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Toplam" value={data.counts.all} onClick={() => setStatus("all")} />
          <StatCard
            label="Yeni"
            value={data.counts.new}
            tone={data.counts.new > 0 ? "warning" : "default"}
            onClick={() => setStatus("new")}
          />
          <StatCard label="Görüldü" value={data.counts.seen} onClick={() => setStatus("seen")} />
          <StatCard
            label="Çözüldü"
            value={data.counts.resolved}
            tone="positive"
            onClick={() => setStatus("resolved")}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Tüm durumlar" },
            { value: "new", label: "Yeni" },
            { value: "seen", label: "Görüldü" },
            { value: "resolved", label: "Çözüldü" },
          ]}
        />
        <FilterSelect
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "Tüm türler" },
            { value: "bug", label: "Hata" },
            { value: "suggestion", label: "Öneri" },
            { value: "other", label: "Genel" },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingRows rows={6} />
      ) : !data || data.feedback.length === 0 ? (
        <Panel>
          <EmptyState icon={MessageSquareText} title="Geri bildirim yok" />
        </Panel>
      ) : (
        <div className="space-y-3">
          {data.feedback.map((f) => {
            const typeMeta = TYPE_META[f.type] ?? TYPE_META.other;
            const statusMeta = STATUS_META[f.status] ?? STATUS_META.new;
            const TypeIcon = typeMeta.icon;

            return (
              <Panel key={f.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Pill className={typeMeta.cls}>
                      <TypeIcon className="size-3" /> {typeMeta.label}
                    </Pill>
                    <Pill className={statusMeta.cls}>{statusMeta.label}</Pill>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatRelative(f.createdAt)} · {formatDateTime(f.createdAt)}
                  </span>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed">{f.message}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    <Link href={`/admin/users/${f.userId}`} className="hover:text-primary hover:underline">
                      {f.userName}
                    </Link>
                    {" · "}
                    <Link
                      href={`/admin/companies/${f.companyId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {f.companyName}
                    </Link>
                    {f.pageUrl ? <span className="block truncate font-mono text-[10px]">{f.pageUrl}</span> : null}
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    {f.status !== "seen" ? (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={pending === f.id}
                        onClick={() => setFeedbackStatus(f.id, "seen")}
                      >
                        <Eye /> Görüldü
                      </Button>
                    ) : null}
                    {f.status !== "resolved" ? (
                      <Button
                        size="xs"
                        disabled={pending === f.id}
                        onClick={() => setFeedbackStatus(f.id, "resolved")}
                      >
                        <CheckCircle2 /> Çözüldü
                      </Button>
                    ) : null}
                    <Button
                      size="xs"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <a href={`mailto:${f.userEmail}?subject=${encodeURIComponent("CarsTrack geri bildiriminiz hakkında")}`} />
                      }
                    >
                      Yanıtla
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
