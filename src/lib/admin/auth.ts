import { createClient } from "@/lib/supabase/server";

/**
 * Süper admin (uygulama sahibi) yetkisi — TEK kaynak burasıdır.
 *
 * Yetki veritabanından DEĞİL, ortam değişkeninden okunur: böylece hiç kimse
 * (RLS açığı, ele geçirilmiş yönetici hesabı vb.) veriyi değiştirerek kendini
 * admin yapamaz. Panelin tamamı bu fonksiyonların arkasındadır.
 *
 * `ADMIN_EMAILS` virgülle ayrılmış liste kabul eder:
 *   ADMIN_EMAILS=mehmetdemirkok@gmail.com,ortak@carstrack.app
 */
const FALLBACK_ADMIN_EMAIL = "mehmetdemirkok@gmail.com";

/** Yetkili e-posta adresleri — hepsi küçük harfe normalize edilmiş. */
export function getAdminEmails(): string[] {
  const raw =
    process.env.ADMIN_EMAILS ??
    process.env.FEEDBACK_INBOX_EMAIL ??
    FALLBACK_ADMIN_EMAIL;

  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return list.length > 0 ? list : [FALLBACK_ADMIN_EMAIL];
}

/** Verilen e-posta süper admin listesinde mi? */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export interface AdminIdentity {
  id: string;
  email: string;
}

/**
 * Oturumdaki kullanıcıyı Supabase'e DOĞRULATARAK (getUser) admin olup
 * olmadığını belirler. Cookie'den okunan JWT'ye güvenmez.
 *
 * Admin değilse `null` döner — çağıran taraf 404/403 kararını kendi verir.
 */
export async function getSuperAdmin(): Promise<AdminIdentity | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email) return null;
    if (!isAdminEmail(user.email)) return null;

    return { id: user.id, email: user.email.toLowerCase() };
  } catch {
    return null;
  }
}
