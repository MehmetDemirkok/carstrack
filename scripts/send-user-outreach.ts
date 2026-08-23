/**
 * Tek seferlik kullanıcı outreach e-postaları.
 * Kullanım: npx tsx scripts/send-user-outreach.ts [--dry-run]
 */
import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { render } from "@react-email/render";
import { sendNotificationEmail } from "../src/lib/email/sendEmail";
import { getAppUrl } from "../src/lib/email/emailTypes";
import { NotificationEmail } from "../src/emails/templates/Notification";

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

const env = loadEnv(new URL("../.env.local", import.meta.url).pathname);
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

const dryRun = process.argv.includes("--dry-run");
const renderOnly = process.argv.includes("--render-only");
const appUrl = getAppUrl();
const supportEmail =
  process.env.FEEDBACK_INBOX_EMAIL ??
  process.env.EMAIL_SUPPORT_ADDRESS ??
  "mehmetdemirkok@gmail.com";

const reEngagement = [
  {
    to: "dilay.altun@ulubol.com.tr",
    name: "Dilay",
    company: "Ulubol",
  },
  {
    to: "celalylmz34@gmail.com",
    name: "Celal",
    company: "Test A.ş",
  },
  {
    to: "tarhanayemek@hotmail.com",
    name: "Tarhana Danışma",
    company: "Tarhana",
  },
] as const;

const feedback = [
  {
    to: "sedat.gozuyilmaz@ulubol.com.tr",
    name: "Sedat",
  },
  {
    to: "hakan@tarhanayemek.com.tr",
    name: "Hakan",
  },
  {
    to: "mehmetdemirkok@gmail.com",
    name: "Mehmet Şükrü",
  },
] as const;

type Campaign = {
  key: string;
  to: string;
  name: string;
  subject: string;
  props: Parameters<typeof NotificationEmail>[0];
};

function buildCampaigns(): Campaign[] {
  return [
    ...reEngagement.map((user) => ({
      key: `re-${user.to.split("@")[0]}`,
      to: user.to,
      name: user.name,
      subject: "CarsTrack — filonuzu yönetmeye devam edin",
      props: {
        recipientName: user.name,
        title: "Sizi tekrar görmek isteriz",
        emoji: "👋",
        intro:
          "CarsTrack'e kayıt oldunuz ancak henüz filonuzu keşfetme fırsatınız olmamış olabilir. " +
          "Araçlarınızı ekleyerek bakım takibi, sigorta/muayene hatırlatmaları ve ekip davetlerini " +
          "tek panelden yönetebilirsiniz. Kurulumda takıldığınız bir nokta varsa size yardımcı olmaktan memnuniyet duyarız.",
        rows: [
          { label: "Araç ekleme", value: "Plaka, km, bakım geçmişi" },
          { label: "Otomatik uyarılar", value: "Sigorta, muayene, bakım" },
          { label: "Ekip", value: "Sürücü davet kodu ile ekleme" },
        ],
        note: `Sorularınız için ${supportEmail} adresine yazabilirsiniz.`,
        severity: "info" as const,
        ctaUrl: `${appUrl}/login`,
        ctaLabel: "CarsTrack'e Giriş Yap",
        appUrl,
      },
    })),
    ...feedback.map((user) => ({
      key: `fb-${user.to.split("@")[0]}`,
      to: user.to,
      name: user.name,
      subject: "CarsTrack — görüşleriniz bizim için değerli",
      props: {
        recipientName: user.name,
        title: "Deneyiminizi paylaşır mısınız?",
        emoji: "💬",
        intro:
          "CarsTrack'i kullandığınız için teşekkür ederiz. Ürünü sizin için daha iyi hale getirmek istiyoruz. " +
          "Neleri seviyorsunuz, neler zor geliyor veya eksik bulduğunuz bir özellik var mı? " +
          "Kısa bir geri bildirim bile yol haritamızı doğrudan etkiler.",
        rows: [
          { label: "Geri bildirim", value: "Bu e-postayı yanıtlayın" },
          { label: "Uygulama içi", value: "Ayarlar → Geri Bildirim" },
        ],
        note: `Doğrudan ${supportEmail} adresine yanıt verebilirsiniz — her mesajı okuyoruz.`,
        severity: "success" as const,
        ctaUrl: `${appUrl}/settings`,
        ctaLabel: "Ayarlara Git",
        appUrl,
      },
    })),
  ];
}

async function main() {
  const campaigns = buildCampaigns();
  console.log(`Outreach başlıyor (dryRun=${dryRun}, renderOnly=${renderOnly}, appUrl=${appUrl})`);

  if (renderOnly) {
    const rendered: Record<string, { to: string; subject: string; html: string; text: string }> = {};
    for (const c of campaigns) {
      rendered[c.key] = {
        to: c.to,
        subject: c.subject,
        html: await render(NotificationEmail(c.props)),
        text: await render(NotificationEmail(c.props), { plainText: true }),
      };
    }
    writeFileSync("/tmp/outreach-emails.json", JSON.stringify(rendered, null, 2));
    console.log("Rendered → /tmp/outreach-emails.json");
    return;
  }

  for (const campaign of campaigns) {
    if (dryRun) {
      console.log(`[dry-run] ${campaign.key} → ${campaign.to} (${campaign.name})`);
      continue;
    }

    const result = await sendNotificationEmail(campaign.to, campaign.subject, campaign.props);
    console.log(`${campaign.key} ${campaign.to}:`, result);
    await wait(600);
  }

  console.log("Tamamlandı.");
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
