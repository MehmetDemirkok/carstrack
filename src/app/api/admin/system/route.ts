export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, daysAgoIso } from "@/lib/admin/api";
import { getAdminEmails } from "@/lib/admin/auth";
import { CRON_JOBS } from "@/lib/admin/crons";
import type { AdminSystemResponse } from "@/lib/admin/types";


const ENV_CHECKS: { key: string; required: boolean; hint: string }[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", required: true, hint: "Supabase proje URL'i" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, hint: "Tarayıcı istemcisi (RLS ile)" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, hint: "Sunucu tarafı, RLS baypas — bu panel buna dayanır" },
  { key: "NEXT_PUBLIC_APP_URL", required: true, hint: "E-posta bağlantılarının tabanı" },
  { key: "RESEND_API_KEY", required: true, hint: "Yoksa tüm e-posta gönderimi sessizce atlanır" },
  { key: "RESEND_FROM_EMAIL", required: true, hint: "Yoksa sandbox adresine düşer, sadece sana teslim eder" },
  { key: "CRON_SECRET", required: true, hint: "Cron uçlarının bearer koruması" },
  { key: "ADMIN_EMAILS", required: false, hint: "Bu panele erişebilecek adresler (yoksa FEEDBACK_INBOX_EMAIL)" },
  { key: "FEEDBACK_INBOX_EMAIL", required: false, hint: "Geri bildirim ve yanıt adresi" },
  { key: "VAPID_PRIVATE_KEY", required: false, hint: "Web push" },
  { key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", required: false, hint: "Web push" },
  { key: "ANTHROPIC_API_KEY", required: false, hint: "Belge okuma (ruhsat/poliçe)" },
  { key: "GOOGLE_AI_API_KEY", required: false, hint: "Belge okuma yedek sağlayıcı" },
];

/**
 * Satır sayısının yanında son 7 günlük artış da gösterilir: toplam sayı
 * Supabase panelinde zaten var, burada asıl merak edilen neyin büyüdüğü.
 * `time` sütunu olmayan/isabet etmeyen tabloda artış "—" görünür.
 */
const COUNTED_TABLES: { table: string; time: string | null }[] = [
  { table: "companies", time: "created_at" },
  { table: "profiles", time: "created_at" },
  { table: "vehicles", time: "created_at" },
  { table: "service_records", time: "created_at" },
  { table: "vehicle_documents", time: "created_at" },
  { table: "vehicle_tasks", time: "created_at" },
  { table: "vehicle_assignments", time: "created_at" },
  { table: "vehicle_reports", time: "created_at" },
  { table: "fuel_records", time: "created_at" },
  { table: "traffic_fines", time: "created_at" },
  { table: "notifications", time: "created_at" },
  { table: "feedback", time: "created_at" },
  { table: "company_invites", time: "created_at" },
  { table: "audit_logs", time: "created_at" },
  { table: "push_subscriptions", time: "created_at" },
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Sistem sağlığı: ortam değişkenleri, cron'lar, yedekler, tablo boyutları. */
export const GET = withAdmin(async (_req, { db }) => {
  const [counts, backupsRes, emailLog7Res, emailLog30Res, lastEmailRes, cronRunsRes] = await Promise.all([
    Promise.all(
      COUNTED_TABLES.map(async ({ table, time }) => {
        const [totalRes, recentRes] = await Promise.all([
          db.from(table).select("id", { count: "exact", head: true }),
          time
            ? db
                .from(table)
                .select("id", { count: "exact", head: true })
                .gte(time, daysAgoIso(7))
            : Promise.resolve({ count: null, error: null }),
        ]);
        return {
          table,
          rows: totalRes.error ? -1 : (totalRes.count ?? 0),
          last7d: recentRes.error ? null : recentRes.count,
        };
      }),
    ),
    db.storage.from("db-backups").list("", { limit: 20, sortBy: { column: "name", order: "desc" } }),
    db
      .from("email_notification_log")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", daysAgoIso(7)),
    db
      .from("email_notification_log")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", daysAgoIso(30)),
    db
      .from("email_notification_log")
      .select("sent_at")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Son 7 günün çalışmaları — her cron için özet buradan türetilir.
    db
      .from("cron_runs")
      .select("job, trigger, status, http_status, duration_ms, summary, error, created_at")
      .gte("created_at", daysAgoIso(7))
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  // cron_runs migration'ı uygulanmadıysa panel çalışmaya devam eder, geçmiş boş görünür.
  if (cronRunsRes.error) {
    console.warn(`[admin/system] cron_runs okunamadı: ${cronRunsRes.error.message}`);
  }
  const cronRuns = cronRunsRes.data ?? [];

  /** Bir işin son 7 gündeki durumu — en son çalışma + başarı/hata sayısı. */
  function healthOf(path: string) {
    const job = path.split("/").pop() ?? path;
    const runs = cronRuns.filter((r) => r.job === job);
    const last = runs[0];
    return {
      lastRunAt: (last?.created_at as string) ?? null,
      lastStatus: ((last?.status as string) ?? null) as "ok" | "error" | null,
      lastDurationMs: (last?.duration_ms as number) ?? null,
      lastError: (last?.error as string) ?? null,
      lastSummary: (last?.summary as Record<string, unknown>) ?? {},
      runs7d: runs.length,
      errors7d: runs.filter((r) => r.status === "error").length,
    };
  }

  const backups = (backupsRes.data ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => {
      const size = (f.metadata as { size?: number } | null)?.size ?? 0;
      return {
        name: f.name,
        sizeLabel: formatBytes(size),
        createdAt: (f.created_at as string) ?? (f.updated_at as string) ?? "",
      };
    });

  const payload: AdminSystemResponse = {
    env: ENV_CHECKS.map((e) => ({
      key: e.key,
      present: Boolean(process.env[e.key]),
      required: e.required,
      hint: e.hint,
    })),
    crons: CRON_JOBS.map((c) => ({ ...c, health: healthOf(c.path) })),
    backups,
    tables: counts,
    emailLog: {
      last7d: emailLog7Res.count ?? 0,
      last30d: emailLog30Res.count ?? 0,
      lastSentAt: (lastEmailRes.data?.sent_at as string) ?? null,
    },
    adminEmails: getAdminEmails(),
  };

  return NextResponse.json(payload);
});
