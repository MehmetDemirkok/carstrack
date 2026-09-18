"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Ban,
  ChevronLeft,
  ChevronRight,
  Download,
  MailWarning,
  Search,
  ShieldOff,
  Users,
} from "lucide-react";
import type { AdminCompanyListResponse, AdminUserListResponse } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  FilterSelect,
  Panel,
  Pill,
  StatCard,
  useAdminFetch,
  useDebounced,
} from "@/components/admin/ui";
import {
  avatarTone,
  formatDate,
  formatNumber,
  formatRelative,
  initials,
  PLAN_LABELS,
  ROLE_CLASSES,
  ROLE_LABELS,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

const ROLE_FILTERS = [
  { value: "all", label: "Tüm roller" },
  { value: "manager", label: "Şirket Yetkilisi" },
  { value: "operator", label: "Operatör" },
  { value: "driver", label: "Sürücü / Kullanıcı" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Tüm durumlar" },
  { value: "active7d", label: "Son 7 gün aktif" },
  { value: "dormant30d", label: "30+ gündür pasif" },
  { value: "never", label: "Hiç giriş yapmamış" },
  { value: "unconfirmed", label: "E-posta doğrulanmamış" },
  { value: "banned", label: "Askıya alınmış" },
];

const SORT_OPTIONS = [
  { value: "created", label: "Kayıt tarihi" },
  { value: "lastSignIn", label: "Son giriş" },
  { value: "name", label: "Ad" },
  { value: "company", label: "Şirket" },
  { value: "vehicles", label: "Araç sayısı" },
];

export default function AdminUsersPage() {
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("all");
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
  }, [debouncedQuery, role, company, status, sort, dir]);

  const url = React.useMemo(() => {
    const params = new URLSearchParams({
      q: debouncedQuery,
      role,
      company,
      status,
      sort,
      dir,
      page: String(page),
      pageSize: "25",
    });
    return `/api/admin/users?${params}`;
  }, [debouncedQuery, role, company, status, sort, dir, page]);

  const { data, loading, error, reload } = useAdminFetch<AdminUserListResponse>(url);
  const companiesState = useAdminFetch<AdminCompanyListResponse>("/api/admin/companies?sort=name&dir=asc");

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Kullanıcılar</h1>
          <p className="text-sm text-muted-foreground">
            Tüm şirketlerdeki hesaplar, kayıt ve giriş bilgileriyle.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href="/api/admin/export?kind=users" />}
        >
          <Download /> CSV indir
        </Button>
      </header>

      {/* ── Hızlı sayaçlar (tıklayınca filtreler) ── */}
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Toplam" value={data.counts.all} icon={Users} onClick={() => setStatus("all")} />
          <StatCard label="Yönetici" value={data.counts.managers} onClick={() => setRole("manager")} />
          <StatCard label="Sürücü" value={data.counts.drivers} onClick={() => setRole("driver")} />
          <StatCard
            label="Hiç girmemiş"
            value={data.counts.neverSignedIn}
            icon={MailWarning}
            tone={data.counts.neverSignedIn > 0 ? "warning" : "default"}
            onClick={() => setStatus("never")}
          />
          <StatCard
            label="Askıda"
            value={data.counts.banned}
            icon={ShieldOff}
            tone={data.counts.banned > 0 ? "danger" : "default"}
            onClick={() => setStatus("banned")}
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
              placeholder="Ad, e-posta, şirket veya departman…"
              className="h-8 w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>

          <FilterSelect value={role} onChange={setRole} options={ROLE_FILTERS} />
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
        ) : !data || data.users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Eşleşen kullanıcı yok"
            description="Arama veya filtreleri değiştirmeyi deneyin."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <Th>Kullanıcı</Th>
                    <Th>Şirket</Th>
                    <Th>Rol</Th>
                    <Th className="text-right">Araç</Th>
                    <Th>Kayıt</Th>
                    <Th>Son giriş</Th>
                    <Th>Durum</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5">
                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${avatarTone(u.fullName || u.email)}`}
                          >
                            {initials(u.fullName || u.email)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{u.fullName}</span>
                            <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {u.companyId ? (
                          <Link
                            href={`/admin/companies/${u.companyId}`}
                            className="block max-w-[180px] truncate hover:text-primary hover:underline"
                          >
                            {u.companyName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {PLAN_LABELS[u.companyPlan]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Pill className={ROLE_CLASSES[u.role]}>{ROLE_LABELS[u.role]}</Pill>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {u.vehicleCount}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatRelative(u.lastSignInAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {u.banned ? (
                            <Pill className="bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400">
                              <Ban className="size-3" /> Askıda
                            </Pill>
                          ) : null}
                          {!u.emailConfirmed ? (
                            <Pill className="bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400">
                              Doğrulanmamış
                            </Pill>
                          ) : null}
                          {!u.notifyByEmail ? (
                            <Pill className="bg-muted text-muted-foreground ring-border">
                              E-posta kapalı
                            </Pill>
                          ) : null}
                          {u.banned || !u.emailConfirmed || !u.notifyByEmail ? null : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Sayfalama ── */}
            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
              <p className="font-mono text-xs text-muted-foreground">
                {formatNumber(data.total)} kayıt · sayfa {data.page}/{totalPages}
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

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}
