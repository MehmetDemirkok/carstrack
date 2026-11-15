/**
 * Ekip üyesi pasifleştirme yardımcıları (bkz. 20261115b_member_deactivation.sql).
 *
 * Sorgular `deactivated_at` sütununu adıyla seçmez/filtrelemez, `*` ile gelen
 * satırda kontrol eder: migration henüz uygulanmamış bir veritabanında sütun
 * yoktur, adıyla istemek tüm sorguyu (ve bildirim akışını) düşürürdü. Sütun
 * yoksa herkes aktif sayılır — davranış eskisiyle birebir aynı kalır.
 */
export function isDeactivatedRow(row: unknown): boolean {
  if (!row || typeof row !== "object") return false;
  return !!(row as { deactivated_at?: unknown }).deactivated_at;
}

/** Yalnızca aktif (pasifleştirilmemiş) profil satırlarını döndürür. */
export function activeRows<T>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isDeactivatedRow(r));
}
