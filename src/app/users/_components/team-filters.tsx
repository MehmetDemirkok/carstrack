"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamFilter } from "./team-utils";

const FILTERS: { value: TeamFilter; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "management", label: "Yönetim" },
  { value: "drivers", label: "Sürücüler" },
  { value: "active", label: "Aktif seyahatte" },
  { value: "unassigned", label: "Araçsız" },
  { value: "license", label: "Ehliyet uyarısı" },
];

export function TeamFilters({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  counts,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  filter: TeamFilter;
  onFilterChange: (f: TeamFilter) => void;
  counts: Record<TeamFilter, number>;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="İsim, departman veya plaka ara..."
          aria-label="Ekipte ara"
          className="w-full h-11 rounded-2xl border border-border bg-background/60 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Aramayı temizle"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar" role="tablist" aria-label="Ekip filtresi">
        {FILTERS.map(({ value, label }) => {
          const selected = filter === value;
          const count = counts[value];
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onFilterChange(value)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {label}
              <span className={cn("tabular-nums", selected ? "opacity-80" : "opacity-60")}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
