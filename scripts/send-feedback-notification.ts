/**
 * Tüm kayıtlı kullanıcılara tek seferlik geri bildirim isteme bildirimi
 * (uygulama içi zil + Web Push).
 *
 * Kullanım:
 *   npx tsx scripts/send-feedback-notification.ts --dry-run   # sadece listele
 *   npx tsx scripts/send-feedback-notification.ts --limit=5   # ilk 5 kişiye at
 *   npx tsx scripts/send-feedback-notification.ts             # herkese at
 *
 * Not: `notifications.company_id` zorunlu olduğundan yalnızca bir şirkete bağlı
 * kullanıcılara zil satırı yazılabilir; şirketsiz hesaplar atlanır.
 */
import { readFileSync } from "node:fs";

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Env, uygulama modüllerinden ÖNCE yüklenmeli: `push.ts` VAPID anahtarlarını
// modül import anında okur; statik import edilirse env boş kalır ve push atlanır.
const env = loadEnv(new URL("../.env.local", import.meta.url).pathname);
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : undefined;

const actorEmail =
  process.env.FEEDBACK_INBOX_EMAIL ??
  process.env.EMAIL_SUPPORT_ADDRESS ??
  process.env.ADMIN_EMAILS?.split(",")[0]?.trim() ??
  "admin@carstrack.app";

const TITLE = "CarsTrack'i birlikte geliştirelim";
const BODY =
  "Görüşleriniz bizim için değerli. Uygulamada en çok kullandığınız özellikler, zorlandığınız noktalar ve yeni fikirlerinizi bizimle paylaşır mısınız? Kısa bir geri bildirim bile yol haritamızı doğrudan etkiler.";
const LINK = "/feedback";

interface Target {
  userId: string;
  companyId: string;
}

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { dispatchAnnouncement } = await import("../src/lib/notify");
  const { isPushConfigured } = await import("../src/lib/push");

  const db = createAdminClient();

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, company_id")
    .not("company_id", "is", null);
  if (error) throw new Error(`profiles: ${error.message}`);

  const targets: Target[] = [];
  const seen = new Set<string>();
  for (const p of profiles ?? []) {
    const id = p.id as string;
    if (!p.company_id || seen.has(id)) continue;
    seen.add(id);
    targets.push({ userId: id, companyId: p.company_id as string });
  }

  console.log(
    `Geri bildirim bildirimi (dryRun=${dryRun}, pushConfigured=${isPushConfigured()})`,
  );
  console.log(`Hedef: ${targets.length} kullanıcı (şirketsiz hesaplar zaten hariç)`);

  const finalTargets = limit && Number.isFinite(limit) ? targets.slice(0, limit) : targets;

  if (dryRun) {
    for (const t of finalTargets.slice(0, 30)) {
      console.log(`  • user=${t.userId} company=${t.companyId}`);
    }
    if (finalTargets.length > 30) console.log(`  …ve ${finalTargets.length - 30} kişi daha`);
    console.log("dry-run bitti — hiçbir bildirim gönderilmedi.");
    return;
  }

  const result = await dispatchAnnouncement(db, finalTargets, {
    type: "admin_announcement",
    severity: "info",
    title: TITLE,
    body: BODY,
    url: LINK,
    meta: { source: "feedback-reminder" },
  });

  // Denetim kaydı (panel geçmişinde görünsün) — tablo yoksa sessizce geç.
  try {
    await db.from("admin_audit_log").insert({
      actor_email: actorEmail,
      action: "notification_broadcast_sent",
      target_type: "system",
      target_label: TITLE,
      meta: { source: "script", recipients: finalTargets.length, inApp: result.inApp, push: result.push },
    });
  } catch {
    // yok say
  }

  console.log(
    `Tamamlandı — zil: ${result.inApp}, push: ${result.push}, hedef: ${finalTargets.length}.`,
  );
  if (result.inApp === 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
