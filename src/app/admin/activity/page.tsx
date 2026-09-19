"use client";

import * as React from "react";
import { Activity, Download, Search, Shield, Users } from "lucide-react";
import type { AdminActivityRow, AdminCompanyListResponse } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  LoadingRows,
  Panel,
  useAdminFetch,
  useDebounced,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { actionLabel, formatDate, formatRelative } from "@/lib/admin/format";

/** Saat:dakika — gün başlığı tarihi zaten verdiği için satırda tam tarih tekrarlanmaz. */
function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

const DAY_FILTERS = [
  { value: "0", label: "Tüm zamanlar" },
  { value: "1", label: "Son 24 saat" },
  { value: "7", label: "Son 7 gün" },
  { value: "30", label: "Son 30 gün" },
];

export default function AdminActivityPage() {
  const [source, setSource] = React.useState("all");
  const [company, setCompany] = React.useState("all");
  const [action, setAction] = React.useState("all");
  const [dayRange, setDayRange] = React.useState("0");
  const [query, setQuery] = React.useState("");

  const debouncedQuery = useDebounced(query, 300);

  const url = React.useMemo(() => {
    const params = new URLSearchParams({
      source,
      company,
      action,
      days: dayRange,
      q: debouncedQuery,
      limit: "200",
    });
    return `/api/admin/activity?${params}`;
  }, [source, company, action, dayRange, debouncedQuery]);

  const { data, loading, error, reload } = useAdminFetch<{
    activity: AdminActivityRow[];
    actions: string[];
  }>(url);

  const companiesState = useAdminFetch<AdminCompanyListResponse>(
    "/api/admin/companies?sort=name&dir=asc",
  );

  // Aksiyon listesi gelen veriden türüyor; filtre daraldıkça liste de daralmasın
  // diye ilk dolu haliyle sabitleniyor.
  const [knownActions, setKnownActions] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!data?.actions?.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKnownActions((prev) => [...new Set([...prev, ...data.actions])].sort());
  }, [data]);

  // 200 satırlık düz akış okunmuyordu; günlere bölünce taranabilir hale geliyor.
  const days = React.useMemo(() => {
    const groups = new Map<string, AdminActivityRow[]>();
    for (const row of data?.activity ?? []) {
      const key = row.createdAt.slice(0, 10);
      const list = groups.get(key);
      if (list) list.push(row);
      else groups.set(key, [row]);
    }
    return [...groups.entries()];
  }, [data]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Etkinlik</h1>
          <p className="text-sm text-muted-foreground">
            Şirketlerin kendi işlemleri ve bu panelden yapılan değişiklikler tek akışta.
          </p>
        </div>
      </header>

      {/* ── Filtreler ── */}
      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kişi, kayıt veya şirket…"
              className="h-8 w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>

          <FilterSelect
            value={source}
            onChange={setSource}
            options={[
              { value: "all", label: "Tüm kaynaklar" },
              { value: "tenant", label: "Şirket işlemleri" },
              { value: "admin", label: "Admin işlemleri" },
            ]}
          />
          <FilterSelect
            value={company}
            onChange={setCompany}
            options={[
              { value: "all", label: "Tüm şirketler" },
              ...(companiesState.data?.companies ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <FilterSelect
            value={action}
            onChange={setAction}
            options={[
              { value: "all", label: "Tüm işlemler" },
              ...knownActions.map((a) => ({ value: a, label: actionLabel(a) })),
            ]}
          />
          <FilterSelect value={dayRange} onChange={setDayRange} options={DAY_FILTERS} />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/api/admin/export?kind=activity&${new URLSearchParams({ source, company, action, days: dayRange })}`} />}
          >
            <Download /> CSV
          </Button>
        </div>
      </Panel>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingRows rows={12} />
      ) : !data || data.activity.length === 0 ? (
        <Panel>
          <EmptyState icon={Activity} title="Kayıtlı etkinlik yok" />
        </Panel>
      ) : (
        <div className="space-y-3">
          {days.map(([day, rows]) => (
            <Panel key={day}>
              <div className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-2">
                <span className="text-xs font-medium">{formatDate(rows[0].createdAt)}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{rows.length} işlem</span>
              </div>
              <ul className="divide-y divide-border/60">
                {rows.map((a) => (
                  <li key={`${a.source}-${a.id}`} className="flex items-start gap-3 px-4 py-2.5">
                    <span
                      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                        a.source === "admin"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.source === "admin" ? <Shield className="size-3.5" /> : <Users className="size-3.5" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{actionLabel(a.action)}</span>
                        {a.entityLabel ? (
                          <span className="text-muted-foreground"> · {a.entityLabel}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.actorName} · {a.companyName}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {timeOfDay(a.createdAt)}
                      </span>
                      <span className="block font-mono text-[10px] text-muted-foreground/70">
                        {formatRelative(a.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
