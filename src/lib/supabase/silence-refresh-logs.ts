/**
 * Bayat refresh token loglarını sustur.
 *
 * Çerezdeki oturum süresi dolmuşsa `@supabase/ssr` sunucu istemcisi token'ı
 * yenilemeye çalışır. Refresh token artık geçerli değilse (kullanıcı başka
 * cihazda çıkış yapmış, oturum iptal edilmiş, token rotasyonunda yarış olmuş)
 * `@supabase/auth-js` hatayı ÇAĞIRANA DÖNDÜRMEDEN ÖNCE kendi içinde
 * `console.error(err)` ile basar — `GoTrueClient._emitInitialSession()`,
 * supabase-js'in kurucu metodunda kaydettiği iç dinleyici için çalışırken.
 * Sunucu logundaki "Invalid Refresh Token: Refresh Token Not Found" satırları
 * odur; bizim kodumuzdan gelmez ve hatayı yakalamakla susmaz.
 *
 * Bu durum bir arıza değil: proxy hatayı zaten görüyor, `sb-` çerezlerini
 * siliyor ve kullanıcıyı /login'e alıyor. Log satırı yalnızca gürültü olduğu
 * için burada süzülür. Süzgeç dar tutulur — yalnızca refresh token'a ait auth
 * hataları düşürülür, diğer her şey olduğu gibi yazılmaya devam eder.
 *
 * Yan etkisi modül yüklenir yüklenmez bir kez uygulanır; Supabase sunucu
 * istemcisini kuran her yer (proxy ve `server.ts`) bunu import eder.
 */

const REFRESH_ERROR_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "refresh_token_revoked",
]);

/** Yalnızca "refresh token geçersiz" anlamına gelen auth hatalarına true döner. */
function isStaleRefreshError(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const err = value as {
    __isAuthError?: unknown;
    code?: unknown;
    message?: unknown;
  };
  if (err.__isAuthError !== true) return false;
  if (typeof err.code === "string" && REFRESH_ERROR_CODES.has(err.code)) {
    return true;
  }
  return typeof err.message === "string" && /refresh token/i.test(err.message);
}

const globalScope = globalThis as typeof globalThis & {
  __carstrackRefreshLogsSilenced?: boolean;
};

if (!globalScope.__carstrackRefreshLogsSilenced) {
  globalScope.__carstrackRefreshLogsSilenced = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.length === 1 && isStaleRefreshError(args[0])) return;
    original(...args);
  };
}

export {};
