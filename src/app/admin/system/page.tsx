"use client";

import * as React from "react";
import { CheckCircle2, HardDriveDownload, Loader2, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { AdminSystemResponse } from "@/lib/admin/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  PanelHeader,
  Pill,
  useAdminFetch,
} from "@/components/admin/ui";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

export default function AdminSystemPage() {
  const { data, loading, error, reload } = useAdminFetch<AdminSystemResponse>("/api/admin/system");
  const [running, setRunning] = React.useState<string | null>(null);
  const [confirmPath, setConfirmPath] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<{ path: string; ok: boolean; text: string } | null>(
    null,
  );

  async function runCron(path: string) {
    setRunning(path);
    try {
      const res = await fetch("/api/admin/system/cron", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Çalıştırılamadı");

      setLastResult({
        path,
        ok: json.ok,
        text: `HTTP ${json.status} · ${json.durationMs}ms · ${JSON.stringify(json.body).slice(0, 400)}`,
      });
      if (json.ok) toast.success("Cron işi çalıştı");
      else toast.error(`Cron işi ${json.status} döndü`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Çalıştırılamadı");
    } finally {
      setRunning(null);
      setConfirmPath(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingRows rows={10} />;

  const missingRequired = data.env.filter((e) => e.required && !e.present);
  const confirmJob = data.crons.find((c) => c.path === confirmPath);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Sistem</h1>
        <p className="text-sm text-muted-foreground">
          Ortam değişkenleri, zamanlanmış işler, yedekler ve tablo büyüklükleri.
        </p>
      </header>

      {missingRequired.length > 0 ? (
        <Panel className="border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            {missingRequired.length} zorunlu ortam değişkeni eksik
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {missingRequired.map((e) => e.key).join(", ")} — bu değişkenler olmadan ilgili özellikler
            sessizce çalışmaz.
          </p>
        </Panel>
      ) : null}

      {/* ── Cron işleri ── */}
      <Panel>
        <PanelHeader
          title="Zamanlanmış işler"
          description="Vercel cron'ları — buradan elle de çalıştırabilirsin"
        />
        <ul className="divide-y divide-border/60">
          {data.crons.map((job) => (
            <li key={job.path} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{job.label}</p>
                <p className="text-xs text-muted-foreground">{job.description}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                  {job.path} · {job.schedule}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={running !== null}
                onClick={() => setConfirmPath(job.path)}
              >
                {running === job.path ? <Loader2 className="animate-spin" /> : <Play />}
                Çalıştır
              </Button>
            </li>
          ))}
        </ul>
        {lastResult ? (
          <div className="border-t border-border/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {lastResult.ok ? (
                <CheckCircle2 className="size-3 text-emerald-500" />
              ) : (
                <XCircle className="size-3 text-destructive" />
              )}
              Son çalıştırma · {lastResult.path}
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted/50 p-2 text-[11px] leading-relaxed">
              {lastResult.text}
            </pre>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Ortam değişkenleri ── */}
        <Panel>
          <PanelHeader
            title="Ortam değişkenleri"
            description="Değerler gösterilmez — yalnızca tanımlı olup olmadığı"
          />
          <ul className="divide-y divide-border/60">
            {data.env.map((e) => (
              <li key={e.key} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{e.key}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{e.hint}</p>
                </div>
                {e.present ? (
                  <Pill className="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400">
                    tanımlı
                  </Pill>
                ) : (
                  <Pill
                    className={
                      e.required
                        ? "bg-destructive/10 text-destructive ring-destructive/20"
                        : "bg-muted text-muted-foreground ring-border"
                    }
                  >
                    {e.required ? "eksik" : "opsiyonel"}
                  </Pill>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── Tablo büyüklükleri ── */}
        <Panel>
          <PanelHeader title="Tablo satır sayıları" description="Veritabanı büyüklüğü" />
          <ul className="divide-y divide-border/60">
            {data.tables.map((t) => (
              <li key={t.table} className="flex items-center justify-between gap-3 px-4 py-1.5">
                <span className="truncate font-mono text-xs">{t.table}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {t.rows < 0 ? "—" : formatNumber(t.rows)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Yedekler ── */}
        <Panel>
          <PanelHeader
            title="Veritabanı yedekleri"
            description="Haftalık cron tarafından Storage'a yazılır"
          />
          {data.backups.length === 0 ? (
            <EmptyState
              icon={HardDriveDownload}
              title="Yedek bulunamadı"
              description="db-backup cron'unu yukarıdan elle çalıştırabilirsin."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.backups.map((b) => (
                <li key={b.name} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="truncate font-mono text-xs">{b.name}</span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-xs text-muted-foreground">{b.sizeLabel}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground/70">
                      {formatRelative(b.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── E-posta & erişim ── */}
        <Panel>
          <PanelHeader title="Bildirim e-postaları" description="Cron'ların gönderdiği uyarılar" />
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {formatNumber(data.emailLog.last7d)}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  son 7 gün
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {formatNumber(data.emailLog.last30d)}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  son 30 gün
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Son gönderim: {formatDateTime(data.emailLog.lastSentAt)}
            </p>

            <div className="border-t border-border/60 pt-3">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                Panele erişebilen adresler
              </p>
              <ul className="space-y-1">
                {data.adminEmails.map((email) => (
                  <li key={email} className="font-mono text-xs">
                    {email}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Değiştirmek için <span className="font-mono">ADMIN_EMAILS</span> ortam değişkenini
                güncelleyin (virgülle ayrılmış liste).
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmPath !== null}
        onOpenChange={(open) => !open && setConfirmPath(null)}
        title="Cron işini elle çalıştır"
        confirmLabel="Çalıştır"
        busy={running !== null}
        onConfirm={() => confirmPath && runCron(confirmPath)}
        description={
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{confirmJob?.label}</span> işi şimdi
              çalışacak.
            </p>
            <p className="text-xs">
              {confirmJob?.description} Bu iş gerçek e-posta/bildirim gönderebilir.
            </p>
          </div>
        }
      />
    </div>
  );
}
