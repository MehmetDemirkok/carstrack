"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Car,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  UserX,
} from "lucide-react";
import type { AdminCompanyListResponse, AdminVehicleListResponse } from "@/lib/admin/types";
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
import { formatDate, formatNumber } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = [
  { value: "all", label: "Tüm araçlar" },
  { value: "expired", label: "Süresi geçmiş" },
  { value: "expiring", label: "30 gün içinde dolacak" },
  { value: "missing", label: "Tarihi girilmemiş" },
  { value: "unassigned", label: "Sürücüsü yok" },
];

const SORT_OPTIONS = [
  { value: "created", label: "Ekleme tarihi" },
  { value: "insurance", label: "Sigorta bitişi" },
  { value: "inspection", label: "Muayene bitişi" },
  { value: "plate", label: "Plaka" },
  { value: "company", label: "Şirket" },
  { value: "mileage", label: "Kilometre" },
];

export default function AdminVehiclesPage() {
  const [query, setQuery] = React.useState("");
  const [company, setCompany] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState("created");
  const [dir, setDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);

  const debouncedQuery = useDebounced(query, 300);

  // Filtre değişince ilk sayfaya dön — aksi halde boş sayfada kalınabiliyor.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedQuery, company, status, sort, dir]);

  const url = React.useMemo(() => {
    const params = new URLSearchParams({
      q: debouncedQuery,
      company,
      status,
      sort,
      dir,
      page: String(page),
      pageSize: "25",
    });
    return `/api/admin/vehicles?${params}`;
  }, [debouncedQuery, company, status, sort, dir, page]);

  const { data, loading, error, reload } = useAdminFetch<AdminVehicleListResponse>(url);
  const companiesState = useAdminFetch<AdminCompanyListResponse>(
    "/api/admin/companies?sort=name&dir=asc",
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Araçlar</h1>
        <p className="text-sm text-muted-foreground">
          Tüm şirketlerin filosu — belge tarihleri ve sürücü atamalarıyla.
        </p>
      </header>

      {/* ── Hızlı sayaçlar (tıklayınca filtreler) ── */}
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Toplam" value={data.counts.all} icon={Car} onClick={() => setStatus("all")} />
          <StatCard
            label="Süresi geçmiş"
            value={data.counts.expired}
            icon={ShieldAlert}
            tone={data.counts.expired > 0 ? "danger" : "default"}
            onClick={() => setStatus("expired")}
          />
          <StatCard
            label="30 günde dolacak"
            value={data.counts.expiring}
            icon={CalendarX}
            tone={data.counts.expiring > 0 ? "warning" : "default"}
            onClick={() => setStatus("expiring")}
          />
          <StatCard
            label="Tarihi yok"
            value={data.counts.missingDates}
            tone={data.counts.missingDates > 0 ? "warning" : "default"}
            onClick={() => setStatus("missing")}
          />
          <StatCard
            label="Sürücüsüz"
            value={data.counts.unassigned}
            icon={UserX}
            onClick={() => setStatus("unassigned")}
          />
        </div>
      ) : null}

      {/* ── Filtreler ── */}
      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Plaka, marka, model, şirket veya sürücü…"
              className="h-8 w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>

          <FilterSelect value={status} onChange={setStatus} options={STATUS_FILTERS} />
          <FilterSelect
            value={company}
            onChange={setCompany}
            options={[
              { value: "all", label: "Tüm şirketler" },
              ...(companiesState.data?.companies ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
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
            title={dir === "asc" ? "Artan" : "Azalan"}
          >
            <ArrowUpDown />
          </Button>
        </div>
      </Panel>

      {/* ── Liste ── */}
      <Panel>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingRows rows={10} />
        ) : !data || data.vehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Eşleşen araç yok"
            description="Arama veya filtreleri değiştirmeyi deneyin."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <Th>Araç</Th>
                    <Th>Şirket</Th>
                    <Th>Sürücü</Th>
                    <Th className="text-right">KM</Th>
                    <Th>Sigorta</Th>
                    <Th>Muayene</Th>
                    <Th className="text-right">Eklendi</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicles.map((v) => (
                    <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/vehicles/${v.id}`}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {v.plate}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[v.brand, v.model, v.year].filter(Boolean).join(" ") || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {v.companyId ? (
                          <Link
                            href={`/admin/companies/${v.companyId}`}
                            className="text-sm hover:underline"
                          >
                            {v.companyName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {v.drivers.length === 0 ? (
                          <Pill className="bg-muted text-muted-foreground ring-border">Atanmamış</Pill>
                        ) : (
                          <span className="text-xs">{v.drivers.join(", ")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {formatNumber(v.mileage)}
                      </td>
                      <td className="px-3 py-2">
                        <ExpiryCell date={v.insuranceExpiry} days={v.insuranceDays} />
                      </td>
                      <td className="px-3 py-2">
                        <ExpiryCell date={v.inspectionExpiry} days={v.inspectionDays} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground">
                        {formatDate(v.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Sayfalama ── */}
            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
              <p className="font-mono text-xs text-muted-foreground">
                {formatNumber(data.total)} araç · sayfa {data.page}/{totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Önceki sayfa"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Sonraki sayfa"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

/** Belge bitiş tarihi — geçmişse kırmızı, 30 gün içindeyse sarı. */
export function ExpiryCell({ date, days }: { date: string | null; days: number | null }) {
  if (!date || days === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const tone =
    days < 0
      ? "bg-destructive/10 text-destructive ring-destructive/20"
      : days <= 30
        ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
        : "bg-muted text-muted-foreground ring-border";
  const suffix = days < 0 ? `${Math.abs(days)} gün geçti` : `${days} gün`;
  return (
    <span className="block">
      <span className="block font-mono text-[11px]">{formatDate(date)}</span>
      <Pill className={tone}>{suffix}</Pill>
    </span>
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
