export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToUser } from "@/lib/notify";
import { withCronLogging } from "@/lib/cron/record";
import { activeRows } from "@/lib/member-status";
import { isDriverRole, type DriverLicenseEntry } from "@/lib/types";
import { completionUrl, getMissingProfileFields } from "@/lib/profile-completeness";

/**
 * PROFİL TAMAMLAMA HATIRLATICISI
 *
 * Profilinde eksik bilgi (ad soyad, telefon, departman; sürücüde ehliyet no/sınıf/
 * geçerlilik tarihi) olan aktif kullanıcılara zil + push + e-posta ile
 * "Profilinizi tamamlayın" hatırlatması gönderir. Kural tek yerde:
 * src/lib/profile-completeness.ts (ayarlar sayfasındaki kartla aynı).
 *
 * Rahatsız etmemek için:
 *   - kayıttan sonra MIN_AGE_DAYS gün beklenir (önce kendisi doldurabilsin),
 *   - aynı kişiye en fazla MAX_REMINDERS kez, RESEND_AFTER_DAYS gün arayla,
 *   - push/e-posta "reminders" kategorisinde → kullanıcı tercihlerden kapatabilir.
 * Dedup için activation-nudge gibi `email_notification_log` yeniden kullanılır
 * (alert_id serbest metin — migration gerekmez). `?dry=1` gönderim yapmadan
 * aday listesini döndürür.
 */

const MIN_AGE_DAYS = 2;
const RESEND_AFTER_DAYS = 7;
const MAX_REMINDERS = 4;
const ALERT_ID = "profile:incomplete";
const DAY_MS = 86_400_000;

interface ProfileRow {
  id: string;
  company_id: string | null;
  role: string;
  full_name: string | null;
  /** 20261123_profile_phone.sql öncesinde yok (select("*") — sütun yoksa undefined). */
  phone?: string | null;
  department: string | null;
  license_number: string | null;
  licenses: DriverLicenseEntry[] | null;
  created_at: string;
}

function buildMessage(isDriver: boolean, labels: string[]) {
  const list = labels.join(", ");
  const why = isDriver
    ? "Ehliyet bilgileriniz eksiksiz olursa süresi dolmadan sizi zamanında uyarabiliriz."
    : "Bilgileriniz eksiksiz olursa ekibiniz sizi kolayca tanır ve kayıtlar doğru kişiyle eşleşir.";
  return {
    title: "📝 Profilinizi tamamlayın",
    body: `Eksik bilgileriniz var: ${list}. Birkaç dakikanızı ayırıp tamamlar mısınız? ${why}`,
    intro: `Profilinizde birkaç eksik bilgi kaldı. ${why} Tamamlamak bir dakikadan kısa sürer.`,
  };
}

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  // `*`: pasif üyeleri ele (bkz. member-status.ts — sütun adıyla seçilmez).
  const { data: rows, error } = await admin
    .from("profiles")
    .select("*")
    .not("company_id", "is", null);
  if (error) {
    console.error("[cron/profile-reminder] profiles error:", error);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  const now = Date.now();
  // phone sütunu henüz yoksa (migration uygulanmamış) herkes "telefon eksik"
  // sayılıp gereksiz hatırlatma almasın — telefonu kurala katma.
  const hasPhoneColumn = (rows ?? []).some((r) => "phone" in (r as Record<string, unknown>));
  const candidates = activeRows(rows as ProfileRow[] | null)
    .filter((p) => now - new Date(p.created_at).getTime() >= MIN_AGE_DAYS * DAY_MS)
    .map((p) => ({
      profile: p,
      missing: getMissingProfileFields({
        role: p.role,
        fullName: p.full_name,
        phone: p.phone,
        department: p.department,
        licenseNumber: p.license_number,
        licenses: p.licenses,
      }).filter((m) => hasPhoneColumn || m.key !== "phone"),
    }))
    .filter((c) => c.missing.length > 0);

  // Geçmiş gönderimler: adet + son tarih
  const history = new Map<string, { count: number; last: number }>();
  if (candidates.length > 0) {
    const { data: logs } = await admin
      .from("email_notification_log")
      .select("user_id, sent_at")
      .eq("alert_id", ALERT_ID)
      .in("user_id", candidates.map((c) => c.profile.id));
    for (const log of logs ?? []) {
      const h = history.get(log.user_id as string) ?? { count: 0, last: 0 };
      h.count += 1;
      h.last = Math.max(h.last, new Date(log.sent_at as string).getTime());
      history.set(log.user_id as string, h);
    }
  }

  const due = candidates.filter(({ profile }) => {
    const h = history.get(profile.id);
    if (!h) return true;
    return h.count < MAX_REMINDERS && now - h.last >= RESEND_AFTER_DAYS * DAY_MS;
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      incomplete: candidates.length,
      due: due.length,
      preview: due.slice(0, 50).map(({ profile, missing }) => ({
        userId: profile.id,
        role: profile.role,
        missing: missing.map((m) => m.key),
      })),
    });
  }

  let sent = 0;
  const logRows: { user_id: string; alert_id: string; severity: string }[] = [];
  for (const { profile, missing } of due) {
    const isDriver = isDriverRole(profile.role);
    const labels = missing.map((m) => m.label);
    const url = completionUrl(missing);
    const msg = buildMessage(isDriver, labels);

    try {
      await dispatchToUser(admin, profile.company_id!, profile.id, {
        type: "profile_incomplete",
        severity: "info",
        title: msg.title,
        body: msg.body,
        url,
        tag: `profile-incomplete-${profile.id}`,
        meta: { missing: missing.map((m) => m.key) },
        email: {
          subject: "CarsTrack — Profilinizi tamamlayın",
          title: "Profilinizi tamamlayın",
          emoji: "📝",
          intro: msg.intro,
          rows: missing.map((m) => ({ label: m.label, value: "Eksik" })),
          note: "Bu hatırlatmayı Ayarlar › Hatırlatıcılar seçeneğinden kapatabilirsiniz.",
          accent: "#6366f1",
          ctaUrl: url,
          ctaLabel: "Profilimi Tamamla",
        },
      });
      sent += 1;
      logRows.push({ user_id: profile.id, alert_id: ALERT_ID, severity: "info" });
    } catch (e) {
      console.error("[cron/profile-reminder] dispatch error:", e);
    }
  }

  if (logRows.length > 0) {
    const { error: logErr } = await admin.from("email_notification_log").insert(logRows);
    if (logErr) console.error("[cron/profile-reminder] log yazılamadı:", logErr);
  }

  console.info(`[cron/profile-reminder] eksik=${candidates.length} gönderilecek=${due.length} gönderildi=${sent}`);
  return NextResponse.json({ ok: true, incomplete: candidates.length, due: due.length, sent });
}

/** Her çalışma `cron_runs`'a yazılır — bkz. lib/cron/record.ts. */
export const GET = withCronLogging("profile-reminder", handler);
