/**
 * Profil fotoğrafı yolları (bkz. 20261122_profile_avatars_bucket.sql).
 *
 * profiles.avatar_url üç biçimde olabilir:
 *   - Storage yolu:  "<company_id>/<user_id>/<ts>.jpg"  → proxy URL'ine çevrilir
 *   - data-URI:      eski kayıtlar (migration öncesi) → olduğu gibi gösterilir
 *   - http(s) URL:   olduğu gibi gösterilir
 *
 * Dosya adı her yüklemede değiştiği için proxy URL'i sabittir ve tarayıcıda
 * uzun süre cache'lenebilir; ayrıca ?v= gerekmez.
 */

export const AVATAR_BUCKET = "avatars";
export const AVATAR_ROUTE = "/api/avatar";

/** Storage'da duran bir yol mu? */
export function isStoredAvatarPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("data:") &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("blob:") &&
    !value.startsWith("/")
  );
}

/** DB değerini <img src> olarak kullanılabilir adrese çevirir. */
export function avatarDisplayUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  if (!isStoredAvatarPath(value)) return value;
  return `${AVATAR_ROUTE}/${value.split("/").map(encodeURIComponent).join("/")}`;
}
