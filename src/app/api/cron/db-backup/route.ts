export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** vehicles tablosundaki base64 fotoğraflar yüzünden export uzun sürebilir. */
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/sendEmail";
import { BRAND } from "@/lib/email/emailTypes";
import { withCronLogging } from "@/lib/cron/record";

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
  "traffic_fines",
  "fuel_records",
] as const;

const BUCKET = "db-backups";
/** Varsayılan sayfa — küçük satırlar için yeterli. */
const DEFAULT_PAGE_SIZE = 200;
/**
 * vehicles.image* alanlarında base64 data-URI tutuluyor; 20 satır ~5 MB olabiliyor
 * ve Supabase/Kong Gateway Timeout (504) üretiyor. Bu yüzden çok küçük sayfa.
 */
const HEAVY_TABLE_PAGE_SIZE: Record<string, number> = {
  vehicles: 5,
  profiles: 50,
};
const RETENTION_DAYS = 60;
const MAX_PAGE_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 750;

type AdminClient = ReturnType<typeof createAdminClient>;

function pageSizeFor(table: string): number {
  return HEAVY_TABLE_PAGE_SIZE[table] ?? DEFAULT_PAGE_SIZE;
}

function isTransientBackupError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("gateway timeout") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("cloudflare") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("fetch failed") ||
    m.includes("econnreset") ||
    m.includes("socket hang up") ||
    m.includes("network")
  );
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchPage(
  admin: AdminClient,
  table: string,
  from: number,
  to: number,
): Promise<Record<string, unknown>[]> {
  let lastMessage = "unknown error";
  for (let attempt = 0; attempt <= MAX_PAGE_RETRIES; attempt++) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, to);

    if (!error) {
      return (data as Record<string, unknown>[] | null) ?? [];
    }

    lastMessage = error.message;
    const transient = isTransientBackupError(lastMessage);
    if (!transient || attempt === MAX_PAGE_RETRIES) break;

    const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
    console.warn(
      `[cron/db-backup] ${table} range ${from}-${to} geçici hata (deneme ${attempt + 1}/${MAX_PAGE_RETRIES + 1}): ${lastMessage} — ${delay}ms sonra tekrar`,
    );
    await wait(delay);
  }
  throw new Error(`${table}: ${lastMessage}`);
}

async function fetchAllRows(admin: AdminClient, table: string): Promise<Record<string, unknown>[]> {
  const pageSize = pageSizeFor(table);
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const page = await fetchPage(admin, table, from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
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
    intro: "Haftalık otomatik yedekleme cron'u hata verdi. Lütfen Vercel loglarını kontrol edin.",
    rows: [{ label: "Hata", value: message }],
    severity: "critical",
  }).catch((e) => console.error("[cron/db-backup] failure email gönderilemedi:", e));
}

async function handler(req: Request): Promise<Response> {
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
      const tableStarted = Date.now();
      const rows = await fetchAllRows(admin, table);
      dump[table] = rows;
      counts[table] = rows.length;
      console.log(
        `[cron/db-backup] ${table}: ${rows.length} satır (${Date.now() - tableStarted}ms)`,
      );
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
      intro: `Haftalık otomatik yedekleme başarıyla tamamlandı. Bu e-postaya dosya eklenmez; yedek yalnızca Supabase depolama alanında (${BUCKET}/${path}) saklanır.`,
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

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
export const GET = withCronLogging("db-backup", handler);
