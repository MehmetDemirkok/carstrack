"use client";

import * as React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Loader2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatNumber, percentChange } from "@/lib/admin/format";

/**
 * Admin konsolunun küçük ortak parçaları. Uygulamanın geri kalanındaki
 * "glass + yuvarlak" dilinden bilinçli olarak ayrışır: burası yoğun,
 * çizgisel ve veri odaklı bir kontrol paneli.
 */

// ─── Yüzey ───────────────────────────────────────────────────────────────────

export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
      <div className="min-w-0">
        <h2 className="font-heading text-sm font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Bölüm başlığı — sayfa içi ayraç. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Sayaç kartı ─────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  current,
  previous,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** current/previous verilirse otomatik trend rozeti gösterilir. */
  current?: number;
  previous?: number;
  tone?: "default" | "positive" | "warning" | "danger";
  onClick?: () => void;
}) {
  const change =
    current !== undefined && previous !== undefined ? percentChange(current, previous) : null;

  const toneRing =
    tone === "positive"
      ? "ring-emerald-500/20"
      : tone === "warning"
        ? "ring-amber-500/25"
        : tone === "danger"
          ? "ring-rose-500/25"
          : "ring-border/60";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className={cn(
        "rounded-2xl bg-card/60 p-4 text-left ring-1 backdrop-blur-sm transition-colors",
        toneRing,
        onClick && "hover:bg-card focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
          {typeof value === "number" ? formatNumber(value) : value}
        </span>
        {change !== null ? <TrendBadge change={change} /> : null}
      </div>
      {sublabel ? <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p> : null}
    </Wrapper>
  );
}

export function TrendBadge({ change }: { change: number }) {
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  const cls =
    change > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : change < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", cls)}>
      <Icon className="size-3" />
      {Math.abs(change)}%
    </span>
  );
}

// ─── Rozet ───────────────────────────────────────────────────────────────────

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── Grafik: 30 günlük alan grafiği (bağımlılıksız satır içi SVG) ────────────

export interface SeriesPoint {
  date: string;
  value: number;
}

export function AreaChart({
  series,
  height = 120,
  label,
}: {
  series: SeriesPoint[];
  height?: number;
  label?: string;
}) {
  const id = React.useId();
  const width = 600;
  const padding = 4;

  if (series.length === 0) {
    return <div className="h-[120px] rounded-xl bg-muted/30" />;
  }

  const max = Math.max(1, ...series.map((p) => p.value));
  const stepX = (width - padding * 2) / Math.max(1, series.length - 1);
  const y = (v: number) => height - padding - (v / max) * (height - padding * 2);

  const points = series.map((p, i) => [padding + i * stepX, y(p.value)] as const);
  const line = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${(padding + (series.length - 1) * stepX).toFixed(1)},${height - padding} L${padding},${height - padding} Z`;

  const peak = series.reduce((best, p) => (p.value > best.value ? p : best), series[0]);

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={label ?? "Zaman serisi grafiği"}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${id})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>{series[0]?.date.slice(5)}</span>
        <span>
          zirve {peak.value} · {peak.date.slice(5)}
        </span>
        <span>{series[series.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

/** Yatay oranlı çubuk — kırılım ve huni görselleştirmeleri için. */
export function BarRow({
  label,
  value,
  max,
  hint,
  tone = "primary",
}: {
  label: string;
  value: number;
  max: number;
  hint?: string;
  tone?: "primary" | "mint" | "amber";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const bar =
    tone === "mint" ? "bg-emerald-500/70" : tone === "amber" ? "bg-amber-500/70" : "bg-primary/70";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-foreground">{label}</span>
        <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
          {formatNumber(value)}
          {hint ? ` · ${hint}` : ` · %${pct}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Durum bileşenleri ───────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {Icon ? <Icon className="size-8 text-muted-foreground/40" /> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <AlertTriangle className="size-7 text-destructive/70" />
      <div>
        <p className="text-sm font-medium">Veri yüklenemedi</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Tekrar dene
        </Button>
      ) : null}
    </div>
  );
}

// ─── Onay diyaloğu ───────────────────────────────────────────────────────────

/**
 * Geri alınamaz işlemler için çift korumalı onay: kullanıcı, silinecek şeyin
 * adını harfi harfine yazmadan buton aktifleşmez.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Onayla",
  confirmWord,
  destructive = false,
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  /** Verilirse kullanıcı bu metni yazmadan onaylayamaz. */
  confirmWord?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = React.useState("");

  // Diyalog kapanınca yazılan onay metnini sıfırla.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setTyped("");
  }, [open]);

  const locked = Boolean(confirmWord) && typed.trim() !== confirmWord;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={destructive ? "text-destructive" : undefined}>{title}</DialogTitle>
          <DialogDescription render={<div />}>{description}</DialogDescription>
        </DialogHeader>

        {confirmWord ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Onaylamak için <span className="font-mono font-semibold text-foreground">{confirmWord}</span> yazın
            </label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmWord}
              autoComplete="off"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={locked || busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Veri getirme ────────────────────────────────────────────────────────────

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Admin uçlarından veri çeken küçük hook. Panelin tamamı istemci tarafında
 * çalışır: filtre/sıralama etkileşimi sunucuya gidip gelmeden anında tepki
 * versin diye (liste uçları zaten tek seferde tüm veriyi getiriyor).
 */
export function useAdminFetch<T>(url: string | null, deps: React.DependencyList = []): FetchState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // Dış kaynaktan (HTTP) veri çekme — kuralın kastettiği "türetilmiş state" değil.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? `Sunucu ${res.status} döndü`);
        return json as T;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}

/** Arama kutusu gibi sık değişen girdileri geciktirir. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

// ─── Filtre seçici ───────────────────────────────────────────────────────────

/** Liste sayfalarındaki kompakt açılır filtre. */
export function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 max-w-[190px] rounded-lg border border-border/60 bg-background px-2 text-sm outline-none focus:border-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
