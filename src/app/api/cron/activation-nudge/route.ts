export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/sendEmail";
import { withCronLogging } from "@/lib/cron/record";

/**
 * AKTİVASYON HATIRLATICISI
 * ============================================================================
 * Diğer tüm cron'lar (fleet-alerts, license-alerts, kilometer-reminder) VERİ
 * VARSA çalışır. Yani kaydolup araç eklemeyen ya da araç ekleyip sigorta/muayene
 * tarihi girmeyen kullanıcı hiçbir e-posta almaz — ürün ona hiçbir değer teslim
 * etmez ve sessizce kaybedilir.
 *
 * Bu cron tam olarak o boşluğu kapatır: takılıp kalmış hesabı tespit edip
 * bir sonraki adımı hatırlatır.
 *
 * Dedup için mevcut `email_notification_log` tablosu yeniden kullanılır
 * (alert_id serbest metin olduğu için migration gerekmez).
 */

/** Aynı hatırlatma en fazla bu sıklıkla tekrarlanır. */
const RESEND_AFTER_DAYS = 14;
/** Bir kullanıcıya aynı hatırlatmadan en fazla bu kadar gönderilir — sonra susarız. */
const MAX_NUDGES = 3;
/** Kayıttan sonra ilk hatırlatma için beklenecek süre. */
const MIN_AGE_DAYS_NO_VEHICLE = 1;
/** Araç eklendikten sonra "tarih gir" hatırlatması için beklenecek süre. */
const MIN_AGE_DAYS_NO_DATE = 3;
/** Bu yaştan eski, hiç hareket görmemiş hesapları rahat bırak. */
const MAX_AGE_DAYS = 120;

const ALERT_NO_VEHICLE = "activation:no-vehicle";
const ALERT_NO_DATE = "activation:no-date";

const DAY_MS = 86_400_000;

function getAppUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin;
}

function ageInDays(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / DAY_MS;
}

interface VehicleRow {
  id: string;
  company_id: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
  created_at: string;
  insurance_expiry: string | null;
  kasko_expiry: string | null;
  inspection_expiry: string | null;
  last_service_date: string | null;
}

/** Araçta hatırlatmayı tetikleyebilecek herhangi bir tarih var mı? */
function hasAlertableDate(v: VehicleRow): boolean {
  return Boolean(v.insurance_expiry || v.kasko_expiry || v.inspection_expiry || v.last_service_date);
}

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const appUrl = getAppUrl(req);
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  // ── 1. Veri ──────────────────────────────────────────────────────
  const [{ data: companies }, { data: profiles }, { data: vehicles }] = await Promise.all([
    admin.from("companies").select("id, name, created_at"),
    admin.from("profiles").select("id, company_id, role, full_name, notify_by_email"),
    admin
      .from("vehicles")
      .select(
        "id, company_id, plate, brand, model, created_at, insurance_expiry, kasko_expiry, inspection_expiry, last_service_date",
      ),
  ]);

  if (!companies || !profiles) {
    console.error("[cron/activation-nudge] temel veri yüklenemedi");
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }

  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) {
    console.error("[cron/activation-nudge] listUsers error:", usersErr);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
  const emailById = new Map(usersData.users.map((u) => [u.id, u.email ?? ""]));

  const vehiclesByCompany = new Map<string, VehicleRow[]>();
  for (const v of (vehicles ?? []) as VehicleRow[]) {
    const list = vehiclesByCompany.get(v.company_id) ?? [];
    list.push(v);
    vehiclesByCompany.set(v.company_id, list);
  }

  // ── 2. Takılmış hesapları tespit et ──────────────────────────────
  type Candidate = {
    userId: string;
    email: string;
    name: string;
    alertId: string;
    subject: string;
    title: string;
    intro: string;
    rows: { label: string; value: string }[];
    note: string;
    ctaUrl: string;
    ctaLabel: string;
  };

  const candidates: Candidate[] = [];

  for (const company of companies) {
    const companyAge = ageInDays(company.created_at as string, now);
    if (companyAge > MAX_AGE_DAYS) continue;

    const companyVehicles = vehiclesByCompany.get(company.id as string) ?? [];

    // Hesabı kuran / yönetenler — sürücüler araç ekleyemez, onlara gönderme.
    const managers = profiles.filter(
      (p) => p.company_id === company.id && p.role === "manager" && p.notify_by_email !== false,
    );
    if (managers.length === 0) continue;

    // ── Durum A: hiç araç eklenmemiş ──
    if (companyVehicles.length === 0) {
      if (companyAge < MIN_AGE_DAYS_NO_VEHICLE) continue;
      for (const m of managers) {
        const email = emailById.get(m.id as string);
        if (!email) continue;
        candidates.push({
          userId: m.id as string,
          email,
          name: (m.full_name as string) || email,
          alertId: ALERT_NO_VEHICLE,
          subject: "İlk aracını ekleyerek başlayalım",
          title: "Hesabın hazır, filon boş",
          intro:
            "CarsTrack hesabını açtın ama henüz araç eklemedin. İlk aracını eklemen yaklaşık iki dakika sürüyor — plaka, marka ve kilometre yeterli.",
          rows: [{ label: "Şirket", value: (company.name as string) || "—" }],
          note:
            "Aracını ekledikten sonra sigorta ve muayene tarihlerini girersen, süreler dolmadan önce seni otomatik olarak uyarmaya başlarız.",
          ctaUrl: `${appUrl}/dashboard`,
          ctaLabel: "İlk aracımı ekle",
        });
      }
      continue;
    }

    // ── Durum B: araç var ama hiçbirinde tarih yok → hiçbir cron çalışamaz ──
    const datedVehicles = companyVehicles.filter(hasAlertableDate);
    if (datedVehicles.length > 0) continue;

    const oldest = companyVehicles.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b,
    );
    if (ageInDays(oldest.created_at, now) < MIN_AGE_DAYS_NO_DATE) continue;

    const plateList = companyVehicles
      .map((v) => v.plate)
      .filter(Boolean)
      .slice(0, 5)
      .join(", ");

    for (const m of managers) {
      const email = emailById.get(m.id as string);
      if (!email) continue;
      candidates.push({
        userId: m.id as string,
        email,
        name: (m.full_name as string) || email,
        alertId: ALERT_NO_DATE,
        subject:
          companyVehicles.length === 1 && companyVehicles[0].plate
            ? `${companyVehicles[0].plate} için seni ne zaman uyaralım?`
            : "Araçların kayıtlı ama seni uyaramıyoruz",
        title: "Bir bilgi eksik",
        intro:
          companyVehicles.length === 1
            ? "Aracını eklemişsin, teşekkürler. Ama sigorta ve muayene bitiş tarihlerini girmediğin için sana hatırlatma gönderemiyoruz — CarsTrack'in asıl işi tam olarak bu."
            : "Araçlarını eklemişsin, teşekkürler. Ama hiçbirinde sigorta veya muayene bitiş tarihi yok; bu yüzden sana hatırlatma gönderemiyoruz.",
        rows: [
          { label: "Kayıtlı araç", value: String(companyVehicles.length) },
          ...(plateList ? [{ label: "Plakalar", value: plateList }] : []),
          { label: "Eksik bilgi", value: "Sigorta / muayene bitiş tarihi" },
        ],
        note:
          "Tarihleri girmen yarım dakika sürer. Girdiğin anda süre dolmadan 60 gün önce ilk uyarıyı, 14 gün kala acil uyarıyı göndermeye başlarız. Tarihler ruhsatında ve poliçende yazıyor.",
        ctaUrl: `${appUrl}/vehicles/${companyVehicles[0].id}`,
        ctaLabel: "Tarihleri ekle",
      });
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, checked: companies.length, sent: 0, note: "takılmış hesap yok" });
  }

  // ── 3. Dedup: sıklık ve toplam adet sınırı ───────────────────────
  const userIds = [...new Set(candidates.map((c) => c.userId))];
  const { data: logs } = await admin
    .from("email_notification_log")
    .select("user_id, alert_id, sent_at")
    .in("user_id", userIds)
    .in("alert_id", [ALERT_NO_VEHICLE, ALERT_NO_DATE])
    .order("sent_at", { ascending: false });

  const history = new Map<string, { count: number; last: Date }>();
  for (const log of logs ?? []) {
    const key = `${log.user_id}|${log.alert_id}`;
    const prev = history.get(key);
    if (prev) prev.count += 1;
    else history.set(key, { count: 1, last: new Date(log.sent_at as string) });
  }

  const toSend = candidates.filter((c) => {
    const h = history.get(`${c.userId}|${c.alertId}`);
    if (!h) return true;
    if (h.count >= MAX_NUDGES) return false;
    return (now.getTime() - h.last.getTime()) / DAY_MS >= RESEND_AFTER_DAYS;
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      checked: companies.length,
      candidates: candidates.length,
      wouldSend: toSend.map((c) => ({ email: c.email, alert: c.alertId, subject: c.subject })),
    });
  }

  // ── 4. Gönder ────────────────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  const logRows: { user_id: string; alert_id: string; severity: string }[] = [];

  for (const c of toSend) {
    const result = await sendNotificationEmail(c.email, c.subject, {
      recipientName: c.name,
      title: c.title,
      emoji: c.alertId === ALERT_NO_DATE ? "🔔" : "🚗",
      intro: c.intro,
      rows: c.rows,
      note: c.note,
      severity: "info",
      ctaUrl: c.ctaUrl,
      ctaLabel: c.ctaLabel,
      appUrl,
    });

    if (result.success) {
      sent += 1;
      logRows.push({ user_id: c.userId, alert_id: c.alertId, severity: "info" });
    } else if (!result.skipped) {
      failed += 1;
    }
  }

  if (logRows.length > 0) {
    const { error: logErr } = await admin.from("email_notification_log").insert(logRows);
    if (logErr) console.error("[cron/activation-nudge] log yazılamadı:", logErr);
  }

  console.info(`[cron/activation-nudge] aday=${candidates.length} gönderildi=${sent} hata=${failed}`);
  return NextResponse.json({ ok: true, checked: companies.length, candidates: candidates.length, sent, failed });
}

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
export const GET = withCronLogging("activation-nudge", handler);
