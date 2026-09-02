import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToManagers } from "@/lib/notify";

const FUEL_TYPE_LABELS: Record<string, string> = {
  motorin: "Motorin", benzin: "Benzin", lpg: "LPG", elektrik: "Elektrik",
};

/**
 * Yeni bir yakıt alımı eklenince şirketteki yönetici + operatörlere 3 kanaldan
 * (zil + push + e-posta) bilgi verir. Ayrıca kaydın tüketimi aracın geçmiş
 * ortalamasının şirket eşiğinin üzerindeyse ayrı bir "anormal tüketim" uyarısı,
 * KM geri gittiyse/aynı KM'deyse ayrı bir "veri tutarsızlığı" uyarısı gönderir.
 * Fire-and-forget.
 *
 *   POST /api/fuel/notify-new  { fuelRecordId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { fuelRecordId?: unknown };
    if (!body.fuelRecordId || typeof body.fuelRecordId !== "string") {
      return NextResponse.json({ ok: false, error: "fuelRecordId gerekli" }, { status: 400 });
    }

    const fromMeta = user.user_metadata?.company_id as string | undefined;
    let companyId = fromMeta ?? null;
    if (!companyId) {
      const { data: prof } = await supabase
        .from("profiles").select("company_id").eq("id", user.id).single();
      companyId = (prof?.company_id as string) ?? null;
    }
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 404 });
    }

    const admin = createAdminClient();

    const { data: metric, error: metricErr } = await admin
      .from("fuel_record_metrics")
      .select("*")
      .eq("id", body.fuelRecordId)
      .single();

    if (metricErr || !metric) {
      return NextResponse.json({ ok: false, error: "Kayıt bulunamadı" }, { status: 404 });
    }
    if ((metric.company_id as string) !== companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const plate = (metric.vehicle_plate as string) || "—";
    const vehicleName = `${metric.vehicle_brand ?? ""} ${metric.vehicle_model ?? ""}`.trim() || "araç";
    const fuelTypeLabel = FUEL_TYPE_LABELS[metric.fuel_type as string] || "Yakıt";
    const liters = Number(metric.liters) || 0;
    const totalAmount = Number(metric.total_amount) || 0;
    const odometer = Number(metric.odometer) || 0;
    const dateStr = metric.fueled_at
      ? new Date(metric.fueled_at as string).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";

    const results: unknown[] = [];

    // ── 1) Yeni yakıt alımı bilgisi (info) ──────────────────────────────
    results.push(await dispatchToManagers(admin, companyId, {
      type: "fuel_new",
      severity: "info",
      title: "⛽ Yakıt Alımı Eklendi",
      body: `${vehicleName} (${plate}) için ${liters.toLocaleString("tr-TR")} L ${fuelTypeLabel} — ₺${totalAmount.toLocaleString("tr-TR")}`,
      url: "/yakit/alimlar",
      tag: `fuel-${metric.id}`,
      vehicleId: (metric.vehicle_id as string) || undefined,
      vehiclePlate: plate,
      meta: { fuelRecordId: metric.id },
      email: {
        subject: `CarsTrack — Yakıt Alımı Eklendi (${plate})`,
        title: "Yakıt Alımı Eklendi",
        emoji: "⛽",
        intro: `${vehicleName} (${plate}) için yeni bir yakıt alımı kaydedildi.`,
        rows: [
          { label: "Araç", value: `${vehicleName} (${plate})` },
          { label: "Yakıt Türü", value: fuelTypeLabel },
          { label: "Litre", value: `${liters.toLocaleString("tr-TR")} L` },
          { label: "Tutar", value: `₺${totalAmount.toLocaleString("tr-TR")}` },
          { label: "Kilometre", value: `${odometer.toLocaleString("tr-TR")} km` },
          { label: "Tarih", value: dateStr },
        ],
        accent: "#f59e0b",
        ctaUrl: "/yakit/alimlar",
        ctaLabel: "Yakıt Alımlarını Görüntüle",
      },
    }));

    // ── 2) Veri tutarsızlığı: KM geri gitti / aynı KM ────────────────────
    const prevOdometer = metric.prev_odometer !== null && metric.prev_odometer !== undefined ? Number(metric.prev_odometer) : null;
    if (prevOdometer !== null && odometer <= prevOdometer) {
      results.push(await dispatchToManagers(admin, companyId, {
        type: "fuel_data_inconsistency",
        severity: "warning",
        title: "🚨 Yakıt Verisi Tutarsız",
        body: `${plate} için girilen KM (${odometer.toLocaleString("tr-TR")}), önceki yakıt kaydındaki KM'den (${prevOdometer.toLocaleString("tr-TR")}) düşük veya eşit. Lütfen kaydı kontrol edin.`,
        url: "/yakit/alimlar",
        tag: `fuel-inconsistency-${metric.id}`,
        vehicleId: (metric.vehicle_id as string) || undefined,
        vehiclePlate: plate,
        meta: { fuelRecordId: metric.id, odometer, prevOdometer },
        email: {
          subject: `CarsTrack — Yakıt Verisi Tutarsız (${plate})`,
          title: "Yakıt Verisi Tutarsız",
          emoji: "🚨",
          intro: `${vehicleName} (${plate}) için girilen kilometre bilgisi önceki yakıt kaydıyla tutarsız görünüyor. Bu kesin bir sonuç değil, kontrol edilmesi önerilen şüpheli bir kayıttır.`,
          rows: [
            { label: "Araç", value: `${vehicleName} (${plate})` },
            { label: "Yeni Kayıt KM", value: `${odometer.toLocaleString("tr-TR")} km` },
            { label: "Önceki Kayıt KM", value: `${prevOdometer.toLocaleString("tr-TR")} km` },
            { label: "Tarih", value: dateStr },
          ],
          accent: "#ef4444",
          ctaUrl: "/yakit/alimlar",
          ctaLabel: "Kaydı Kontrol Et",
        },
      }));
    }

    // ── 3) Anormal tüketim: aracın geçmiş ortalamasının eşik üzerinde ────
    const consumption = metric.consumption_l_100km !== null && metric.consumption_l_100km !== undefined ? Number(metric.consumption_l_100km) : null;
    if (consumption !== null) {
      const [{ data: stats }, { data: company }] = await Promise.all([
        admin.from("fuel_vehicle_stats").select("avg_consumption, purchase_count").eq("vehicle_id", metric.vehicle_id as string).maybeSingle(),
        admin.from("companies").select("fuel_anomaly_threshold_pct").eq("id", companyId).single(),
      ]);

      const avgConsumption = stats?.avg_consumption !== null && stats?.avg_consumption !== undefined ? Number(stats.avg_consumption) : null;
      const purchaseCount = Number(stats?.purchase_count) || 0;
      const thresholdPct = Number(company?.fuel_anomaly_threshold_pct) || 15;

      if (avgConsumption && avgConsumption > 0 && purchaseCount >= 3) {
        const diffPct = ((consumption - avgConsumption) / avgConsumption) * 100;
        if (diffPct > thresholdPct) {
          results.push(await dispatchToManagers(admin, companyId, {
            type: "fuel_anomaly",
            severity: diffPct >= thresholdPct * 2.5 ? "critical" : "warning",
            title: "⚠️ Anormal Yakıt Tüketimi",
            body: `${plate} son yakıt alımında normal ortalamasının %${Math.round(diffPct)} üzerinde tüketim gösterdi.`,
            url: `/vehicles/${metric.vehicle_id}`,
            tag: `fuel-anomaly-${metric.id}`,
            vehicleId: (metric.vehicle_id as string) || undefined,
            vehiclePlate: plate,
            meta: { fuelRecordId: metric.id, consumption, avgConsumption, diffPct },
            email: {
              subject: `CarsTrack — Anormal Yakıt Tüketimi (${plate})`,
              title: "Anormal Yakıt Tüketimi",
              emoji: "⚠️",
              intro: `${vehicleName} (${plate}) son yakıt alımında normal ortalamasının %${Math.round(diffPct)} üzerinde tüketim gösterdi. Olası nedenler: agresif sürüş, uzun süre rölanti, lastik basıncı, bakım ihtiyacı veya yakıt kaydı hatası olabilir.`,
              rows: [
                { label: "Araç", value: `${vehicleName} (${plate})` },
                { label: "Son Tüketim", value: `${consumption.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L/100km` },
                { label: "Normal Ortalama", value: `${avgConsumption.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} L/100km` },
                { label: "Fark", value: `+%${Math.round(diffPct)}` },
              ],
              accent: "#f59e0b",
              ctaUrl: `/vehicles/${metric.vehicle_id}`,
              ctaLabel: "Aracı Görüntüle",
            },
          }));
        }
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("POST /api/fuel/notify-new error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
