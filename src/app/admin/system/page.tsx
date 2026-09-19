"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, HardDriveDownload, Loader2, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { AdminStorageResponse, AdminSystemResponse, AppBanner, CronHealth } from "@/lib/admin/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterSelect,
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
  // Tanımlı olanları listelemenin bilgi değeri yok — yalnızca eksikler gösterilir.
  const missingEnv = data.env.filter((e) => !e.present);
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

      {/* ── Global duyuru bandı ── */}
      <BannerPanel />

      {/* ── Depolama ── */}
      <StoragePanel />

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
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {job.label}
                  <CronStatusDot health={job.health} />
                </p>
                <p className="text-xs text-muted-foreground">{job.description}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                  {job.path} · {job.schedule}
                </p>
                <CronHealthLine health={job.health} />
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
            description="Yalnızca eksik olanlar listelenir — tanımlı olanlar sessizdir"
          />
          {missingEnv.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Hepsi tanımlı"
              description={`${data.env.length} değişkenin tamamı yerinde.`}
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {missingEnv.map((e) => (
                <li key={e.key} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{e.key}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.hint}</p>
                  </div>
                  <Pill
                    className={
                      e.required
                        ? "bg-destructive/10 text-destructive ring-destructive/20"
                        : "bg-muted text-muted-foreground ring-border"
                    }
                  >
                    {e.required ? "eksik" : "opsiyonel"}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── Tablo büyüklükleri ── */}
        <Panel>
          <PanelHeader title="Tablolar" description="Satır sayısı ve son 7 gündeki artış" />
          <ul className="divide-y divide-border/60">
            {data.tables.map((t) => (
              <li key={t.table} className="flex items-center justify-between gap-3 px-4 py-1.5">
                <span className="truncate font-mono text-xs">{t.table}</span>
                <span className="flex shrink-0 items-baseline gap-2 font-mono text-xs tabular-nums">
                  <span
                    className={
                      t.last7d ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"
                    }
                  >
                    {t.last7d === null ? "" : `+${formatNumber(t.last7d)}`}
                  </span>
                  <span className="text-muted-foreground">
                    {t.rows < 0 ? "—" : formatNumber(t.rows)}
                  </span>
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

/**
 * İşin son durumu tek bakışta: yeşil = son çalışma başarılı, kırmızı = hata,
 * gri = son 7 günde hiç çalışmamış (kayıt yoksa migration da uygulanmamış olabilir).
 */
function CronStatusDot({ health }: { health: CronHealth }) {
  const tone =
    health.lastStatus === "ok"
      ? "bg-emerald-500"
      : health.lastStatus === "error"
        ? "bg-destructive"
        : "bg-muted-foreground/30";
  const title =
    health.lastStatus === null
      ? "Son 7 günde kayıtlı çalışma yok"
      : health.lastStatus === "ok"
        ? "Son çalışma başarılı"
        : "Son çalışma hata verdi";
  return <span className={`size-1.5 shrink-0 rounded-full ${tone}`} title={title} />;
}

/** Son çalışma zamanı, süresi ve 7 günlük hata sayısı. */
function CronHealthLine({ health }: { health: CronHealth }) {
  if (!health.lastRunAt) {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        Son 7 günde kayıtlı çalışma yok
      </p>
    );
  }
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">
      {formatRelative(health.lastRunAt)}
      {health.lastDurationMs !== null ? ` · ${(health.lastDurationMs / 1000).toFixed(1)} sn` : ""}
      {" · "}
      <span className={health.errors7d > 0 ? "text-destructive" : undefined}>
        7 günde {health.runs7d} çalışma
        {health.errors7d > 0 ? `, ${health.errors7d} hata` : ""}
      </span>
      {health.lastError ? (
        <span className="block truncate font-mono text-[10px] text-destructive">
          {health.lastError}
        </span>
      ) : null}
    </p>
  );
}

/**
 * Tüm kiracılara gösterilen duyuru/bakım bandı.
 *
 * Kesinti anonsu için e-posta göndermekten çok daha hızlı: kaydedildiği anda
 * herkesin bir sonraki sayfa yüklemesinde görünür.
 */
function BannerPanel() {
  const { data, loading, reload } = useAdminFetch<{ banner: AppBanner; unavailable: boolean }>(
    "/api/admin/settings",
  );

  const [enabled, setEnabled] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [severity, setSeverity] = React.useState<AppBanner["severity"]>("info");
  const [saving, setSaving] = React.useState(false);

  // Sunucudan gelen ayarı forma aktar — dış veri senkronizasyonu.
  React.useEffect(() => {
    if (!data?.banner) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(data.banner.enabled);
    setMessage(data.banner.message);
    setSeverity(data.banner.severity);
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled, message, severity }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Kaydedilemedi");
      toast.success(enabled ? "Bant yayında" : "Bant kapatıldı");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Uygulama bandı"
        description="Tüm kiracıların üst kısmında görünen global duyuru"
      />
      <div className="space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-border/60"
          />
          Bant açık
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Cumartesi 02:00-04:00 arası bakım yapılacaktır."
          className="w-full resize-y rounded-lg border border-border/60 bg-background p-2 text-sm outline-none focus:border-ring"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterSelect
            value={severity}
            onChange={(v) => setSeverity(v as AppBanner["severity"])}
            options={[
              { value: "info", label: "Bilgi" },
              { value: "warning", label: "Uyarı" },
              { value: "critical", label: "Kritik" },
            ]}
          />
          <Button size="sm" disabled={saving || loading} onClick={save}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Kaydet
          </Button>
        </div>

        {data?.unavailable ? (
          <p className="text-[11px] text-destructive">
            app_settings tablosu yok — 20260919_admin_panel_v2.sql migration&apos;ını çalıştır.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

/**
 * Depolama baskısı.
 *
 * Araç fotoğrafları storage'a taşındı ama taşıma geriye dönük uyumlu: eski
 * satırlar hâlâ base64 data-URI taşıyor olabilir ve db-backup'ı yavaşlatan şey
 * bu kalıntı. Buradaki liste onu görünür kılar — ilgili aracı açıp kaydetmek
 * fotoğrafı kendiliğinden storage'a taşır.
 */
function StoragePanel() {
  const { data, loading } = useAdminFetch<AdminStorageResponse>("/api/admin/storage");

  if (loading || !data) return null;

  const { photos } = data;

  return (
    <Panel>
      <PanelHeader
        title="Depolama"
        description="Satır içi kalan fotoğraflar ve bucket kullanımı"
      />

      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        <MiniStat label="Toplam araç" value={formatNumber(photos.totalVehicles)} />
        <MiniStat
          label="Satır içi fotoğraflı"
          value={formatNumber(photos.inlineVehicles)}
          tone={photos.inlineVehicles > 0 ? "warning" : "default"}
        />
        <MiniStat label="Satır içi boyut" value={formatStorageBytes(photos.inlineBytes)} />
        <MiniStat label="Storage'a taşınmış" value={formatNumber(photos.storedPhotos)} />
      </div>

      {data.unavailable ? (
        <p className="px-4 pb-3 text-[11px] text-destructive">
          Ağırlık view&apos;ları yok — 20260919_admin_panel_v2.sql migration&apos;ını çalıştır.
        </p>
      ) : null}

      <div className="grid gap-0 border-t border-border/60 lg:grid-cols-2">
        <div className="lg:border-r lg:border-border/60">
          <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            En ağır araçlar
          </p>
          {data.heaviestVehicles.length === 0 ? (
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              Satır içi fotoğraf kalmamış 🎉
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.heaviestVehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-1.5">
                  <Link
                    href={`/admin/vehicles/${v.id}`}
                    className="truncate font-mono text-xs hover:underline"
                  >
                    {v.plate}
                    <span className="ml-1.5 font-sans text-muted-foreground">{v.companyName}</span>
                  </Link>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatStorageBytes(v.inlineBytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Bucket kullanımı
          </p>
          <ul className="divide-y divide-border/60">
            {data.buckets.map((b) => (
              <li key={b.name} className="flex items-center justify-between gap-3 px-4 py-1.5">
                <span className="truncate font-mono text-xs">{b.name}</span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                    {b.error ? "—" : formatStorageBytes(b.bytes)}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground/70">
                    {b.error ? b.error.slice(0, 40) : `${formatNumber(b.fileCount)} dosya`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-xl bg-card/60 p-3 ring-1 ring-border/60">
      <p
        className={`font-heading text-lg font-semibold tabular-nums ${
          tone === "warning" ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
