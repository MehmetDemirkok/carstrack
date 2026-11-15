import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Araç kilometresinin tek doğruluk kaynağı.
 *
 * Görev bitirme, yakıt kaydı ve KM farkı kapatma gibi "yan etki olarak araç
 * km'sini ilerleten" bütün yollar bu fonksiyonu çağırır. Tarayıcı (db.ts) ve
 * sunucu (API route) istemcisiyle aynı şekilde çalışır.
 *
 * İlke: KM hiçbir zaman geriye alınmaz. Girilen km aracın kayıtlı km'sinden
 * büyük değilse hiçbir şey yapılmaz. Karşılaştırma veritabanında, tek bir
 * koşullu UPDATE ile yapılır; böylece aynı anda gelen iki güncellemede
 * küçük olan büyüğün üzerine yazamaz.
 *
 * mileage_updated_at bilerek burada YAZILMAZ: veritabanındaki
 * vehicles_set_mileage_updated_at trigger'ı km değiştiğinde onu kendisi
 * doldurur (bkz. 20261115_vehicle_mileage_updated_at.sql). Böylece migration
 * uygulanmamış bir ortamda da bu kod hatasız çalışır.
 *
 * Asla hata fırlatmaz: km senkronu ana işlemin (görev, yakıt kaydı) yan
 * etkisidir ve başarısız olması ana işlemi geri almamalıdır. Hata loglanır,
 * sonuç olarak false döner.
 *
 * Not: yöneticinin araç düzenleme ekranından km'yi elle düzeltmesi (düşürmek
 * dahil) bilerek bu fonksiyonun dışında kalır — o bir "düzeltme"dir, ilerletme
 * değil — ve updateVehicle üzerinden yapılır.
 */
export async function advanceVehicleMileage(
  supabase: SupabaseClient,
  params: {
    vehicleId: string;
    km: number;
    /** Verilirse güncelleme ayrıca bu şirkete kısıtlanır (RLS'e ek güvence). */
    companyId?: string;
    /** Log mesajlarında hangi akıştan çağrıldığını göstermek için. */
    source: string;
  },
): Promise<boolean> {
  const { vehicleId, km, companyId, source } = params;
  if (!vehicleId || !Number.isInteger(km) || km < 0) return false;

  try {
    let query = supabase
      .from("vehicles")
      .update({ mileage: km, updated_at: new Date().toISOString() })
      .eq("id", vehicleId)
      // Yalnızca ileri yönde: km boşsa ya da girilen değerden küçükse.
      .or(`mileage.is.null,mileage.lt.${km}`);
    if (companyId) query = query.eq("company_id", companyId);

    const { error } = await query;
    if (error) {
      console.error(`advanceVehicleMileage(${source}): araç KM güncellenemedi:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`advanceVehicleMileage(${source}): araç KM güncelleme hatası:`, err);
    return false;
  }
}

/** Bir araç tek görevde en fazla bu kadar km yapabilir. */
export const MAX_VEHICLE_TASK_KM = 1500;

/** Bu kadar günden eski km "bayat" sayılır ve arayüzde vurgulanır. */
export const STALE_MILEAGE_DAYS = 30;

/**
 * KM'nin ne kadar önce güncellendiğini Türkçe ve kısa olarak verir
 * ("bugün", "dün", "12 gün önce", "3 ay önce"). Tarih yoksa/geçersizse null.
 */
export function describeMileageAge(
  iso: string | undefined,
  now: Date = new Date(),
): { label: string; days: number; stale: boolean } | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
  let label: string;
  if (days === 0) label = "bugün";
  else if (days === 1) label = "dün";
  else if (days < 60) label = `${days} gün önce`;
  else if (days < 365) label = `${Math.floor(days / 30)} ay önce`;
  else label = `${Math.floor(days / 365)} yıl önce`;
  return { label, days, stale: days > STALE_MILEAGE_DAYS };
}

/** Tek bir girişte bundan büyük km artışı "şüpheli" sayılır ve onay istenir. */
export const SUSPICIOUS_MILEAGE_JUMP_KM = 20_000;

/**
 * Girilen km'nin aracın kayıtlı km'sine göre şüpheli olup olmadığını kontrol
 * eder. Şüpheliyse kullanıcıya gösterilecek Türkçe açıklamayı, değilse null
 * döner. Engellemez — arayüz "Yine de kaydet" onayı ister.
 *
 * - Düşüş: km'yi geriye almak neredeyse her zaman yazım hatasıdır (12.500
 *   yerine 125.000). Geçmiş tarihli servis kaydı gibi km'nin doğal olarak
 *   düşük olabileceği yerlerde `allowDecrease: true` verilir.
 * - Büyük artış: fazladan bir sıfır. Aracın kayıtlı km'si 0 ise (ilk giriş)
 *   kontrol edilmez.
 */
export function checkMileageChange(
  currentKm: number,
  newKm: number,
  opts: { allowDecrease?: boolean } = {},
): string | null {
  if (!Number.isFinite(newKm) || !Number.isFinite(currentKm)) return null;
  const fmt = (n: number) => n.toLocaleString("tr-TR");
  if (!opts.allowDecrease && newKm < currentKm) {
    return `Girdiğiniz km (${fmt(newKm)}), aracın kayıtlı km'sinden (${fmt(currentKm)}) ${fmt(currentKm - newKm)} km düşük. Km'yi geriye alıyorsunuz.`;
  }
  if (currentKm > 0 && newKm - currentKm > SUSPICIOUS_MILEAGE_JUMP_KM) {
    return `Girdiğiniz km (${fmt(newKm)}), aracın kayıtlı km'sinden (${fmt(currentKm)}) ${fmt(newKm - currentKm)} km fazla. Fazladan bir rakam yazılmış olabilir.`;
  }
  return null;
}

/** KM'si STALE_MILEAGE_DAYS günden eski olan araçlar, en eskisi önce. Tarihi bilinmeyenler dahil edilmez. */
export function getStaleMileageVehicles<T extends { mileageUpdatedAt?: string }>(
  vehicles: T[],
  now: Date = new Date(),
): { vehicle: T; days: number; label: string }[] {
  return vehicles
    .map((vehicle) => {
      const age = describeMileageAge(vehicle.mileageUpdatedAt, now);
      return age && age.stale ? { vehicle, days: age.days, label: age.label } : null;
    })
    .filter((x): x is { vehicle: T; days: number; label: string } => x !== null)
    .sort((a, b) => b.days - a.days);
}
