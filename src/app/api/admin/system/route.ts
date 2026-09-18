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

const COUNTED_TABLES = [
  "companies",
  "profiles",
  "vehicles",
  "service_records",
  "vehicle_documents",
  "vehicle_tasks",
  "vehicle_assignments",
  "vehicle_reports",
  "fuel_records",
  "traffic_fines",
  "kilometer_logs",
  "notifications",
  "feedback",
  "company_invites",
  "audit_logs",
  "push_subscriptions",
] as const;

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
  const [counts, backupsRes, emailLog7Res, emailLog30Res, lastEmailRes] = await Promise.all([
    Promise.all(
      COUNTED_TABLES.map(async (table) => {
        const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
        return { table, rows: error ? -1 : (count ?? 0) };
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
  ]);

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
    crons: CRON_JOBS.map((c) => ({ ...c })),
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
