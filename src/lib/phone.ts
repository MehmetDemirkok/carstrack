/**
 * Kullanıcı telefon numarası (profiles.phone) yardımcıları.
 *
 * Numara yalnızca iletişim amacıyla tutulur — SMS/arama ile doğrulama YOKTUR.
 * Bu yüzden kontrol yalnızca biçimseldir: yazım hatalarını yakalamak için
 * 10–15 rakam şartı aranır. Türkiye numaraları ("0532…", "532…", "90532…")
 * tek biçime (+905321234567) çevrilir; diğer ülkeler "+" ile yazılırsa olduğu
 * gibi (yalnızca rakamlar) saklanır.
 */

export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 15;

/** Ham girdiyi saklanacak biçime çevirir; geçersizse null. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);

  if (!hasPlus) {
    // Türkiye kısayolları: 0 5xx xxx xx xx · 5xx xxx xx xx · 90 5xx xxx xx xx
    if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10 && !digits.startsWith("0")) digits = `90${digits}`;
  }

  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) return null;
  return `+${digits}`;
}

export function isValidPhone(raw: unknown): boolean {
  return normalizePhone(raw) !== null;
}

/** Ekranda gösterim: +90 532 123 45 67 (TR), diğerleri olduğu gibi. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(value);
  return m ? `+90 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : value;
}

/** tel: bağlantısı için. */
export function phoneHref(value: string | null | undefined): string | undefined {
  return value ? `tel:${value.replace(/[^\d+]/g, "")}` : undefined;
}

export const PHONE_ERROR = "Geçerli bir telefon numarası girin (ör. 0532 123 45 67).";

/**
 * Migration (20261123_profile_phone.sql) uygulanmamış ortamda `phone` sütunu
 * yoktur; sütunu adıyla seçen/yazan sorgular bu hatayı alır ve telefonsuz
 * tekrar dener — uygulama migration'dan bağımsız çalışmaya devam eder.
 */
export function isMissingPhoneColumn(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error || error.code === "23514") return false; // biçim kısıtı ihlali ≠ sütun yok
  return error.code === "42703" || error.code === "PGRST204" || /phone/i.test(error.message ?? "");
}
