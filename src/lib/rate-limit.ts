// Hafif, bağımlılıksız rate limiter (sabit pencere, bellek-içi).
//
// NOT: Vercel serverless'te her instance kendi belleğini tutar; bu yüzden bu
// limiter brute-force/abuse'u TAMAMEN engellemez ama ciddi şekilde yavaşlatır
// ve maliyetli uç noktaları korur. Dağıtık ve kesin limit için Upstash Redis
// (@upstash/ratelimit) önerilir — bu yardımcı düşük riskli, sıfır-kurulumlu
// bir ilk savunma katmanıdır.

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Bellek sızıntısını önlemek için süresi dolan kovaları ara sıra temizle.
function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [key, b] of store) {
    if (b.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key     benzersiz anahtar (ör: `register:<ip>`)
 * @param limit   pencere başına izin verilen istek sayısı
 * @param windowMs pencere süresi (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** İstekten kaba bir istemci IP'si çıkarır (proxy başlıkları dahil). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
