"use client";

import Link from "next/link";
import {
  AlertTriangle, BatteryCharging, Calendar, Car, CheckCircle2, ChevronRight, ClipboardList,
  Disc3, Gauge, History, MapPin, Pencil, Phone, Wallet, Wrench, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ServiceProvider, ServiceRecord, ServiceType, Vehicle } from "@/lib/types";

export const typeConfig: Record<ServiceType, { icon: React.ElementType; color: string; dot: string; label: string }> = {
  routine: { icon: CheckCircle2, color: "bg-violet-500/10 text-violet-500", dot: "bg-violet-500", label: "Periyodik" },
  repair: { icon: AlertTriangle, color: "bg-orange-500/10 text-orange-500", dot: "bg-orange-500", label: "Onarım" },
  tire: { icon: Disc3, color: "bg-teal-500/10 text-teal-500", dot: "bg-teal-500", label: "Lastik" },
  inspection: { icon: ClipboardList, color: "bg-violet-500/10 text-violet-500", dot: "bg-violet-500", label: "Muayene" },
  battery: { icon: BatteryCharging, color: "bg-yellow-500/10 text-yellow-500", dot: "bg-yellow-500", label: "Akü" },
  other: { icon: Wrench, color: "bg-gray-500/10 text-gray-500", dot: "bg-gray-500", label: "Diğer" },
};

const DAY_MS = 86_400_000;

const formatDate = (date: string) => (date ? date.split("-").reverse().join(".") : "—");
const formatKm = (km: number) => `${km.toLocaleString("tr-TR")} km`;
const formatMoney = (amount: number) => `₺${amount.toLocaleString("tr-TR")}`;

const byNewest = (a: ServiceRecord, b: ServiceRecord) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

function formatCreatedAt(createdAt?: string): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
}

function daysBetween(from: string, to: string): number | null {
  const diff = Date.parse(to) - Date.parse(from);
  return Number.isNaN(diff) ? null : Math.round(diff / DAY_MS);
}

/**
 * Bakım kalemleri ve lastik bilgisi kayıtta değil araçta tutulur. Yalnızca tarihi ve
 * km'si bu kayıtla birebir eşleşenler gösterilir; kalem sonradan yeniden yapıldıysa
 * araçtaki değer ilerlediği için eski kayıtta görünmez.
 */
function getPerformedItems(record: ServiceRecord, vehicle?: Vehicle): string[] {
  if (!vehicle || record.type !== "routine") return [];
  return vehicle.maintenanceItems
    .filter((item) => item.lastDoneDate === record.date && item.lastDoneMileage === record.mileage)
    .map((item) => item.name);
}

function getTireDetails(record: ServiceRecord, vehicle?: Vehicle): string[] {
  if (!vehicle || record.type !== "tire") return [];
  if (vehicle.tireInstallDate !== record.date || vehicle.tireMileage !== record.mileage) return [];
  return [vehicle.tireStatus, vehicle.tireBrand, vehicle.tireSize].filter(Boolean);
}

function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-muted-foreground">{children}</h3>;
}

interface RecordDetailDialogProps {
  record: ServiceRecord | null;
  records: ServiceRecord[];
  vehicles: Vehicle[];
  providers: ServiceProvider[];
  onClose: () => void;
  onEdit: (record: ServiceRecord) => void;
  onSelect: (recordId: string) => void;
}

export function RecordDetailDialog({ record, records, vehicles, providers, onClose, onEdit, onSelect }: RecordDetailDialogProps) {
  if (!record) return null;

  const config = typeConfig[record.type] ?? typeConfig.other;
  const vehicle = vehicles.find((v) => v.id === record.vehicleId);
  const provider = providers.find((p) => p.name === record.serviceCenter);
  const performedItems = getPerformedItems(record, vehicle);
  const tireDetails = getTireDetails(record, vehicle);
  const createdAt = formatCreatedAt(record.createdAt);

  const vehicleRecords = records.filter((r) => r.vehicleId === record.vehicleId).sort(byNewest);
  const vehicleTotal = vehicleRecords.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const otherRecords = vehicleRecords.filter((r) => r.id !== record.id);
  const previous = vehicleRecords[vehicleRecords.findIndex((r) => r.id === record.id) + 1];
  const daysSincePrevious = previous ? daysBetween(previous.date, record.date) : null;
  const kmSincePrevious = previous && previous.mileage > 0 && record.mileage > 0 ? record.mileage - previous.mileage : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[92vw] md:max-w-lg rounded-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-outfit pr-8 break-words">{record.title || "(Başlıksız)"}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-[10px] h-5 px-2 rounded-md font-bold border-none ${config.color}`}>
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(record.date)}</span>
          </div>
        </DialogHeader>

        <div key={record.id} className="flex-1 min-h-0 overflow-y-auto space-y-5 py-2">
          {vehicle && (
            <Link
              href={`/vehicles/${vehicle.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/30 p-3 hover:bg-muted/60 transition-colors"
            >
              <Car className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-outfit font-bold tracking-wide text-sm">{vehicle.plate}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {vehicle.brand} {vehicle.model}{vehicle.year ? ` • ${vehicle.year}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={Calendar} label="İşlem tarihi">{formatDate(record.date)}</DetailRow>
            <DetailRow icon={Gauge} label="Kilometre">{record.mileage > 0 ? formatKm(record.mileage) : "Belirtilmedi"}</DetailRow>
            <DetailRow icon={MapPin} label="Servis noktası">{record.serviceCenter || "Belirtilmedi"}</DetailRow>
            {provider?.phone && (
              <DetailRow icon={Phone} label="Servis telefonu">
                <a href={`tel:${provider.phone}`} className="text-primary hover:underline">{provider.phone}</a>
              </DetailRow>
            )}
            <DetailRow icon={record.paymentStatus === "unpaid" ? XCircle : Wallet} label="Tutar">
              {record.cost !== undefined ? (
                <span className="flex flex-wrap items-center gap-2">
                  {formatMoney(record.cost)}
                  <span className={`text-xs font-semibold ${record.paymentStatus === "unpaid" ? "text-destructive" : "text-[var(--success)] dark:text-emerald-400"}`}>
                    {record.paymentStatus === "unpaid" ? "Ödenmedi" : "Ödendi"}
                  </span>
                </span>
              ) : "Belirtilmedi"}
            </DetailRow>
          </div>

          {record.paymentStatus === "unpaid" && record.unpaidReason && (
            <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-3 text-xs text-destructive/90 leading-relaxed">
              <b>Ödenmeme nedeni:</b> {record.unpaidReason}
            </div>
          )}

          {performedItems.length > 0 && (
            <section className="space-y-2">
              <SectionTitle>Yapılan bakım kalemleri</SectionTitle>
              <ul className="space-y-1.5">
                {performedItems.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] dark:text-emerald-400 shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tireDetails.length > 0 && (
            <section className="space-y-2">
              <SectionTitle>Takılan lastik</SectionTitle>
              <p className="flex items-center gap-2 text-sm">
                <Disc3 className="h-4 w-4 text-teal-500 shrink-0" />
                {tireDetails.join(" • ")}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <SectionTitle>Yapılan işlemler ve notlar</SectionTitle>
            <div className="bg-muted/40 rounded-xl p-3 text-sm leading-relaxed border border-border/20 whitespace-pre-wrap break-words">
              {record.notes || <span className="text-muted-foreground">Bu kayda not eklenmemiş.</span>}
            </div>
          </section>

          {previous && (
            <section className="space-y-2">
              <SectionTitle>Önceki işlemden bu yana</SectionTitle>
              <p className="text-sm">
                {daysSincePrevious !== null && daysSincePrevious >= 0 && (
                  <>{daysSincePrevious === 0 ? "Aynı gün" : `${daysSincePrevious.toLocaleString("tr-TR")} gün`}</>
                )}
                {kmSincePrevious !== null && kmSincePrevious >= 0 && <> • {formatKm(kmSincePrevious)}</>}
              </p>
              <p className="text-xs text-muted-foreground">
                Önceki işlem: {previous.title || "(Başlıksız)"}, {formatDate(previous.date)}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle>Bu aracın servis geçmişi</SectionTitle>
              <span className="text-xs text-muted-foreground">
                {vehicleRecords.length} işlem{vehicleTotal > 0 && ` • ${formatMoney(vehicleTotal)}`}
              </span>
            </div>
            {otherRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu araç için başka servis kaydı yok.</p>
            ) : (
              <ul className="space-y-1.5">
                {otherRecords.map((other) => {
                  const otherConfig = typeConfig[other.type] ?? typeConfig.other;
                  const OtherIcon = otherConfig.icon;
                  return (
                    <li key={other.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(other.id)}
                        className="w-full flex items-center gap-2.5 rounded-xl border border-border/40 bg-card px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        <OtherIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{other.title || "(Başlıksız)"}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {formatDate(other.date)}
                            {other.mileage > 0 && ` • ${formatKm(other.mileage)}`}
                            {other.cost !== undefined && ` • ${formatMoney(other.cost)}`}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {createdAt && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <History className="h-3 w-3 shrink-0" /> Kayıt oluşturulma: {createdAt}
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="rounded-xl" />}>Kapat</DialogClose>
          <Button className="rounded-xl gap-1.5" onClick={() => onEdit(record)}>
            <Pencil className="h-3.5 w-3.5" /> Düzenle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
