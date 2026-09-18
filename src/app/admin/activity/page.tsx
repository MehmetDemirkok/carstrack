"use client";

import * as React from "react";
import { Activity, Shield, Users } from "lucide-react";
import type { AdminActivityRow } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  LoadingRows,
  Panel,
  useAdminFetch,
} from "@/components/admin/ui";
import { actionLabel, formatDateTime, formatRelative } from "@/lib/admin/format";

export default function AdminActivityPage() {
  const [source, setSource] = React.useState("all");
  const { data, loading, error, reload } = useAdminFetch<{ activity: AdminActivityRow[] }>(
    `/api/admin/activity?source=${source}&limit=200`,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Etkinlik</h1>
          <p className="text-sm text-muted-foreground">
            Şirketlerin kendi işlemleri ve bu panelden yapılan değişiklikler tek akışta.
          </p>
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
      </header>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingRows rows={12} />
      ) : !data || data.activity.length === 0 ? (
        <Panel>
          <EmptyState icon={Activity} title="Kayıtlı etkinlik yok" />
        </Panel>
      ) : (
        <Panel>
          <ul className="divide-y divide-border/60">
            {data.activity.map((a) => (
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
                    {formatRelative(a.createdAt)}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground/70">
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
