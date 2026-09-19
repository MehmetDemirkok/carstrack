"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Car,
  ClipboardList,
  Fuel,
  Inbox,
  MessageSquareText,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { AdminOverviewResponse } from "@/lib/admin/types";
import {
  AreaChart,
  BarRow,
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  PanelHeader,
  Pill,
  SectionLabel,
  StatCard,
  useAdminFetch,
} from "@/components/admin/ui";
import {
  formatDate,
  formatNumber,
  formatRelative,
  ROLE_CLASSES,
  ROLE_LABELS,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

type SeriesKey = "users" | "companies" | "vehicles";

const SERIES_OPTIONS: { key: SeriesKey; label: string }[] = [
  { key: "users", label: "Kullanıcı" },
  { key: "companies", label: "Şirket" },
  { key: "vehicles", label: "Araç" },
];

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug: "Hata",
  suggestion: "Öneri",
  other: "Genel",
};

export default function AdminOverviewPage() {
  const { data, loading, error, reload } = useAdminFetch<AdminOverviewResponse>("/api/admin/overview");
  const [seriesKey, setSeriesKey] = React.useState<SeriesKey>("users");

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingRows rows={10} />;

  const { totals, activity7d, growth, engagement, series, funnel, cohorts, attention } = data;
  const chartSeries = series.map((p) => ({ date: p.date, value: p[seriesKey] }));
  const funnelMax = funnel[0]?.count ?? 1;
  const roleMax = Math.max(1, ...data.roleBreakdown.map((r) => r.count));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-muted-foreground">
            Tüm şirketler ve kullanıcılar tek ekranda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href="/api/admin/export?kind=users" />}
          >
            Kullanıcı CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href="/api/admin/export?kind=companies" />}
          >
            Şirket CSV
          </Button>
        </div>
      </header>

      {/* ── Ana sayaçlar ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Şirket"
          value={totals.companies}
          icon={Building2}
          current={growth.companies30d}
          previous={growth.companiesPrev30d}
          sublabel={`son 30 günde +${growth.companies30d}`}
        />
        <StatCard
          label="Kullanıcı"
          value={totals.users}
          icon={Users}
          current={growth.users30d}
          previous={growth.usersPrev30d}
          sublabel={`son 30 günde +${growth.users30d}`}
        />
        <StatCard
          label="Araç"
          value={totals.vehicles}
          icon={Car}
          sublabel={`son 30 günde +${growth.vehicles30d}`}
        />
        <StatCard
          label="Bugün aktif"
          value={engagement.activeToday}
          icon={TrendingUp}
          tone={engagement.activeToday > 0 ? "positive" : "default"}
          sublabel={`7 gün: ${engagement.active7d} · 30 gün: ${engagement.active30d}`}
        />
      </div>

      {/* ── Son 7 günde üretilen içerik ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Servis kaydı" value={activity7d.serviceRecords} icon={Wrench} sublabel="son 7 gün" />
        <StatCard label="Görev" value={activity7d.tasks} icon={ClipboardList} sublabel="son 7 gün" />
        <StatCard label="Yakıt kaydı" value={activity7d.fuelRecords} icon={Fuel} sublabel="son 7 gün" />
        <StatCard
          label="Açık geri bildirim"
          value={attention.openFeedback}
          icon={MessageSquareText}
          tone={attention.openFeedback > 0 ? "warning" : "default"}
          onClick={undefined}
        />
      </div>

      {/* ── Büyüme grafiği ── */}
      <Panel>
        <PanelHeader
          title="Son 30 gün"
          description="Günlük yeni kayıtlar"
          action={
            <div className="flex gap-1 rounded-lg bg-muted/60 p-0.5">
              {SERIES_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSeriesKey(opt.key)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    seriesKey === opt.key
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="p-4">
          <AreaChart series={chartSeries} label={`Son 30 gün ${seriesKey}`} />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border/60 pt-3 text-center">
            <Metric label="Bugün" value={seriesKey === "users" ? growth.usersToday : seriesKey === "companies" ? growth.companiesToday : chartSeries[chartSeries.length - 1]?.value ?? 0} />
            <Metric label="7 gün" value={seriesKey === "users" ? growth.users7d : seriesKey === "companies" ? growth.companies7d : growth.vehicles7d} />
            <Metric label="30 gün" value={seriesKey === "users" ? growth.users30d : seriesKey === "companies" ? growth.companies30d : growth.vehicles30d} />
          </div>
        </div>
      </Panel>

      {/* ── Kohort / tutundurma ── */}
      <Panel>
        <PanelHeader
          title="Haftalık kohortlar"
          description="Kaydolan şirketlerin kaçı araç ekledi ve kaçı bir hafta sonra geri döndü"
        />
        {cohorts.length === 0 ? (
          <EmptyState title="Son 8 haftada kayıt yok" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <CohortTh>Hafta</CohortTh>
                  <CohortTh className="text-right">Kaydolan</CohortTh>
                  <CohortTh className="text-right">Araç ekledi</CohortTh>
                  <CohortTh className="text-right">7+ gün sonra döndü</CohortTh>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.weekStart} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{formatDate(c.weekStart)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{c.signedUp}</td>
                    <td className="px-3 py-2 text-right">
                      <CohortCell value={c.activated} total={c.signedUp} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <CohortCell value={c.retained} total={c.signedUp} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Huni + kırılımlar ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Aktivasyon hunisi" description="Şirketlerin kaç adımı tamamladığı" />
          <div className="space-y-3 p-4">
            {funnel.map((step, i) => (
              <BarRow
                key={step.label}
                label={`${i + 1}. ${step.label}`}
                value={step.count}
                max={funnelMax}
                hint={`%${funnelMax ? Math.round((step.count / funnelMax) * 100) : 0}`}
                tone={i === funnel.length - 1 ? "mint" : "primary"}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Rol dağılımı" description="Kullanıcıların yetki dağılımı" />
          <div className="space-y-3 p-4">
            {data.roleBreakdown.map((r) => (
              <BarRow key={r.role} label={ROLE_LABELS[r.role] ?? r.role} value={r.count} max={roleMax} />
            ))}
            <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
              <div>
                <span className="text-muted-foreground">Hiç giriş yapmamış</span>
                <p className="font-mono text-sm tabular-nums">{engagement.neverSignedIn}</p>
              </div>
              <div>
                <span className="text-muted-foreground">E-posta doğrulanmamış</span>
                <p className="font-mono text-sm tabular-nums">{engagement.unconfirmedEmail}</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Son kayıtlar ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Son kaydolan kullanıcılar"
            action={
              <Link href="/admin/users" className="text-xs text-primary hover:underline">
                Tümü
              </Link>
            }
          />
          {data.recentUsers.length === 0 ? (
            <EmptyState icon={UserPlus} title="Henüz kullanıcı yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentUsers.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email} · {u.companyName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill className={ROLE_CLASSES[u.role]}>{ROLE_LABELS[u.role]}</Pill>
                      <span className="w-20 text-right font-mono text-[11px] text-muted-foreground">
                        {formatRelative(u.createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Son kurulan şirketler"
            action={
              <Link href="/admin/companies" className="text-xs text-primary hover:underline">
                Tümü
              </Link>
            }
          />
          {data.recentCompanies.length === 0 ? (
            <EmptyState icon={Building2} title="Henüz şirket yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentCompanies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.userCount} kullanıcı
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Dikkat listesi ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Hiç araç eklememiş" description="Aktivasyonu tamamlanmamış hesaplar" />
          {attention.emptyCompanies.length === 0 ? (
            <EmptyState title="Hepsi araç eklemiş 🎉" />
          ) : (
            <ul className="divide-y divide-border/60">
              {attention.emptyCompanies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {c.ageDays} gündür
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Uykuda" description="30+ gündür giriş yapılmamış" />
          {attention.dormantCompanies.length === 0 ? (
            <EmptyState title="Uykuda hesap yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {attention.dormantCompanies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatRelative(c.lastSignInAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Son geri bildirimler"
            action={
              <Link href="/admin/feedback" className="text-xs text-primary hover:underline">
                Tümü
              </Link>
            }
          />
          {data.recentFeedback.length === 0 ? (
            <EmptyState icon={Inbox} title="Geri bildirim yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentFeedback.slice(0, 6).map((f) => (
                <li key={f.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {FEEDBACK_TYPE_LABELS[f.type] ?? f.type} · {f.companyName}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatRelative(f.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-foreground/90">{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <SectionLabel>
        Toplam {formatNumber(totals.companies)} şirket · {formatNumber(totals.users)} kullanıcı ·{" "}
        {formatNumber(totals.vehicles)} araç
      </SectionLabel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-heading text-lg font-semibold tabular-nums">{formatNumber(value)}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
    </div>
  );
}

function CohortTh({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

/** Sayı + oran — kohort küçükken oran yanıltıcı olmasın diye ikisi birlikte. */
function CohortCell({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono tabular-nums">{value}</span>
      <span
        className={`font-mono text-[10px] ${
          pct >= 60 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
        }`}
      >
        %{pct}
      </span>
    </span>
  );
}
