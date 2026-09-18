"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Car, Loader2, Mail, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminCompanyDetail } from "@/lib/admin/types";
import type { PlanType } from "@/lib/types";
import {
  ConfirmDialog,
  ErrorState,
  LoadingRows,
  Panel,
  PanelHeader,
  Pill,
  useAdminFetch,
} from "@/components/admin/ui";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  HEALTH_CLASSES,
  HEALTH_LABELS,
  PLAN_LABELS,
  ROLE_CLASSES,
  ROLE_LABELS,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PLAN_OPTIONS: PlanType[] = ["free", "pro", "fleet"];

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;

  const { data, loading, error, reload } = useAdminFetch<AdminCompanyDetail>(
    companyId ? `/api/admin/companies/${companyId}` : null,
  );

  const [name, setName] = React.useState("");
  const [plan, setPlan] = React.useState<PlanType>("free");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Sunucudan gelen kaydı düzenleme formuna aktar — dış veri senkronizasyonu.
  React.useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(data.name);
    setPlan(data.plan);
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
  }, [data]);

  async function save() {
    setBusy("save");
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, plan, email, phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Kaydedilemedi");
      toast.success("Şirket güncellendi");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Silinemedi");
      toast.success(`Şirket ve ${json.deletedUsers} kullanıcı silindi`);
      router.push("/admin/companies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi");
      setBusy(null);
      setDeleteOpen(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingRows rows={8} />;

  const dirty =
    name !== data.name ||
    plan !== data.plan ||
    email !== (data.email ?? "") ||
    phone !== (data.phone ?? "");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/admin/companies"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Şirketler
      </Link>

      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold tracking-tight">{data.name}</h1>
            <p className="text-sm text-muted-foreground">
              {data.ownerName ?? "Yetkili yok"}
              {data.ownerEmail ? ` · ${data.ownerEmail}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Pill className={HEALTH_CLASSES[data.health]}>{HEALTH_LABELS[data.health]}</Pill>
              <Pill className="bg-muted text-muted-foreground ring-border">{PLAN_LABELS[data.plan]}</Pill>
              {data.inviteCode ? (
                <Pill className="bg-muted text-muted-foreground ring-border">
                  Davet kodu: {data.inviteCode}
                </Pill>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/admin/email?company=${data.id}`} />}
            >
              <Mail /> Bu şirkete yaz
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-4">
          <Meta label="Kuruluş" value={formatDateTime(data.createdAt)} />
          <Meta label="Son giriş" value={formatRelative(data.lastSignInAt)} />
          <Meta label="Saat dilimi" value={data.timezone ?? "—"} />
          <Meta label="30g aktivite" value={String(data.activity30d)} />
          <Meta label="Vergi dairesi" value={data.taxOffice ?? "—"} />
          <Meta label="Vergi no" value={data.taxNumber ?? "—"} />
          <Meta label="Telefon" value={data.phone ?? "—"} />
          <Meta label="Adres" value={data.address ?? "—"} />
        </dl>
      </Panel>

      {/* ── İçerik sayaçları ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MiniStat label="Araç" value={data.counts.vehicles} />
        <MiniStat label="Kullanıcı" value={data.userCount} />
        <MiniStat label="Servis" value={data.counts.serviceRecords} />
        <MiniStat label="Belge" value={data.counts.documents} />
        <MiniStat label="Görev" value={data.counts.tasks} />
        <MiniStat label="Yakıt" value={data.counts.fuelRecords} />
        <MiniStat label="Ceza" value={data.counts.trafficFines} />
        <MiniStat label="Arıza" value={data.counts.reports} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Düzenleme ── */}
        <Panel>
          <PanelHeader title="Şirket bilgileri" description="Ad, plan ve iletişim" />
          <div className="space-y-3 p-4">
            <Field label="Şirket adı">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Plan">
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanType)}
                className="h-8 w-full rounded-lg border border-border/60 bg-background px-2 text-sm outline-none focus:border-ring"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PLAN_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="İletişim e-postası">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="—" />
            </Field>
            <Field label="Telefon">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="—" />
            </Field>

            <div className="flex gap-2">
              <Button size="sm" disabled={!dirty || busy !== null} onClick={save}>
                {busy === "save" ? <Loader2 className="animate-spin" /> : <Save />}
                Kaydet
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Şirketi sil
              </Button>
            </div>
          </div>
        </Panel>

        {/* ── Ekip ── */}
        <Panel>
          <PanelHeader title="Ekip" description={`${data.members.length} kullanıcı`} />
          {data.members.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Kullanıcı yok</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.members.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/users/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{m.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill className={ROLE_CLASSES[m.role]}>{ROLE_LABELS[m.role]}</Pill>
                      <span className="w-20 text-right font-mono text-[10px] text-muted-foreground">
                        {formatRelative(m.lastSignInAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Araçlar ── */}
      <Panel>
        <PanelHeader title="Araçlar" description={`${data.vehicles.length} kayıtlı araç`} />
        {data.vehicles.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            Bu şirket henüz araç eklememiş.
          </p>
        ) : (
          <ul className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
            {data.vehicles.map((v) => (
              <li key={v.id} className="flex items-center gap-2.5 bg-card px-4 py-2 text-sm">
                <Car className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-mono font-medium">{v.plate}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {v.brand} {v.model}
                </span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatDate(v.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Şirketi kalıcı olarak sil"
        destructive
        confirmLabel="Şirketi ve tüm verisini sil"
        confirmWord={data.name}
        busy={busy === "delete"}
        onConfirm={remove}
        description={
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{data.name}</span> şirketi, {data.userCount}{" "}
              kullanıcısı, {data.counts.vehicles} aracı ve tüm servis/görev/yakıt kayıtları silinecek.
            </p>
            <p className="text-destructive">Bu işlem geri alınamaz.</p>
          </div>
        }
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-xs">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card/60 p-3 ring-1 ring-border/60">
      <p className="font-heading text-lg font-semibold tabular-nums">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
