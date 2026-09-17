/**
 * Araç fotoğrafı URL'leri.
 *
 * Fotoğraflar private bir bucket'ta duruyor. Eskiden her sayfa yüklemesinde
 * `createSignedUrls` ile yeni bir imzalı URL üretiliyordu; token her seferinde
 * değiştiği için tarayıcı cache'i hiç tutmuyor, aynı fotoğraflar her ziyarette
 * baştan iniyordu. Artık storage yolu sabit bir proxy adresine çevriliyor
 * (`/api/vehicle-photo/...`) — yetki kontrolü sunucuda, URL sabit, cache çalışıyor.
 *
 * `?v=` yalnızca cache kırmak içindir: araç güncellendiğinde (fotoğraf
 * değiştirildiğinde de) değişir, böylece aynı yola yazılan yeni fotoğraf
 * tarayıcıda bayat kalmaz.
 */

export const VEHICLE_PHOTO_ROUTE = "/api/vehicle-photo";

/** Kart/liste görünümü için küçük boy, detay/büyütme için tam boy. */
export type PhotoVariant = "thumb" | "full";

/** Küçük boy dosyanın yolu: `.../image.jpg` → `.../image_thumb.jpg` */
export function thumbPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".");
  if (dot <= 0) return `${storagePath}_thumb`;
  return `${storagePath.slice(0, dot)}_thumb${storagePath.slice(dot)}`;
}

/** Bu değer proxy'nin ürettiği bir URL mi? (DB'ye geri yazılmamalı) */
export function isProxyPhotoUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(`${VEHICLE_PHOTO_ROUTE}/`);
}

/** Storage yolunu proxy URL'ine çevirir. */
export function photoUrl(storagePath: string, version?: string | number): string {
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  const v = version ? `?v=${encodeURIComponent(String(version))}` : "";
  return `${VEHICLE_PHOTO_ROUTE}/${encoded}${v}`;
}

/**
 * Hazır bir proxy URL'inin küçük boy karşılığını verir. Küçük boy dosya
 * yoksa route tam boya düşer, bu yüzden çağrı yerinde kontrol gerekmez.
 */
export function photoVariantUrl(url: string | undefined, variant: PhotoVariant): string | undefined {
  if (!url || variant === "full" || !isProxyPhotoUrl(url)) return url;
  const [path, query] = url.split("?");
  return `${thumbPath(path)}${query ? `?${query}` : ""}`;
}
