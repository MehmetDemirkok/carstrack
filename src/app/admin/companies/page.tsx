"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, Building2, Download, Search } from "lucide-react";
import type { AdminCompanyListResponse } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  LoadingRows,
  Panel,
  Pill,
  StatCard,
  useAdminFetch,
  useDebounced,
} from "@/components/admin/ui";
import {
  formatDate,
  formatNumber,
  formatRelative,
  HEALTH_CLASSES,
  HEALTH_LABELS,
  PLAN_LABELS,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

const HEALTH_FILTERS = [
  { value: "all", label: "Tüm durumlar" },
  { value: "healthy", label: "Aktif" },
  { value: "partial", label: "Yavaşlamış" },
  { value: "empty", label: "Araç yok" },
  { value: "dormant", label: "Uykuda" },
];

const PLAN_FILTERS = [
  { value: "all", label: "Tüm planlar" },
  { value: "free", label: "Ücretsiz" },
  { value: "pro", label: "Profesyonel" },
  { value: "fleet", label: "Filo" },
];

const SORT_OPTIONS = [
  { value: "created", label: "Kuruluş" },
  { value: "activity", label: "Aktivite" },
  { value: "users", label: "Kullanıcı" },
  { value: "vehicles", label: "Araç" },
  { value: "lastSignIn", label: "Son giriş" },
  { value: "name", label: "Ad" },
];

export default function AdminCompaniesPage() {
  const [query, setQuery] = React.useState("");
  const [health, setHealth] = React.useState("all");
  const [plan, setPlan] = React.useState("all");
  const [sort, setSort] = React.useState("created");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");

  const debouncedQuery = useDebounced(query, 300);

  const url = React.useMemo(() => {
    const params = new URLSearchParams({ q: debouncedQuery, health, plan, sort, dir });
    return `/api/admin/companies?${params}`;
  }, [debouncedQuery, health, plan, sort, dir]);

  const { data, loading, error, reload } = useAdminFetch<AdminCompanyListResponse>(url);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Şirketler</h1>
          <p className="text-sm text-muted-foreground">
            Her tenant&apos;ın büyüklüğü, aktivitesi ve sağlık durumu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href="/api/admin/export?kind=companies" />}
        >
          <Download /> CSV indir
        </Button>
      </header>

      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Toplam" value={data.counts.all} icon={Building2} onClick={() => setHealth("all")} />
          <StatCard
            label="Aktif"
            value={data.counts.healthy}
            tone="positive"
            onClick={() => setHealth("healthy")}
          />
          <StatCard
            label="Yavaşlamış"
            value={data.counts.partial}
            tone="warning"
            onClick={() => setHealth("partial")}
          />
          <StatCard label="Araç yok" value={data.counts.empty} onClick={() => setHealth("empty")} />
          <StatCard
            label="Uykuda"
            value={data.counts.dormant}
            tone="danger"
            onClick={() => setHealth("dormant")}
          />
        </div>
      ) : null}

      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Şirket adı veya yetkili…"
              className="h-8 w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <FilterSelect value={health} onChange={setHealth} options={HEALTH_FILTERS} />
          <FilterSelect value={plan} onChange={setPlan} options={PLAN_FILTERS} />
          <FilterSelect
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS.map((o) => ({ ...o, label: `Sırala: ${o.label}` }))}
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label={dir === "asc" ? "Artan sıralama" : "Azalan sıralama"}
          >
            <ArrowUpDown />
          </Button>
        </div>
      </Panel>

      <Panel>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingRows rows={10} />
        ) : !data || data.companies.length === 0 ? (
          <EmptyState icon={Building2} title="Eşleşen şirket yok" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <Th>Şirket</Th>
                    <Th>Yetkili</Th>
                    <Th>Plan</Th>
                    <Th className="text-right">Kullanıcı</Th>
                    <Th className="text-right">Araç</Th>
                    <Th className="text-right">30g aktivite</Th>
                    <Th>Son giriş</Th>
                    <Th>Kuruluş</Th>
                    <Th>Durum</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.companies.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link href={`/admin/companies/${c.id}`} className="block max-w-[200px] truncate font-medium hover:text-primary">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className="block max-w-[180px] truncate text-xs">
                          {c.ownerName ?? "—"}
                        </span>
                        <span className="block max-w-[180px] truncate text-xs text-muted-foreground">
                          {c.ownerEmail ?? ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{PLAN_LABELS[c.plan]}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{c.userCount}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{c.vehicleCount}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {c.activity30d}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatRelative(c.lastSignInAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <Pill className={HEALTH_CLASSES[c.health]}>{HEALTH_LABELS[c.health]}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border/60 px-4 py-2.5">
              <p className="font-mono text-xs text-muted-foreground">
                {formatNumber(data.total)} şirket
              </p>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
