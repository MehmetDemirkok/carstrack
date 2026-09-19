"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Car,
  Copy,
  KeyRound,
  LogIn,
  Loader2,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminUserDetail } from "@/lib/admin/types";
import type { UserRole } from "@/lib/types";
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
  actionLabel,
  avatarTone,
  formatDateTime,
  formatRelative,
  initials,
  ROLE_CLASSES,
  ROLE_LABELS,
} from "@/lib/admin/format";
import { AdminNotes } from "@/components/admin/admin-notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROLE_OPTIONS: UserRole[] = ["manager", "operator", "user", "sofor"];

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const { data, loading, error, reload } = useAdminFetch<AdminUserDetail>(
    userId ? `/api/admin/users/${userId}` : null,
  );

  const [fullName, setFullName] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("user");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState<string | null>(null);

  // Sunucudan veri gelince düzenleme formunu doldur.
  React.useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(data.fullName);
    setDepartment(data.department);
    setRole(data.role);
  }, [data]);

  async function patch(body: Record<string, unknown>, key: string, successMessage: string) {
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "İşlem başarısız");
      toast.success(successMessage);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusy(null);
    }
  }

  async function makeLink(type: "recovery" | "magiclink", send = false) {
    setBusy(`link-${type}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, send }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Bağlantı üretilemedi");

      setGeneratedLink(json.link);
      toast.success(
        json.emailed
          ? `Şifre sıfırlama e-postası ${json.email} adresine gönderildi`
          : "Bağlantı üretildi — aşağıdan kopyalayabilirsiniz",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bağlantı üretilemedi");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Silinemedi");
      toast.success("Kullanıcı silindi");
      router.push("/admin/users");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi");
      setBusy(null);
      setDeleteOpen(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingRows rows={8} />;

  const dirty = fullName !== data.fullName || department !== data.department || role !== data.role;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Kullanıcılar
      </Link>

      {/* ── Kimlik kartı ── */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-semibold ${avatarTone(data.fullName || data.email)}`}
            >
              {initials(data.fullName || data.email)}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-semibold tracking-tight">
                {data.fullName}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{data.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Pill className={ROLE_CLASSES[data.role]}>{ROLE_LABELS[data.role]}</Pill>
                {data.banned ? (
                  <Pill className="bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400">
                    <Ban className="size-3" /> Askıda
                  </Pill>
                ) : null}
                {data.emailConfirmed ? (
                  <Pill className="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400">
                    <ShieldCheck className="size-3" /> Doğrulanmış
                  </Pill>
                ) : (
                  <Pill className="bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400">
                    E-posta doğrulanmamış
                  </Pill>
                )}
                {!data.notifyByEmail ? (
                  <Pill className="bg-muted text-muted-foreground ring-border">
                    E-posta bildirimi kapalı
                  </Pill>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <Meta label="Kayıt" value={formatDateTime(data.createdAt)} />
            <Meta label="Son giriş" value={formatRelative(data.lastSignInAt)} />
            <Meta label="Giriş yöntemi" value={data.provider} />
            <Meta
              label="Şirket"
              value={
                data.companyId ? (
                  <Link href={`/admin/companies/${data.companyId}`} className="text-primary hover:underline">
                    {data.companyName}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </dl>
        </div>
      </Panel>

      {/* ── İstatistikler ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MiniStat label="Atanmış araç" value={data.vehicleCount} />
        <MiniStat label="Görev" value={data.stats.tasks} />
        <MiniStat label="Yakıt kaydı" value={data.stats.fuelRecords} />
        <MiniStat label="Arıza bildirimi" value={data.stats.reports} />
        <MiniStat label="Km bildirimi" value={data.stats.kilometerLogs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Profil düzenleme ── */}
        <Panel>
          <PanelHeader title="Profil" description="Ad, departman ve yetki" />
          <div className="space-y-3 p-4">
            <Field label="Ad Soyad">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Departman">
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="—"
              />
            </Field>
            <Field label="Rol">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="h-8 w-full rounded-lg border border-border/60 bg-background px-2 text-sm outline-none focus:border-ring"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>

            <Button
              size="sm"
              disabled={!dirty || busy !== null}
              onClick={() => patch({ fullName, department, role }, "profile", "Profil güncellendi")}
            >
              {busy === "profile" ? <Loader2 className="animate-spin" /> : <Save />}
              Kaydet
            </Button>
          </div>
        </Panel>

        {/* ── Hesap işlemleri ── */}
        <Panel>
          <PanelHeader title="Hesap işlemleri" description="Erişim ve destek araçları" />
          <div className="space-y-2 p-4">
            {!data.emailConfirmed ? (
              <ActionRow
                icon={ShieldCheck}
                title="E-postayı doğrulanmış işaretle"
                description="Kullanıcı doğrulama bağlantısına ulaşamıyorsa."
                busy={busy === "confirm"}
                onClick={() => patch({ confirmEmail: true }, "confirm", "E-posta doğrulandı")}
              />
            ) : null}

            <ActionRow
              icon={KeyRound}
              title="Şifre sıfırlama e-postası gönder"
              description="Bağlantı doğrudan kullanıcının adresine gider."
              busy={busy === "link-recovery"}
              onClick={() => makeLink("recovery", true)}
            />

            <ActionRow
              icon={LogIn}
              title="Tek seferlik giriş bağlantısı üret"
              description="Destek amaçlı — bu bağlantı kullanıcının oturumunu açar. Her üretim kayda geçer."
              busy={busy === "link-magiclink"}
              onClick={() => makeLink("magiclink")}
            />

            <ActionRow
              icon={Ban}
              title={data.banned ? "Askıyı kaldır" : "Hesabı askıya al"}
              description={
                data.banned
                  ? "Kullanıcı tekrar giriş yapabilir."
                  : "Kullanıcı giriş yapamaz, verileri silinmez."
              }
              busy={busy === "ban"}
              destructive={!data.banned}
              onClick={() =>
                patch(
                  { banned: !data.banned },
                  "ban",
                  data.banned ? "Askı kaldırıldı" : "Hesap askıya alındı",
                )
              }
            />

            <ActionRow
              icon={Trash2}
              title="Kullanıcıyı kalıcı olarak sil"
              description="Hesap ve ona bağlı tüm kayıtlar silinir. Geri alınamaz."
              destructive
              onClick={() => setDeleteOpen(true)}
            />

            {generatedLink ? (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Üretilen bağlantı
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 text-[11px]">
                    {generatedLink}
                  </code>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.success("Bağlantı kopyalandı");
                    }}
                    aria-label="Bağlantıyı kopyala"
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      {/* ── Araçlar ve etkinlik ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Atanmış araçlar" description={`${data.vehicles.length} araç`} />
          {data.vehicles.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Atanmış araç yok</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.vehicles.map((v) => (
                <li key={v.id} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                  <Car className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-mono font-medium">{v.plate}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {v.brand} {v.model}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Son etkinlikler" description="Uygulama içindeki işlemleri" />
          {data.recentActivity.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Kayıtlı etkinlik yok</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {actionLabel(a.action)}
                    {a.entityLabel ? (
                      <span className="text-muted-foreground"> · {a.entityLabel}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatRelative(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AdminNotes targetType="user" targetId={data.id} targetLabel={data.fullName} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Kullanıcıyı kalıcı olarak sil"
        destructive
        confirmLabel="Kalıcı olarak sil"
        confirmWord={data.email}
        busy={busy === "delete"}
        onConfirm={remove}
        description={
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{data.fullName}</span> ({data.email})
              hesabı ve ona bağlı tüm kayıtlar silinecek.
            </p>
            <p className="text-destructive">Bu işlem geri alınamaz.</p>
          </div>
        }
      />
    </div>
  );
}

// ─── Küçük parçalar ──────────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-xs">{value}</dd>
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

function ActionRow({
  icon: Icon,
  title,
  description,
  onClick,
  busy = false,
  destructive = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-start gap-2.5 rounded-xl border border-border/60 p-3 text-left transition-colors disabled:opacity-60 ${
        destructive ? "hover:border-destructive/40 hover:bg-destructive/5" : "hover:bg-muted/50"
      }`}
    >
      {busy ? (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Icon className={`mt-0.5 size-4 shrink-0 ${destructive ? "text-destructive" : "text-muted-foreground"}`} />
      )}
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${destructive ? "text-destructive" : ""}`}>
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
