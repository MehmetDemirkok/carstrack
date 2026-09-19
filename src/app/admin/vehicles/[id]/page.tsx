"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Car, FileText, Fuel, Receipt, Route, TriangleAlert, Wrench } from "lucide-react";
import type { AdminVehicleDetail } from "@/lib/admin/types";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  Panel,
  PanelHeader,
  Pill,
  useAdminFetch,
} from "@/components/admin/ui";
import { formatDate, formatDateTime, formatNumber, ROLE_LABELS } from "@/lib/admin/format";
import type { UserRole } from "@/lib/types";
import { AdminNotes } from "@/components/admin/admin-notes";
import { Button } from "@/components/ui/button";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bugüne göre kalan gün — tarih yoksa null. */
function daysLeft(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((t - Date.now()) / DAY_MS);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AdminVehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const { data, loading, error, reload } = useAdminFetch<AdminVehicleDetail>(
    vehicleId ? `/api/admin/vehicles/${vehicleId}` : null,
  );

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingRows rows={8} />;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Başlık ── */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="icon-sm" nativeButton={false} render={<Link href="/admin/vehicles" />}>
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold tracking-tight">
              <span className="font-mono">{data.plate}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {[data.brand, data.model, data.year].filter(Boolean).join(" ") || "Model bilgisi yok"}
              {data.companyId ? (
                <>
                  {" · "}
                  <Link href={`/admin/companies/${data.companyId}`} className="hover:underline">
                    {data.companyName}
                  </Link>
                </>
              ) : null}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <ExpiryPill label="Sigorta" date={data.insuranceExpiry} />
              <ExpiryPill label="Muayene" date={data.inspectionExpiry} />
              <ExpiryPill label="Kasko" date={data.kaskoExpiry} />
              {data.inlineCount > 0 ? (
                <Pill className="bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400">
                  {data.inlineCount} fotoğraf satır içi ({formatBytes(data.inlineBytes)})
                </Pill>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ── Künye ── */}
      <Panel>
        <PanelHeader title="Araç bilgileri" description="Kimlik ve teknik künye" />
        <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Meta label="Kilometre" value={formatNumber(data.mileage)} />
          <Meta label="Yakıt" value={data.fuelType || "—"} />
          <Meta label="Vites" value={data.transmission || "—"} />
          <Meta label="Renk" value={data.color || "—"} />
          <Meta label="Şasi no" value={<span className="font-mono">{data.chassisNo || "—"}</span>} />
          <Meta label="Mülkiyet" value={data.ownershipType || "—"} />
          <Meta label="Kiralayan" value={data.rentCompany || "—"} />
          <Meta label="Sigorta şirketi" value={data.insuranceCompany || "—"} />
          <Meta label="Kasko şirketi" value={data.kaskoCompany || "—"} />
          <Meta label="Son servis" value={data.lastServiceDate ? formatDate(data.lastServiceDate) : "—"} />
          <Meta label="Son servis KM" value={formatNumber(data.lastServiceMileage)} />
          <Meta label="Sonraki servis KM" value={formatNumber(data.nextServiceMileage)} />
          <Meta label="Eklendi" value={formatDate(data.createdAt)} />
          <Meta label="Güncellendi" value={data.updatedAt ? formatDate(data.updatedAt) : "—"} />
          <Meta label="Storage'daki fotoğraf" value={formatNumber(data.storedCount)} />
          <Meta label="Bildirim" value={formatNumber(data.reports.length)} />
        </dl>
        {data.notes ? (
          <div className="border-t border-border/60 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Araç notu
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{data.notes}</p>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Sürücüler ── */}
        <Panel>
          <PanelHeader title="Atanmış sürücüler" description={`${data.drivers.length} kişi`} />
          {data.drivers.length === 0 ? (
            <EmptyState icon={Car} title="Araç kimseye atanmamış" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.drivers.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <Link href={`/admin/users/${d.id}`} className="truncate text-sm hover:underline">
                    {d.fullName}
                  </Link>
                  <Pill className="bg-muted text-muted-foreground ring-border">
                    {ROLE_LABELS[d.role as UserRole] ?? d.role}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── Belgeler ── */}
        <Panel>
          <PanelHeader title="Belgeler" description="Son 20 kayıt" />
          {data.documents.length === 0 ? (
            <EmptyState icon={FileText} title="Belge yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{d.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {d.type}
                      {d.fileSize ? ` · ${formatBytes(d.fileSize)}` : ""}
                      {d.expiryDate ? ` · geçerlilik ${formatDate(d.expiryDate)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatDate(d.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Servis geçmişi ── */}
      <Panel>
        <PanelHeader title="Servis geçmişi" description="Son 15 kayıt" />
        {data.services.length === 0 ? (
          <EmptyState icon={Wrench} title="Servis kaydı yok" />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{s.title || s.type}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.type}
                    {s.serviceCenter ? ` · ${s.serviceCenter}` : ""}
                    {s.mileage ? ` · ${formatNumber(s.mileage)} km` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  {s.cost !== null ? (
                    <span className="block font-mono text-xs tabular-nums">
                      {formatNumber(s.cost)} ₺
                    </span>
                  ) : null}
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {s.date ? formatDate(s.date) : "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Seferler ── */}
        <Panel>
          <PanelHeader title="Seferler" description="Son 15 km kaydı" />
          {data.trips.length === 0 ? (
            <EmptyState icon={Route} title="Sefer kaydı yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.trips.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{t.driverName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatNumber(t.startKm)} →{" "}
                      {t.endKm !== null ? formatNumber(t.endKm) : "devam ediyor"}
                      {t.distance !== null ? ` · ${formatNumber(t.distance)} km` : ""}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(t.startTime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── Yakıt ── */}
        <Panel>
          <PanelHeader title="Yakıt alımları" description="Son 15 kayıt" />
          {data.fuelRecords.length === 0 ? (
            <EmptyState icon={Fuel} title="Yakıt kaydı yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.fuelRecords.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {formatNumber(f.liters)} L · {formatNumber(f.totalAmount)} ₺
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {f.stationName || "İstasyon yok"} · {formatNumber(f.odometer)} km
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {f.fueledAt ? formatDate(f.fueledAt) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Cezalar ── */}
        <Panel>
          <PanelHeader title="Trafik cezaları" description="Son 15 kayıt" />
          {data.fines.length === 0 ? (
            <EmptyState icon={Receipt} title="Ceza yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.fines.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{f.violationType || "Ceza"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.fineDate ? formatDate(f.fineDate) : "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-xs tabular-nums">
                      {formatNumber(f.amount)} ₺
                    </span>
                    <Pill
                      className={
                        f.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
                      }
                    >
                      {f.status === "paid" ? "Ödendi" : "Ödenmedi"}
                    </Pill>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ── Arıza bildirimleri ── */}
        <Panel>
          <PanelHeader title="Arıza bildirimleri" description="Son 15 kayıt" />
          {data.reports.length === 0 ? (
            <EmptyState icon={TriangleAlert} title="Bildirim yok" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.category} · {r.severity}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <Pill
                      className={
                        r.status === "open"
                          ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
                          : "bg-muted text-muted-foreground ring-border"
                      }
                    >
                      {r.status}
                    </Pill>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AdminNotes targetType="vehicle" targetId={data.id} targetLabel={data.plate} />
    </div>
  );
}

/** Belge bitiş rozeti — geçmişse kırmızı, 30 gün içindeyse sarı. */
function ExpiryPill({ label, date }: { label: string; date: string | null }) {
  const days = daysLeft(date);
  if (!date || days === null) {
    return <Pill className="bg-muted text-muted-foreground ring-border">{label}: yok</Pill>;
  }
  const tone =
    days < 0
      ? "bg-destructive/10 text-destructive ring-destructive/20"
      : days <= 30
        ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
        : "bg-muted text-muted-foreground ring-border";
  return (
    <Pill className={tone}>
      {label}: {formatDate(date)}
      {days < 0 ? ` (${Math.abs(days)} gün geçti)` : ` (${days} gün)`}
    </Pill>
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
