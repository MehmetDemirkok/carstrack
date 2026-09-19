import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminBroadcastEmail } from "@/lib/email/sendEmail";
import { getAppUrl } from "@/lib/email/emailTypes";

/**
 * Kuyruğa alınmış toplu duyuruların gönderimi.
 *
 * Neden kuyruk: Resend saniyede 2 istek kabul ediyor, yani 500 alıcı ≈ 4 dakika
 * — hiçbir serverless fonksiyon süresine güvenle sığmaz. Duyuru
 * `admin_email_queue`'ya yazılır, bu fonksiyon her çağrıldığında süre bütçesi
 * kadar alıcıya gönderip kalanı satırda bırakır. Tekrar tekrar çağrıldıkça
 * kuyruk boşalır; hiçbir alıcı iki kez almaz çünkü gönderilenler
 * `pending_ids`'ten düşülür.
 *
 * Kim çağırıyor: Vercel Hobby planı cron'ları günde EN FAZLA bir kez
 * çalıştırıyor (beş dakikalık cron ifadesi deploy'u reddettiriyor), bu yüzden
 * kuyruk kendini sürdürüyor — duyuru sıraya girince `kickEmailQueueDrain` bir
 * çalışma başlatır, her çalışma işi bitmediyse bir sonrakini tetikler. Günlük
 * cron yalnızca emniyet ağıdır: zincir koparsa ya da ileri tarihli bir duyuru varsa devreye
 * girer (`/admin/system`'den elle de tetiklenebilir).
 */

export const BATCH_SIZE = 2;
export const BATCH_DELAY_MS = 1100;

/**
 * Bir işin "başkası işliyor" sayılacağı süre.
 *
 * `started_at` aynı zamanda kilittir: çalışma işi kapınca damgalanır, pasın
 * sonunda `null`'a çekilir. Fonksiyon ortasında ölen bir çalışma satırı kilitli
 * bırakır; bu süre dolduğunda bir sonraki çalışma işi devralır.
 */
const LEASE_MS = 3 * 60_000;

/** Zincir çağrısının yanıtı beklenmez — istek gitsin yeter. */
const KICK_TIMEOUT_MS = 5_000;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Alıcının ilk adı — "Merhaba Mehmet," selamlaması için. */
function firstName(fullName: string): string | undefined {
  const first = fullName.trim().split(/\s+/)[0];
  return first || undefined;
}

export interface DrainResult {
  processedJobs: number;
  sent: number;
  failed: number;
  remaining: number;
  /** Zamanı gelmiş başka iş kaldı mı — zincirin devam edip etmeyeceğini belirler. */
  hasMore: boolean;
}

/**
 * Zamanı gelmiş kuyruk işlerini verilen süre bütçesi kadar işler.
 *
 * `budgetMs` fonksiyonun kendi süre sınırının altında tutulmalıdır: bütçe
 * dolunca iş yarım bırakılır ama satır tutarlıdır — bir sonraki çağrı kaldığı
 * yerden devam eder.
 */
export async function drainEmailQueue(budgetMs: number): Promise<DrainResult> {
  const startedAt = Date.now();
  const db = createAdminClient();
  const appUrl = getAppUrl();

  const result: DrainResult = {
    processedJobs: 0,
    sent: 0,
    failed: 0,
    remaining: 0,
    hasMore: false,
  };

  const { data: jobs, error } = await db
    .from("admin_email_queue")
    .select("*")
    .in("status", ["pending", "sending"])
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);

  if (error) {
    // Migration uygulanmadıysa kuyruk yoktur; cron sessizce boş döner.
    console.warn(`[email-queue] kuyruk okunamadı: ${error.message}`);
    return result;
  }

  for (const job of jobs ?? []) {
    if (Date.now() - startedAt >= budgetMs) break;

    const jobId = job.id as string;
    const pendingIds = ((job.pending_ids as string[]) ?? []).slice();
    if (pendingIds.length === 0) {
      await db
        .from("admin_email_queue")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", jobId);
      continue;
    }

    // Kilidi hâlâ taze olan işe dokunma: başka bir çalışma (zincirin bir halkası
    // veya elle tetikleme) şu anda o işin alıcılarına gönderiyor olabilir.
    const lockedAt = job.started_at ? Date.parse(job.started_at as string) : null;
    if (lockedAt !== null && Date.now() - lockedAt < LEASE_MS) continue;

    // İşi kap: satır biz okuduğumuzdan beri değişmediyse bizimdir. Aynı anda
    // iki çalışma denerse yalnızca biri satır döndürür — diğeri işi atlar.
    // Aksi halde aynı alıcı iki kez e-posta alırdı.
    const claim = db
      .from("admin_email_queue")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", jobId);
    const { data: claimed } = await (
      job.started_at ? claim.eq("started_at", job.started_at) : claim.is("started_at", null)
    )
      .select("id")
      .maybeSingle();

    if (!claimed) {
      console.info(`[email-queue] ${jobId} — başka bir çalışma işliyor, atlandı.`);
      continue;
    }

    // Alıcı adı/adresi gönderim anında çözülür: kuyrukta beklerken kişi silinmiş
    // veya adresini değiştirmiş olabilir.
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name")
      .in("id", pendingIds.slice(0, 200));
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id as string, (p.full_name as string) || ""]),
    );

    const emailByIdEntries = await Promise.all(
      pendingIds.slice(0, 200).map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        return [id, data?.user?.email ?? null] as const;
      }),
    );
    const emailById = new Map(emailByIdEntries);

    const common = {
      subject: (job.subject as string) || (job.title as string),
      title: job.title as string,
      body: (job.body as string) || "",
      ctaUrl: (job.cta_url as string) || undefined,
      ctaLabel: (job.cta_label as string) || undefined,
      signature: (job.signature as string) || undefined,
      appUrl,
    };

    let sent = (job.sent_count as number) ?? 0;
    let failed = (job.failed_count as number) ?? 0;
    let index = 0;

    while (index < pendingIds.length && Date.now() - startedAt < budgetMs) {
      const batch = pendingIds.slice(index, index + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (id) => {
          const email = emailById.get(id);
          // Adresi çözülemeyen alıcı başarısız sayılır ve kuyruktan düşer;
          // aksi halde iş sonsuza kadar aynı kişide takılırdı.
          if (!email) return { success: false as const };
          return sendAdminBroadcastEmail({
            ...common,
            to: email,
            recipientName: firstName(nameById.get(id) ?? ""),
          });
        }),
      );

      for (const r of results) {
        if (r.success) sent++;
        else failed++;
      }

      index += batch.length;
      if (index < pendingIds.length) await wait(BATCH_DELAY_MS);
    }

    const stillPending = pendingIds.slice(index);
    const done = stillPending.length === 0;

    await db
      .from("admin_email_queue")
      .update({
        pending_ids: stillPending,
        sent_count: sent,
        failed_count: failed,
        status: done ? "done" : "sending",
        finished_at: done ? new Date().toISOString() : null,
        // Kilidi bırak: iş yarım kaldıysa sıradaki çalışma hemen devralabilsin.
        started_at: null,
      })
      .eq("id", jobId);

    result.processedJobs++;
    result.sent += sent - (((job.sent_count as number) ?? 0));
    result.failed += failed - (((job.failed_count as number) ?? 0));
    result.remaining += stillPending.length;

    console.info(
      `[email-queue] ${jobId} — gönderildi:${sent} hata:${failed} kalan:${stillPending.length}`,
    );
  }

  // Zamanı gelmiş iş kaldıysa zincir devam etmeli: bütçe dolduğu için yarım
  // bıraktığımız iş de, hiç sıra gelmeyen iş de buraya düşer.
  const { count } = await db
    .from("admin_email_queue")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "sending"])
    .lte("scheduled_at", new Date().toISOString());
  result.hasMore = (count ?? 0) > 0;

  return result;
}

/**
 * Kuyruk boşaltmayı bir sonraki çalışmaya devreder.
 *
 * Yanıt beklenmez; istek gönderildikten sonra bağlantı kapatılır — çağrılan
 * fonksiyon kendi başına çalışmaya devam eder. Çağıranın (duyuruyu kuyruğa alan
 * istek ya da zincirin bir önceki halkası) yanıtı bunu beklemesin diye
 * `after()` içinden çağrılmalıdır.
 */
export async function kickEmailQueueDrain(chain = 0): Promise<void> {
  if (!process.env.CRON_SECRET) {
    console.warn("[email-queue] CRON_SECRET yok — kuyruk kendini tetikleyemez.");
    return;
  }

  const url = `${getAppUrl()}/api/cron/email-queue-drain?chain=${chain}`;
  try {
    await fetch(url, {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
        // Zincir çağrıları `cron_runs`'a yazılmaz — bkz. cron route'u.
        "x-queue-chain": "1",
      },
      signal: AbortSignal.timeout(KICK_TIMEOUT_MS),
    });
  } catch {
    // Zaman aşımı beklenen sonuçtur: iş uzun sürüyor, biz yanıtı beklemiyoruz.
  }
}
