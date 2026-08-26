export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/sendEmail";
import { BRAND } from "@/lib/email/emailTypes";

// Yeni bir migration ile tablo eklenirse buraya da eklenmeli — pg_dump yerine
// PostgREST üzerinden okuduğumuz için şema burada elle listelenir. Şema zaten
// supabase/migrations altında versiyonlu; bu yedek yalnızca VERİYİ kapsar.
const BACKUP_TABLES = [
  "companies",
  "profiles",
  "vehicles",
  "service_records",
  "vehicle_assignments",
  "email_notification_log",
  "vehicle_tasks",
  "subscriptions",
  "vehicle_documents",
  "vehicle_reports",
  "vehicle_report_logs",
  "push_subscriptions",
  "notifications",
  "feedback",
  "company_invites",
  "service_providers",
  "audit_logs",
  "license_notification_log",
  "kilometer_logs",
  "kilometer_log_tokens",
  "traffic_fines",
] as const;

const BUCKET = "db-backups";
const PAGE_SIZE = 1000;
const RETENTION_DAYS = 30;

type AdminClient = ReturnType<typeof createAdminClient>;

async function fetchAllRows(admin: AdminClient, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data as Record<string, unknown>[] | null) ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function cleanupOldBackups(admin: AdminClient): Promise<number> {
  const { data: files, error } = await admin.storage.from(BUCKET).list("backups", { limit: 1000 });
  if (error || !files) {
    console.error("[cron/db-backup] list error (cleanup atlandı):", error);
    return 0;
  }

  const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;
  const toDelete = files
    .filter((f) => {
      const match = /^(\d{4}-\d{2}-\d{2})\.json\.gz$/.exec(f.name);
      if (!match) return false;
      return new Date(`${match[1]}T00:00:00Z`).getTime() < cutoff;
    })
    .map((f) => `backups/${f.name}`);

  if (toDelete.length === 0) return 0;

  const { error: delErr } = await admin.storage.from(BUCKET).remove(toDelete);
  if (delErr) {
    console.error("[cron/db-backup] cleanup delete error:", delErr);
    return 0;
  }
  return toDelete.length;
}

const notifyRecipient = process.env.BACKUP_NOTIFY_EMAIL || BRAND.supportAddress;

async function notifyFailure(message: string): Promise<void> {
  await sendNotificationEmail(notifyRecipient, "CarsTrack — Veritabanı Yedeği BAŞARISIZ ⚠️", {
    title: "Veritabanı Yedeği Alınamadı",
    emoji: "⚠️",
    intro: "Günlük otomatik yedekleme cron'u hata verdi. Lütfen Vercel loglarını kontrol edin.",
    rows: [{ label: "Hata", value: message }],
    severity: "critical",
  }).catch((e) => console.error("[cron/db-backup] failure email gönderilemedi:", e));
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const startedAt = new Date();
  const dump: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  try {
    for (const table of BACKUP_TABLES) {
      const rows = await fetchAllRows(admin, table);
      dump[table] = rows;
      counts[table] = rows.length;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/db-backup] export error:", message);
    await notifyFailure(message);
    return NextResponse.json({ error: "backup export failed", detail: message }, { status: 500 });
  }

  const payload = JSON.stringify({ generatedAt: startedAt.toISOString(), tables: dump });
  const gzipped = gzipSync(Buffer.from(payload, "utf-8"));
  const dateStamp = startedAt.toISOString().slice(0, 10);
  const path = `backups/${dateStamp}.json.gz`;

  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, gzipped, {
    contentType: "application/gzip",
    upsert: true,
  });

  if (uploadErr) {
    console.error("[cron/db-backup] upload error:", uploadErr);
    await notifyFailure(`Storage yükleme hatası: ${uploadErr.message}`);
    return NextResponse.json({ error: "backup upload failed" }, { status: 500 });
  }

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
  const deleted = await cleanupOldBackups(admin);

  console.log(
    `[cron/db-backup] ok — tarih:${dateStamp} tablo:${BACKUP_TABLES.length} satır:${totalRows} boyut:${gzipped.byteLength}b silinen:${deleted}`,
  );

  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const storageUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/storage/buckets/${BUCKET}`
    : undefined;

  await sendNotificationEmail(
    notifyRecipient,
    `CarsTrack — Veritabanı Yedeği Alındı (${dateStamp})`,
    {
      title: "Veritabanı Yedeği Alındı",
      emoji: "✅",
      intro: `Günlük otomatik yedekleme başarıyla tamamlandı. Bu e-postaya dosya eklenmez; yedek yalnızca Supabase depolama alanında (${BUCKET}/${path}) saklanır.`,
      rows: [
        { label: "Tablo Sayısı", value: String(BACKUP_TABLES.length) },
        { label: "Toplam Satır", value: String(totalRows) },
        { label: "Dosya Boyutu", value: `${(gzipped.byteLength / 1024).toFixed(1)} KB` },
        { label: "Silinen Eski Yedek", value: String(deleted) },
      ],
      severity: "success",
      ...(storageUrl ? { ctaUrl: storageUrl, ctaLabel: "Supabase Depolamada Görüntüle" } : {}),
    },
  ).catch((e) => console.error("[cron/db-backup] success email gönderilemedi:", e));

  return NextResponse.json({
    ok: true,
    date: dateStamp,
    tables: BACKUP_TABLES.length,
    totalRows,
    sizeBytes: gzipped.byteLength,
    deletedOldBackups: deleted,
  });
}
