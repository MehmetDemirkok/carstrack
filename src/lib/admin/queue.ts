import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminBroadcastEmail } from "@/lib/email/sendEmail";
import { getAppUrl } from "@/lib/email/emailTypes";

/**
 * Kuyruğa alınmış toplu duyuruların gönderimi.
 *
 * Neden kuyruk: Resend saniyede 2 istek kabul ediyor, yani 500 alıcı ≈ 4 dakika
 * — hiçbir serverless fonksiyon süresine güvenle sığmaz. Duyuru
 * `admin_email_queue`'ya yazılır, bu fonksiyon her çağrıldığında süre bütçesi
 * kadar alıcıya gönderip kalanı satırda bırakır. Cron tekrar tekrar çağırdıkça
 * kuyruk boşalır; hiçbir alıcı iki kez almaz çünkü gönderilenler
 * `pending_ids`'ten düşülür.
 */

export const BATCH_SIZE = 2;
export const BATCH_DELAY_MS = 1100;

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

  const result: DrainResult = { processedJobs: 0, sent: 0, failed: 0, remaining: 0 };

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

    // İşi "sending" işaretle — böylece panelde ilerlediği görülür.
    if (job.status !== "sending") {
      await db
        .from("admin_email_queue")
        .update({ status: "sending", started_at: job.started_at ?? new Date().toISOString() })
        .eq("id", jobId);
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

  return result;
}
