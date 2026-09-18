import type { PlanType, UserRole } from "@/lib/types";
import type { AdminCompanyHealth } from "./types";

/** Panel genelinde kullanılan biçimlendiriciler — istemci tarafında da çalışır. */

const TR_TZ = "Europe/Istanbul";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TR_TZ,
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TR_TZ,
  });
}

/** "3 gün önce" / "az önce" — listelerde tarihten daha okunur. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "hiç";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;

  return `${Math.floor(months / 12)} yıl önce`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}

/** Yüzde değişim — önceki dönem 0 ise null (oran tanımsız). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  manager: "Şirket Yetkilisi",
  operator: "Operatör",
  user: "Kullanıcı",
  sofor: "Şoför",
};

export const ROLE_CLASSES: Record<UserRole, string> = {
  manager: "bg-primary/10 text-primary ring-primary/20",
  operator: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  user: "bg-muted text-muted-foreground ring-border",
  sofor: "bg-muted text-muted-foreground ring-border",
};

export const PLAN_LABELS: Record<PlanType, string> = {
  free: "Ücretsiz",
  pro: "Profesyonel",
  fleet: "Filo",
};

export const HEALTH_LABELS: Record<AdminCompanyHealth, string> = {
  healthy: "Aktif",
  partial: "Yavaşlamış",
  empty: "Araç yok",
  dormant: "Uykuda",
};

export const HEALTH_CLASSES: Record<AdminCompanyHealth, string> = {
  healthy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  empty: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20",
  dormant: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
};

/** Ad-soyaddan baş harfler — avatar dairesi için. */
export function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toLocaleUpperCase("tr") ?? "")
      .join("") || "?"
  );
}

const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400",
];

export function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** Tenant ve admin denetim kayıtlarındaki `action` değerlerinin Türkçesi. */
export const ACTION_LABELS: Record<string, string> = {
  // tenant (audit_logs)
  role_changed: "Rol değiştirildi",
  vehicle_deleted: "Araç silindi",
  task_deleted: "Görev silindi",
  km_gap_closed: "Km farkı kapatıldı",
  invite_sent: "Davet gönderildi",
  invite_revoked: "Davet iptal edildi",
  invite_code_regenerated: "Davet kodu yenilendi",
  fine_created: "Ceza eklendi",
  fine_status_changed: "Ceza durumu değişti",
  fine_deleted: "Ceza silindi",
  fuel_record_created: "Yakıt kaydı eklendi",
  fuel_record_updated: "Yakıt kaydı güncellendi",
  fuel_record_deleted: "Yakıt kaydı silindi",
  // admin (admin_audit_log)
  user_role_changed: "Kullanıcı rolü değiştirildi",
  user_profile_updated: "Kullanıcı profili güncellendi",
  user_banned: "Kullanıcı askıya alındı",
  user_unbanned: "Kullanıcı askıdan çıkarıldı",
  user_email_confirmed: "E-posta doğrulandı",
  user_deleted: "Kullanıcı silindi",
  user_password_reset_link: "Şifre sıfırlama bağlantısı üretildi",
  user_magic_link: "Giriş bağlantısı üretildi",
  company_plan_changed: "Şirket planı değiştirildi",
  company_updated: "Şirket güncellendi",
  company_deleted: "Şirket silindi",
  email_broadcast_sent: "Duyuru e-postası gönderildi",
  notification_broadcast_sent: "Uygulama içi duyuru gönderildi",
  feedback_status_changed: "Geri bildirim durumu değişti",
  cron_triggered: "Cron işi elle çalıştırıldı",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
