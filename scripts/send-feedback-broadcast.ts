/**
 * Tüm kayıtlı kullanıcılara tek seferlik geri bildirim isteme e-postası.
 *
 * Kullanım:
 *   npx tsx scripts/send-feedback-broadcast.ts --dry-run        # sadece listele
 *   npx tsx scripts/send-feedback-broadcast.ts --test           # yalnızca destek adresine at
 *   npx tsx scripts/send-feedback-broadcast.ts --limit=5        # ilk 5 kişiye at (güvenli deneme)
 *   npx tsx scripts/send-feedback-broadcast.ts                  # herkese at
 *
 * Varsayılan olarak `notify_by_email = false` diyenleri ve doğrulanmamış
 * adresleri atlar (admin panelindeki "Tüm kullanıcılar" segmentiyle aynı).
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

// Env, uygulama modüllerinden ÖNCE yüklenmeli: `emailTypes.ts` içindeki
// `BRAND.fromAddress` process.env'i modül import anında okur. Modüller env
// yüklendikten sonra `main()` içinde dinamik import edilir; aksi halde gönderen
// adres `onboarding@resend.dev`'e düşer ve Resend yalnızca hesap sahibine izin verir.
const env = loadEnv(new URL("../.env.local", import.meta.url).pathname);
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

type AdminDb = ReturnType<typeof import("../src/lib/supabase/admin").createAdminClient>;

const dryRun = process.argv.includes("--dry-run");
const testOnly = process.argv.includes("--test");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : undefined;

const supportEmail =
  process.env.FEEDBACK_INBOX_EMAIL ??
  process.env.EMAIL_SUPPORT_ADDRESS ??
  "mehmetdemirkok@gmail.com";

const SUBJECT = "CarsTrack — deneyiminizi bizimle paylaşır mısınız?";
const TITLE = "CarsTrack'i birlikte geliştirelim";
const BODY = [
  "CarsTrack'i kullandığınız için teşekkür ederiz. Ürünü sizin için daha iyi hale getirmek istiyoruz; bu yüzden görüşleriniz bizim için çok değerli.",
  "",
  "- En çok hangi özellikleri kullanıyorsunuz?",
  "- Eksik ya da zorlandığınız bir nokta var mı?",
  "- Yeni görmek istediğiniz bir özellik var mı?",
  "",
  "Kısa bir geri bildirim bile yol haritamızı doğrudan etkiler. Bu e-postayı yanıtlamanız yeterli; dilerseniz uygulamadaki üst menüde yer alan geri bildirim butonundan geri bildirim sayfasına giderek de yazabilirsiniz.",
].join("\n");
const CTA_LABEL = "Geri Bildirim Gönder";
const SIGNATURE = "CarsTrack Ekibi";

interface Recipient {
  userId: string;
  email: string;
  fullName: string;
}

/** `auth.users`'ı sayfalayarak id → e-posta/doğrulama haritası çıkarır. */
async function listAuthUsers(
  db: AdminDb,
): Promise<Map<string, { email: string; confirmed: boolean }>> {
  const map = new Map<string, { email: string; confirmed: boolean }>();
  const PAGE = 1000;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`auth.listUsers: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      const row = u as unknown as {
        id: string;
        email?: string | null;
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
      };
      map.set(row.id, {
        email: row.email ?? "",
        confirmed: Boolean(row.email_confirmed_at ?? row.confirmed_at),
      });
    }
    if (users.length < PAGE) break;
  }
  return map;
}

async function resolveRecipients(
  db: AdminDb,
): Promise<{ recipients: Recipient[]; optedOut: number; unconfirmed: number }> {
  const [{ data: profiles, error }, authUsers] = await Promise.all([
    db.from("profiles").select("id, full_name, notify_by_email"),
    listAuthUsers(db),
  ]);
  if (error) throw new Error(`profiles: ${error.message}`);

  let optedOut = 0;
  let unconfirmed = 0;
  const recipients: Recipient[] = [];

  for (const p of profiles ?? []) {
    const au = authUsers.get(p.id as string);
    if (!au?.email || !au.confirmed) {
      unconfirmed++;
      continue;
    }
    if (p.notify_by_email === false) {
      optedOut++;
      continue;
    }
    recipients.push({
      userId: p.id as string,
      email: au.email,
      fullName: (p.full_name as string) || "",
    });
  }

  // Aynı adres birden çok profile bağlıysa tek sefer gönder.
  const seen = new Set<string>();
  const unique = recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));

  return { recipients: unique, optedOut, unconfirmed };
}

function firstName(fullName: string, email: string): string | undefined {
  const first = fullName.trim().split(/\s+/)[0];
  return first || email.split("@")[0] || undefined;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { sendAdminBroadcastEmail } = await import("../src/lib/email/sendEmail");
  const { getAppUrl, BRAND } = await import("../src/lib/email/emailTypes");

  const appUrl = getAppUrl();
  const ctaUrl = `${appUrl}/feedback`;

  console.log(`Geri bildirim duyurusu (dryRun=${dryRun}, test=${testOnly}, appUrl=${appUrl})`);
  console.log(`Gönderen: ${BRAND.fromAddress}`);
  if (BRAND.fromAddress.includes("onboarding@resend.dev")) {
    console.error("HATA: RESEND_FROM_EMAIL çözülemedi; 'from' sandbox adresine düştü.");
    process.exit(1);
  }

  const db = createAdminClient();
  const { recipients, optedOut, unconfirmed } = await resolveRecipients(db);

  console.log(
    `Alıcı: ${recipients.length} kişi · opt-out atlanan: ${optedOut} · doğrulanmamış atlanan: ${unconfirmed}`,
  );

  let targets = recipients;
  if (testOnly) {
    targets = [{ userId: "test", email: supportEmail, fullName: "" }];
  } else if (limit && Number.isFinite(limit)) {
    targets = recipients.slice(0, limit);
  }

  if (dryRun) {
    for (const r of targets.slice(0, 50)) {
      console.log(`  • ${r.email}${r.fullName ? ` (${r.fullName})` : ""}`);
    }
    if (targets.length > 50) console.log(`  …ve ${targets.length - 50} kişi daha`);
    console.log("dry-run bitti — hiçbir e-posta gönderilmedi.");
    return;
  }

  const BATCH = 2; // Resend: saniyede 2 istek
  const DELAY_MS = 1100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((r) =>
        sendAdminBroadcastEmail({
          to: r.email,
          recipientName: firstName(r.fullName, r.email),
          subject: SUBJECT,
          title: TITLE,
          body: BODY,
          ctaUrl,
          ctaLabel: CTA_LABEL,
          signature: SIGNATURE,
          appUrl,
        }),
      ),
    );
    results.forEach((res, j) => {
      if (res.skipped) {
        console.warn(`  ! atlandı (RESEND_API_KEY yok): ${batch[j].email}`);
        return;
      }
      if (res.success) {
        sent++;
      } else {
        failed++;
        console.error(`  ✗ ${batch[j].email}: ${res.error ?? "bilinmeyen hata"}`);
      }
    });
    console.log(
      `İlerleme: ${Math.min(i + BATCH, targets.length)}/${targets.length} (ok:${sent} hata:${failed})`,
    );
    if (i + BATCH < targets.length) await wait(DELAY_MS);
  }

  // Gönderim geçmişine yaz (panelde görünsün) — tablo yoksa sessizce geç.
  try {
    await db.from("admin_email_log").insert({
      actor_email: supportEmail,
      segment: "all",
      segment_label: "Tüm kullanıcılar",
      subject: SUBJECT,
      body: BODY.slice(0, 20000),
      recipients: targets.slice(0, 200).map((r) => r.email),
      recipient_count: targets.length,
      sent_count: sent,
      failed_count: failed,
      is_test: false,
      error: null,
    });
  } catch {
    // yok say
  }

  console.log(`Tamamlandı — gönderilen: ${sent}, hata: ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
