import { Resend } from "resend";

/**
 * Resend istemcisi — tembel (lazy) singleton.
 *
 * Eski `src/lib/resend.ts` modül import edilir edilmez `throw` ediyordu; bu,
 * RESEND_API_KEY tanımlı olmayan ortamlarda (yerel geliştirme, CI, build) onu
 * dolaylı import eden her sayfayı çökertme riski taşıyordu. Burada istemci
 * yalnızca gerçekten gönderim yapılacağı an oluşturulur ve anahtar yoksa
 * `null` döner — çağıran katman bunu "atlandı" olarak yönetir.
 */

let cached: Resend | null = null;

/** Resend yapılandırılmış mı? (anahtar var mı) */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Resend istemcisini döndürür; anahtar yoksa `null`.
 * Çağıran taraf null durumunu sessizce ele almalıdır (akışı kesmemeli).
 */
export function getResendClient(): Resend | null {
  if (!isEmailConfigured()) return null;
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}
