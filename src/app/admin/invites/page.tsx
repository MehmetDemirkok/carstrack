"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, MailPlus, MailX, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { AdminCompanyListResponse, AdminInviteListResponse } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  LoadingRows,
  Panel,
  Pill,
  StatCard,
  useAdminFetch,
} from "@/components/admin/ui";
import { formatDate, formatRelative, ROLE_CLASSES, ROLE_LABELS } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = [
  { value: "open", label: "Bekleyen" },
  { value: "expired", label: "Süresi geçmiş" },
  { value: "accepted", label: "Kabul edilmiş" },
  { value: "revoked", label: "İptal edilmiş" },
  { value: "all", label: "Tümü" },
];

export default function AdminInvitesPage() {
  const [status, setStatus] = React.useState("open");
  const [company, setCompany] = React.useState("all");
  const [pending, setPending] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  const { data, loading, error, reload } = useAdminFetch<AdminInviteListResponse>(
    `/api/admin/invites?status=${status}&company=${company}&limit=300`,
    [nonce],
  );
  const companiesState = useAdminFetch<AdminCompanyListResponse>(
    "/api/admin/companies?sort=name&dir=asc",
  );

  async function revoke(id: string, email: string) {
    setPending(id);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "İptal edilemedi");
      toast.success(`${email} daveti iptal edildi`);
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İptal edilemedi");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Davetler</h1>
        <p className="text-sm text-muted-foreground">
          Tüm şirketlerin ekip davetleri — aktivasyon hunisindeki &quot;ekip davet etti&quot;
          adımının arkasındaki veri.
        </p>
      </header>

      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Bekleyen"
            value={data.counts.pending}
            icon={Clock}
            tone={data.counts.pending > 0 ? "warning" : "default"}
            onClick={() => setStatus("open")}
          />
          <StatCard
            label="Süresi geçmiş"
            value={data.counts.expired}
            icon={MailX}
            tone={data.counts.expired > 0 ? "danger" : "default"}
            onClick={() => setStatus("expired")}
          />
          <StatCard
            label="Kabul edilmiş"
            value={data.counts.accepted}
            icon={CheckCircle2}
            onClick={() => setStatus("accepted")}
          />
          <StatCard
            label="İptal edilmiş"
            value={data.counts.revoked}
            icon={XCircle}
            onClick={() => setStatus("revoked")}
          />
        </div>
      ) : null}

      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={status} onChange={setStatus} options={STATUS_FILTERS} />
          <FilterSelect
            value={company}
            onChange={setCompany}
            options={[
              { value: "all", label: "Tüm şirketler" },
              ...(companiesState.data?.companies ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </Panel>

      <Panel>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingRows rows={8} />
        ) : !data || data.invites.length === 0 ? (
          <EmptyState icon={MailPlus} title="Bu filtrede davet yok" />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {i.email}
                    <Pill className={ROLE_CLASSES[i.role]}>{ROLE_LABELS[i.role]}</Pill>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.companyId ? (
                      <Link href={`/admin/companies/${i.companyId}`} className="hover:underline">
                        {i.companyName}
                      </Link>
                    ) : (
                      i.companyName
                    )}
                    {" · davet eden: "}
                    {i.invitedByName}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <StatusPill status={i.status} expired={i.expired} />
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {i.status === "accepted" && i.acceptedAt
                        ? `kabul: ${formatDate(i.acceptedAt)}`
                        : i.expired
                          ? `${formatDate(i.expiresAt)} doldu`
                          : `son ${formatRelative(i.expiresAt)}`}
                    </span>
                  </div>
                  {i.status === "pending" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending === i.id}
                      onClick={() => revoke(i.id, i.email)}
                    >
                      İptal et
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Davet durumu — süresi geçmiş 'pending' ayrı gösterilir. */
function StatusPill({ status, expired }: { status: string; expired: boolean }) {
  if (expired) {
    return (
      <Pill className="bg-destructive/10 text-destructive ring-destructive/20">Süresi geçti</Pill>
    );
  }
  switch (status) {
    case "accepted":
      return (
        <Pill className="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400">
          Kabul edildi
        </Pill>
      );
    case "revoked":
      return <Pill className="bg-muted text-muted-foreground ring-border">İptal edildi</Pill>;
    default:
      return (
        <Pill className="bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400">
          Bekliyor
        </Pill>
      );
  }
}
