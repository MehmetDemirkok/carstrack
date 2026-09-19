import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron çalışmalarını `cron_runs` tablosuna kaydeden ince sarmalayıcı.
 *
 * Neden sarmalayıcı: her cron kendi yetki kontrolünü ve gövdesini zaten
 * yapıyor; buraya taşımak çalışan altı işi baştan yazmak olurdu. Bu sarmalayıcı
 * gövdeye HİÇ dokunmaz — yalnızca süreyi ölçer, yanıtı okur ve sonucu yazar.
 *
 * Kayıt en iyi çaba ilkesiyle yapılır: tablo yoksa (migration uygulanmadıysa)
 * veya yazma başarısızsa cron'un kendi sonucu asla bozulmaz.
 *
 * 401 kaydedilmez — o gerçek bir çalışma değil, yetkisiz bir istektir.
 */
export function withCronLogging(
  job: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const started = Date.now();
    const trigger = req.headers.get("x-admin-manual-run") === "1" ? "manual" : "scheduled";

    let response: Response;
    try {
      response = await handler(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await record(job, {
        trigger,
        status: "error",
        httpStatus: 500,
        durationMs: Date.now() - started,
        summary: {},
        error: message,
      });
      throw err;
    }

    if (response.status === 401) return response;

    // Gövdeyi okumak akışı tüketir; kaydı klonlanmış yanıttan çıkarıyoruz ki
    // çağırana giden yanıt olduğu gibi kalsın.
    let summary: Record<string, unknown> = {};
    let error: string | null = null;
    try {
      const parsed = (await response.clone().json()) as Record<string, unknown>;
      // Özet küçük kalsın: yalnızca sayısal/boolean/kısa metin alanlar.
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "number" || typeof value === "boolean") summary[key] = value;
        else if (typeof value === "string" && value.length <= 120) summary[key] = value;
      }
      if (typeof parsed.error === "string") error = parsed.error;
    } catch {
      summary = {};
    }

    await record(job, {
      trigger,
      status: response.ok ? "ok" : "error",
      httpStatus: response.status,
      durationMs: Date.now() - started,
      summary,
      error,
    });

    return response;
  };
}

interface CronRunEntry {
  trigger: string;
  status: "ok" | "error";
  httpStatus: number;
  durationMs: number;
  summary: Record<string, unknown>;
  error: string | null;
}

/** Asla throw etmez — kayıt tutamamak cron'u başarısız saymaz. */
async function record(job: string, entry: CronRunEntry): Promise<void> {
  try {
    const { error } = await createAdminClient().from("cron_runs").insert({
      job,
      trigger: entry.trigger,
      status: entry.status,
      http_status: entry.httpStatus,
      duration_ms: entry.durationMs,
      summary: entry.summary,
      error: entry.error,
    });
    if (error) console.warn(`[cron/record] ${job} kaydedilemedi: ${error.message}`);
  } catch (err) {
    console.warn(`[cron/record] ${job} kaydedilemedi:`, err);
  }
}
