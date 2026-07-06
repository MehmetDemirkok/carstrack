export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToUser, dispatchToManagers } from "@/lib/notify";
import { getFlaggedEntries, daysUntilDate } from "@/lib/license";
import type { DriverLicenseEntry } from "@/lib/types";

// Kritik (süresi dolmuş) uyarılar 3, uyarı (yaklaşan) uyarılar 7 günde bir
// yeniden gönderilir — fleet-alerts cron'undaki SUPPRESSION_DAYS ile aynı mantık.
const SUPPRESSION_DAYS: Record<"critical" | "warning", number> = { critical: 3, warning: 7 };

interface DriverRow {
  id: string;
  company_id: string;
  full_name: string;
  licenses: DriverLicenseEntry[];
}

type FlaggedEntry = DriverLicenseEntry & { status: "expired" | "expiring" };

function formatEntryLine(e: FlaggedEntry): string {
  const days = daysUntilDate(e.expiryDate!);
  return e.status === "expired"
    ? `${e.class} sınıfı ${Math.abs(days)} gün önce doldu`
    : `${e.class} sınıfının süresine ${days} gün kaldı`;
}

async function isSuppressed(
  admin: ReturnType<typeof createAdminClient>,
  targetType: "driver" | "manager_digest",
  targetId: string,
  severity: "critical" | "warning",
): Promise<boolean> {
  const { data } = await admin
    .from("license_notification_log")
    .select("sent_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("sent_at", { ascending: false })
    .limit(1);

  const lastSentAt = data?.[0]?.sent_at as string | undefined;
  if (!lastSentAt) return false;
  const daysSince = (Date.now() - new Date(lastSentAt).getTime()) / 86_400_000;
  return daysSince < SUPPRESSION_DAYS[severity];
}

export async function GET(req: Request) {
  // ── Authorization ────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // ── Ehliyet bilgisi girilmiş tüm sürücüler ───────────────────
  const { data: drivers, error } = await admin
    .from("profiles")
    .select("id, company_id, full_name, licenses")
    .eq("role", "user");

  if (error) {
    console.error("[cron/license-alerts] profiles error:", error);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  const flagged: { driver: DriverRow; severity: "critical" | "warning"; entries: FlaggedEntry[] }[] = [];
  for (const row of (drivers ?? []) as DriverRow[]) {
    const entries = getFlaggedEntries(row.licenses);
    if (entries.length === 0) continue;
    flagged.push({
      driver: row,
      severity: entries.some((e) => e.status === "expired") ? "critical" : "warning",
      entries,
    });
  }

  // ── 1) Sürücüye bireysel bildirim (tüm sorunlu sınıfları tek mesajda toplar) ──
  let driverNotified = 0;
  for (const { driver, severity, entries } of flagged) {
    if (await isSuppressed(admin, "driver", driver.id, severity)) continue;

    const expired = severity === "critical";
    const title = expired ? "🚨 Ehliyetinizin Süresi Doldu" : "⏰ Ehliyetinizin Süresi Yaklaşıyor";
    const body = `${entries.map(formatEntryLine).join("; ")}. Lütfen yenileyin ve bilgilerinizi güncelleyin.`;

    await dispatchToUser(admin, driver.company_id, driver.id, {
      type: "license_expiry",
      severity,
      title,
      body,
      telegram: `${title}\n\n${body}`,
      url: "/settings",
      tag: `license-${driver.id}`,
      meta: { driverId: driver.id, classes: entries.map((e) => e.class) },
      email: {
        subject: `CarsTrack — ${title}`,
        title,
        emoji: expired ? "🚨" : "⏰",
        intro: body,
        rows: entries.map((e) => ({
          label: `${e.class} Sınıfı`,
          value: e.status === "expired"
            ? `${Math.abs(daysUntilDate(e.expiryDate!))} gün önce doldu`
            : `${daysUntilDate(e.expiryDate!)} gün kaldı`,
        })),
        accent: expired ? "#ef4444" : "#f59e0b",
        ctaUrl: "/settings",
        ctaLabel: "Ehliyet Bilgilerini Güncelle",
      },
    }).catch((e) => console.error("[cron/license-alerts] driver dispatch error:", e));

    await admin.from("license_notification_log").insert({ target_type: "driver", target_id: driver.id, severity });
    driverNotified++;
  }

  // ── 2) Şirket bazlı yönetici özeti ───────────────────────────
  const byCompany = new Map<string, { expired: number; expiring: number }>();
  for (const { driver, entries } of flagged) {
    const entry = byCompany.get(driver.company_id) ?? { expired: 0, expiring: 0 };
    if (entries.some((e) => e.status === "expired")) entry.expired++;
    else entry.expiring++;
    byCompany.set(driver.company_id, entry);
  }

  let managerNotified = 0;
  for (const [companyId, counts] of byCompany) {
    const severity: "critical" | "warning" = counts.expired > 0 ? "critical" : "warning";
    if (await isSuppressed(admin, "manager_digest", companyId, severity)) continue;

    const parts: string[] = [];
    if (counts.expired > 0) parts.push(`${counts.expired} kişinin ehliyetinin süresi doldu`);
    if (counts.expiring > 0) parts.push(`${counts.expiring} kişinin ehliyetinin süresi yaklaşıyor`);
    const body = `Ekibinizde ${parts.join(", ")}.`;
    const title = "🪪 Ekip Ehliyet Uyarısı";

    await dispatchToManagers(admin, companyId, {
      type: "license_expiry_team",
      severity,
      title,
      body,
      telegram: `${title}\n\n${body}`,
      url: "/users",
      tag: `license-team-${companyId}`,
      meta: { expiredCount: counts.expired, expiringCount: counts.expiring },
      email: {
        subject: `CarsTrack — ${title}`,
        title,
        emoji: "🪪",
        intro: body,
        rows: [
          ...(counts.expired > 0 ? [{ label: "Süresi Dolan", value: String(counts.expired) }] : []),
          ...(counts.expiring > 0 ? [{ label: "Süresi Yaklaşan", value: String(counts.expiring) }] : []),
        ],
        accent: counts.expired > 0 ? "#ef4444" : "#f59e0b",
        ctaUrl: "/users",
        ctaLabel: "Ekibi Görüntüle",
      },
    }).catch((e) => console.error("[cron/license-alerts] manager dispatch error:", e));

    await admin.from("license_notification_log").insert({ target_type: "manager_digest", target_id: companyId, severity });
    managerNotified++;
  }

  console.log(`[cron/license-alerts] done — flagged:${flagged.length} driverNotified:${driverNotified} companies:${byCompany.size} managerNotified:${managerNotified}`);
  return NextResponse.json({
    ok: true,
    driversFlagged: flagged.length,
    driverNotified,
    companiesFlagged: byCompany.size,
    managerNotified,
  });
}
