"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  Car,
  MailPlus,
  ExternalLink,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Menu,
  Search,
  ServerCog,
  Shield,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/admin/format";
import { useDebounced } from "./ui";

const NAV = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/companies", label: "Şirketler", icon: Building2 },
  { href: "/admin/vehicles", label: "Araçlar", icon: Car },
  { href: "/admin/invites", label: "Davetler", icon: MailPlus },
  { href: "/admin/email", label: "E-posta & Duyuru", icon: Mail },
  { href: "/admin/feedback", label: "Geri Bildirim", icon: MessageSquareText },
  { href: "/admin/activity", label: "Etkinlik", icon: Activity },
  { href: "/admin/system", label: "Sistem", icon: ServerCog },
] as const;

/**
 * Konsolun kabuğu: sol gezinme, üst çubuk ve global arama.
 *
 * Kiracı uygulamasının kabuğundan (ShellWrapper) tamamen bağımsızdır —
 * /admin, `AUTH_PATHS` üzerinden oradan muaf tutulur, böylece iki sidebar
 * üst üste binmez ve konsol kendi diline sahip olur.
 */
export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Sayfa değişince mobil menüyü kapat — navigasyona tepki, türetilmiş state değil.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      {/* ── Sol gezinme ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-mesh shadow-lg shadow-primary/25">
              <Shield className="size-4 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-heading text-sm font-semibold leading-tight">
                Yönetim Konsolu
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                CarsTrack
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X />
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {NAV.map(({ href, label, icon: Icon, ...rest }) => {
            const exact = "exact" in rest && rest.exact;
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <p className="truncate font-mono text-[10px] text-muted-foreground" title={adminEmail}>
            {adminEmail}
          </p>
          <Link
            href="/dashboard"
            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            Uygulamaya dön
          </Link>
        </div>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* ── İçerik ── */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-background/80 px-4 py-2.5 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu />
          </Button>
          <GlobalSearch />
          <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 ring-1 ring-inset ring-amber-500/20 sm:inline-flex dark:text-amber-400">
            <Shield className="size-3" />
            Süper admin
          </span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 pb-16">{children}</main>
      </div>
    </div>
  );
}

// ─── Global arama ────────────────────────────────────────────────────────────

interface SearchResults {
  users: { id: string; fullName: string; email: string; role: string; companyName: string }[];
  companies: { id: string; name: string }[];
  vehicles: { id: string; plate: string; label: string; companyId: string; companyName: string }[];
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [open, setOpen] = React.useState(false);
  const debounced = useDebounced(query, 250);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (debounced.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/search?q=${encodeURIComponent(debounced.trim())}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: SearchResults) => {
        if (!cancelled) setResults(json);
      })
      .catch(() => {
        if (!cancelled) setResults(null);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Dışarı tıklayınca sonuçları kapat.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results && (results.users.length > 0 || results.companies.length > 0 || results.vehicles.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Kullanıcı, şirket veya plaka ara…"
        className="h-8 w-full rounded-lg border border-border/60 bg-muted/40 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background"
      />

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-xl">
          {!hasResults ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sonuç yok</p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              <ResultGroup label="Kullanıcılar">
                {results.users.map((u) => (
                  <ResultItem
                    key={u.id}
                    onClick={() => go(`/admin/users/${u.id}`)}
                    title={u.fullName}
                    subtitle={`${u.email} · ${ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role} · ${u.companyName}`}
                  />
                ))}
              </ResultGroup>
              <ResultGroup label="Şirketler">
                {results.companies.map((c) => (
                  <ResultItem
                    key={c.id}
                    onClick={() => go(`/admin/companies/${c.id}`)}
                    title={c.name}
                    subtitle="Şirket"
                  />
                ))}
              </ResultGroup>
              <ResultGroup label="Araçlar">
                {results.vehicles.map((v) => (
                  <ResultItem
                    key={v.id}
                    onClick={() => go(`/admin/vehicles/${v.id}`)}
                    title={v.plate}
                    subtitle={`${v.label} · ${v.companyName}`}
                  />
                ))}
              </ResultGroup>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  if (items.length === 0) return null;
  return (
    <div className="py-1">
      <p className="px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {items}
    </div>
  );
}

function ResultItem({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left transition-colors hover:bg-muted/60"
    >
      <span className="block truncate text-sm">{title}</span>
      <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}
