import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDeactivatedRow } from "@/lib/member-status";
import { advanceVehicleMileage, checkMileageChange } from "@/lib/mileage";
import { isDriverRole } from "@/lib/types";

/** Tek girişte kabul edilen en yüksek km (yazım hatasına karşı üst sınır). */
const MAX_KM = 3_000_000;

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * Aracın güncel km'sini kaydeder ya da "km değişmedi" onayı verir.
 * Body: `{ km: number, confirmed?: boolean }`
 *
 * - Yönetici/operatör: şirketin tüm araçları. Sürücü: yalnızca kendisine atanmış araçlar.
 * - Km geriye alınamaz (düzeltme araç düzenleme ekranından yapılır).
 * - Şüpheli büyük artış (bkz. checkMileageChange) `confirmed: true` olmadan
 *   kaydedilmez; 422 + uyarı metni döner, arayüz onay ister.
 * - Km aynıysa yalnızca mileage_confirmed_at yazılır ("km değişmedi").
 *   Km arttıysa mileage_updated_at'i veritabanı trigger'ı doldurur.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: vehicleId } = await params;

  let body: { km?: unknown; confirmed?: unknown };
  try { body = await req.json(); } catch { return fail("Geçersiz istek.", 400); }
  const km = typeof body.km === "number" ? body.km : NaN;
  if (!Number.isInteger(km) || km < 0 || km > MAX_KM) {
    return fail("Geçerli bir kilometre girin.", 400);
  }

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return fail("Unauthorized", 401);

  const admin = createAdminClient();
  const [{ data: profile }, { data: vehicle }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin.from("vehicles").select("id, company_id, plate, mileage").eq("id", vehicleId).maybeSingle(),
  ]);

  if (!profile || isDeactivatedRow(profile) || !profile.company_id) return fail("Bu işlem için yetkiniz yok.", 403);
  if (!vehicle || vehicle.company_id !== profile.company_id) return fail("Araç bulunamadı.", 404);

  if (isDriverRole(profile.role as string)) {
    const { data: assignment } = await admin
      .from("vehicle_assignments")
      .select("vehicle_id")
      .eq("vehicle_id", vehicleId)
      .eq("driver_id", user.id)
      .maybeSingle();
    if (!assignment) return fail("Bu araç size atanmamış.", 403);
  } else if (profile.role !== "manager" && profile.role !== "operator") {
    return fail("Bu işlem için yetkiniz yok.", 403);
  }

  const current = (vehicle.mileage as number | null) ?? 0;

  if (km < current) {
    return fail(
      isDriverRole(profile.role as string)
        ? `Girdiğiniz km kayıtlı km'den (${current.toLocaleString("tr-TR")}) düşük. Yanlışlık varsa yöneticinize bildirin.`
        : `Girdiğiniz km kayıtlı km'den (${current.toLocaleString("tr-TR")}) düşük. Düzeltmek için araç sayfasındaki "Düzenle"yi kullanın.`,
      409,
    );
  }

  const warning = checkMileageChange(current, km);
  if (warning && body.confirmed !== true) {
    return fail(warning, 422, { needsConfirm: true });
  }

  if (km > current) {
    const ok = await advanceVehicleMileage(admin, {
      vehicleId,
      km,
      companyId: profile.company_id as string,
      source: "mileageUpdate",
    });
    if (!ok) return fail("Kilometre kaydedilemedi, lütfen tekrar deneyin.", 500);
  }

  // Km aynı kaldıysa da (park halindeki araç) güncelliği belgele. Migration
  // (20261116_vehicle_mileage_confirmed_at) uygulanmamışsa sütun yoktur;
  // km kaydı yine başarılı sayılır.
  const confirmedAt = new Date().toISOString();
  const { error: confirmErr } = await admin
    .from("vehicles")
    .update({ mileage_confirmed_at: confirmedAt })
    .eq("id", vehicleId);
  if (confirmErr && confirmErr.code !== "42703" && confirmErr.code !== "PGRST204") {
    console.error("[vehicles/mileage] onay zamanı yazılamadı:", confirmErr);
  }

  return NextResponse.json({ ok: true, km: Math.max(km, current), changed: km > current, confirmedAt });
}
