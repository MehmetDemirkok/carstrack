"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  Mail,
  Send,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AdminCompanyListResponse,
  AdminEmailLogRow,
  AdminEmailRecipientsResponse,
  AdminEmailSegment,
} from "@/lib/admin/types";
import {
  ConfirmDialog,
  EmptyState,
  FilterSelect,
  LoadingRows,
  Panel,
  PanelHeader,
  Pill,
  useAdminFetch,
  useDebounced,
} from "@/components/admin/ui";
import { formatDateTime, formatNumber, ROLE_LABELS } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEGMENTS: { value: AdminEmailSegment; label: string; hint: string }[] = [
  { value: "all", label: "Tüm kullanıcılar", hint: "Doğrulanmış adresi olan herkes" },
  { value: "managers", label: "Şirket yetkilileri", hint: "Karar verici kitle" },
  { value: "operators", label: "Operatörler", hint: "Filo operasyonunu yürütenler" },
  { value: "drivers", label: "Sürücüler", hint: "Sürücü ve kullanıcı rolündekiler" },
  { value: "company", label: "Belirli şirket", hint: "Tek bir tenant'ın tüm ekibi" },
  { value: "inactive", label: "30+ gündür pasif", hint: "Geri kazanım kampanyası" },
  { value: "never_signed_in", label: "Hiç giriş yapmamış", hint: "Aktivasyon dürtmesi" },
  { value: "empty_fleet", label: "Araç eklememiş", hint: "Kurulumu yarım kalmış hesaplar" },
];

type Channel = "email" | "notification" | "both";

export default function AdminEmailPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState<"compose" | "history">("compose");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">E-posta & Duyuru</h1>
          <p className="text-sm text-muted-foreground">
            Segment seç, yaz, önizle, kendine test at, gönder.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/60 p-0.5">
          <TabButton active={tab === "compose"} onClick={() => setTab("compose")}>
            <Send className="size-3.5" /> Yeni duyuru
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            <History className="size-3.5" /> Geçmiş
          </TabButton>
        </div>
      </header>

      {tab === "compose" ? (
        <Composer initialCompanyId={searchParams.get("company")} />
      ) : (
        <SendHistory />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Oluşturma
// ─────────────────────────────────────────────────────────────────────────────

function Composer({ initialCompanyId }: { initialCompanyId: string | null }) {
  const [segment, setSegment] = React.useState<AdminEmailSegment>(
    initialCompanyId ? "company" : "managers",
  );
  const [companyId, setCompanyId] = React.useState<string>(initialCompanyId ?? "");
  const [channel, setChannel] = React.useState<Channel>("email");
  const [ignoreOptOut, setIgnoreOptOut] = React.useState(false);

  const [subject, setSubject] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [ctaUrl, setCtaUrl] = React.useState("");
  const [ctaLabel, setCtaLabel] = React.useState("");
  const [signature, setSignature] = React.useState("CarsTrack Ekibi");

  const [recipients, setRecipients] = React.useState<AdminEmailRecipientsResponse | null>(null);
  const [loadingRecipients, setLoadingRecipients] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState<string>("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const companiesState = useAdminFetch<AdminCompanyListResponse>(
    "/api/admin/companies?sort=name&dir=asc",
  );

  // ── Alıcıları çöz ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (segment === "company" && !companyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecipients(null);
      return;
    }
    let cancelled = false;
    setLoadingRecipients(true);

    fetch("/api/admin/email/recipients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segment, companyId: companyId || null, ignoreOptOut }),
    })
      .then((res) => res.json())
      .then((json: AdminEmailRecipientsResponse) => {
        if (!cancelled) setRecipients(json);
      })
      .catch(() => {
        if (!cancelled) setRecipients(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecipients(false);
      });

    return () => {
      cancelled = true;
    };
  }, [segment, companyId, ignoreOptOut]);

  // ── Canlı önizleme (gerçek şablondan) ──────────────────────────────────────
  const debouncedTitle = useDebounced(title, 500);
  const debouncedMessage = useDebounced(message, 500);
  const debouncedCta = useDebounced(ctaUrl, 500);
  const debouncedCtaLabel = useDebounced(ctaLabel, 500);
  const debouncedSignature = useDebounced(signature, 500);

  React.useEffect(() => {
    if (!debouncedTitle && !debouncedMessage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewHtml("");
      return;
    }
    let cancelled = false;
    fetch("/api/admin/email/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: debouncedTitle,
        body: debouncedMessage,
        ctaUrl: debouncedCta,
        ctaLabel: debouncedCtaLabel,
        signature: debouncedSignature,
      }),
    })
      .then((res) => res.json())
      .then((json: { html: string }) => {
        if (!cancelled) setPreviewHtml(json.html ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [debouncedTitle, debouncedMessage, debouncedCta, debouncedCtaLabel, debouncedSignature]);

  const canSend = Boolean(title.trim() && message.trim()) && (recipients?.total ?? 0) > 0;

  async function sendTest() {
    setBusy("test");
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ segment, subject, title, message, ctaUrl, ctaLabel, signature, test: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Test gönderilemedi");
      if (json.skipped) {
        toast.warning("RESEND_API_KEY tanımlı değil — gönderim atlandı");
      } else if (json.ok) {
        toast.success("Test e-postası kendi adresine gönderildi");
      } else {
        toast.error(json.errors?.[0] ?? "Test gönderilemedi");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test gönderilemedi");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    try {
      const payload = {
        segment,
        companyId: companyId || null,
        ignoreOptOut,
        subject,
        title,
        message,
        ctaUrl,
        ctaLabel,
        signature,
      };

      if (channel === "email" || channel === "both") {
        const res = await fetch("/api/admin/email/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Gönderilemedi");
        if (json.skipped) toast.warning("RESEND_API_KEY yok — e-posta gönderimi atlandı");
        else toast.success(`${json.sent} e-posta gönderildi${json.failed ? `, ${json.failed} başarısız` : ""}`);
      }

      if (channel === "notification" || channel === "both") {
        const res = await fetch("/api/admin/notify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            segment,
            companyId: companyId || null,
            title,
            message,
            url: ctaUrl || undefined,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Bildirim gönderilemedi");
        toast.success(`${json.inserted} kişiye uygulama içi bildirim düştü`);
      }

      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(null);
    }
  }

  const activeSegment = SEGMENTS.find((s) => s.value === segment);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ── Sol: form ── */}
      <div className="space-y-4">
        <Panel>
          <PanelHeader title="Kime" description="Alıcı kitlesini seç" />
          <div className="space-y-3 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {SEGMENTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSegment(s.value)}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    segment === s.value
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </button>
              ))}
            </div>

            {segment === "company" ? (
              <FilterSelect
                value={companyId}
                onChange={setCompanyId}
                options={[
                  { value: "", label: "Şirket seçin…" },
                  ...(companiesState.data?.companies ?? []).map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.userCount} kişi)`,
                  })),
                ]}
              />
            ) : null}

            <label className="flex items-start gap-2 rounded-xl border border-border/60 p-2.5">
              <input
                type="checkbox"
                checked={ignoreOptOut}
                onChange={(e) => setIgnoreOptOut(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm">E-posta bildirimini kapatanlara da gönder</span>
                <span className="block text-xs text-muted-foreground">
                  Yalnızca hesabı doğrudan ilgilendiren zorunlu duyurular için (güvenlik, fiyat,
                  hizmet kesintisi).
                </span>
              </span>
            </label>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Mesaj" description="Başlık, gövde ve isteğe bağlı buton" />
          <div className="space-y-3 p-4">
            <Field label="E-posta konusu" hint="Boş bırakılırsa başlık kullanılır">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="CarsTrack — Yeni özellik"
              />
            </Field>
            <Field label="Başlık">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yakıt analizi artık yayında"
              />
            </Field>
            <Field
              label="Mesaj"
              hint="Boş satır paragraf ayırır · '- ' ile başlayan satır madde olur · HTML çalışmaz"
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                placeholder={"Filo yakıt tüketimini artık araç bazında karşılaştırabilirsiniz.\n\n- Anomali tespiti\n- Aylık maliyet grafiği"}
                className="w-full rounded-lg border border-border/60 bg-background p-2.5 text-sm outline-none focus:border-ring"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Buton bağlantısı" hint="Boşsa buton görünmez">
                <Input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://carstrack.app/yakit"
                />
              </Field>
              <Field label="Buton metni">
                <Input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Uygulamayı Aç"
                />
              </Field>
            </div>
            <Field label="İmza">
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Kanal" description="Duyuru nereden ulaşsın" />
          <div className="grid gap-2 p-4 sm:grid-cols-3">
            <ChannelOption
              active={channel === "email"}
              onClick={() => setChannel("email")}
              icon={Mail}
              label="Yalnızca e-posta"
            />
            <ChannelOption
              active={channel === "notification"}
              onClick={() => setChannel("notification")}
              icon={Bell}
              label="Yalnızca uygulama içi"
            />
            <ChannelOption
              active={channel === "both"}
              onClick={() => setChannel("both")}
              icon={Send}
              label="İkisi birden"
            />
          </div>
        </Panel>
      </div>

      {/* ── Sağ: alıcılar + önizleme + gönder ── */}
      <div className="space-y-4">
        <Panel>
          <PanelHeader
            title="Alıcılar"
            description={activeSegment?.label}
            action={
              loadingRecipients ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null
            }
          />
          <div className="p-4">
            {segment === "company" && !companyId ? (
              <p className="text-xs text-muted-foreground">Önce bir şirket seçin.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-semibold tabular-nums">
                    {formatNumber(recipients?.total ?? 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">kişi</span>
                </div>
                {recipients && recipients.optedOut > 0 ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {recipients.optedOut} kişi e-posta bildirimini kapattığı için listede yok.
                  </p>
                ) : null}

                {recipients && recipients.recipients.length > 0 ? (
                  <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t border-border/60 pt-3">
                    {recipients.recipients.slice(0, 60).map((r) => (
                      <li key={r.userId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate">
                          {r.fullName || r.email}
                          <span className="text-muted-foreground"> · {r.companyName}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {ROLE_LABELS[r.role]}
                        </span>
                      </li>
                    ))}
                    {recipients.recipients.length > 60 ? (
                      <li className="pt-1 text-center text-[11px] text-muted-foreground">
                        …ve {recipients.recipients.length - 60} kişi daha
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Önizleme" description="Gönderilecek e-postanın birebir kopyası" />
          <div className="p-3">
            {previewHtml ? (
              <iframe
                title="E-posta önizlemesi"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[420px] w-full rounded-lg border border-border/60 bg-white"
              />
            ) : (
              <EmptyState
                icon={Eye}
                title="Önizleme için yazmaya başlayın"
                description="Başlık ve mesaj girdiğiniz anda gerçek şablon burada oluşur."
              />
            )}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={!title.trim() || !message.trim() || busy !== null}
              onClick={sendTest}
            >
              {busy === "test" ? <Loader2 className="animate-spin" /> : <Mail />}
              Kendime test gönder
            </Button>
            <Button className="w-full" disabled={!canSend || busy !== null} onClick={() => setConfirmOpen(true)}>
              <Send />
              {formatNumber(recipients?.total ?? 0)} kişiye gönder
            </Button>
            {!canSend ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Başlık, mesaj ve en az bir alıcı gerekli.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Duyuruyu gönder"
        confirmLabel="Gönder"
        confirmWord="GONDER"
        busy={busy === "send"}
        onConfirm={send}
        description={
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{recipients?.total ?? 0}</span> kişiye{" "}
              <span className="font-medium text-foreground">
                {channel === "email"
                  ? "e-posta"
                  : channel === "notification"
                    ? "uygulama içi bildirim"
                    : "e-posta + uygulama içi bildirim"}
              </span>{" "}
              gönderilecek.
            </p>
            <p className="rounded-lg bg-muted/60 p-2 text-xs">
              Konu: <span className="text-foreground">{subject || title}</span>
            </p>
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Gönderilen e-posta geri alınamaz. Önce kendine test atmanı öneririm.
            </p>
          </div>
        }
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Geçmiş
// ─────────────────────────────────────────────────────────────────────────────

function SendHistory() {
  const { data, loading } = useAdminFetch<{ rows: AdminEmailLogRow[]; available: boolean }>(
    "/api/admin/email/log?limit=100",
  );

  if (loading) return <LoadingRows rows={8} />;

  if (data && !data.available) {
    return (
      <Panel>
        <EmptyState
          icon={History}
          title="Gönderim geçmişi tablosu yok"
          description="supabase/migrations/20260918_admin_panel.sql dosyasını Supabase'de çalıştırın; sonraki gönderimler burada listelenir."
        />
      </Panel>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Panel>
        <EmptyState icon={Mail} title="Henüz duyuru gönderilmedi" />
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader title="Gönderim geçmişi" description={`${data.rows.length} kayıt`} />
      <ul className="divide-y divide-border/60">
        {data.rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {row.subject}
                {row.isTest ? (
                  <Pill className="ml-2 bg-muted text-muted-foreground ring-border">test</Pill>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.segmentLabel} · {row.actorEmail}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                {row.sentCount}
              </span>
              {row.failedCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <TriangleAlert className="size-3.5" />
                  {row.failedCount}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Users className="size-3.5" />
                {row.recipientCount}
              </span>
              <span className="w-36 text-right font-mono text-[11px] text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ─── Küçük parçalar ──────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ChannelOption({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/50"
      }`}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
