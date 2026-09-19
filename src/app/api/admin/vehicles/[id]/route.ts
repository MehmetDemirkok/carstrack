export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, uniqueIds } from "@/lib/admin/api";
import type { AdminVehicleDetail } from "@/lib/admin/types";

/**
 * Tek aracın destek dökümü: kimlik bilgileri, şirketi, sürücüleri, belgeleri,
 * servis/sefer/yakıt/ceza/bildirim geçmişi.
 *
 * `image*` alanları BİLEREK seçilmiyor: fotoğrafı panelde göstermiyoruz ve eski
 * satırlar hâlâ base64 data-URI taşıyor olabilir (bkz. db.ts "Araç fotoğrafları").
 * Ağırlık `admin_vehicle_weights` view'ından, SQL tarafında hesaplanmış gelir.
 */
export const GET = withAdmin<{ id: string }>(async (_req, { db, params }) => {
  const vehicleId = params.id;

  const { data: vehicle, error } = await db
    .from("vehicles")
    // Tek satır olmalı: parçalı ("a" + "b") select'te Supabase tip çıkarımı çalışmıyor.
    .select("id, company_id, plate, brand, model, year, color, mileage, fuel_type, transmission, chassis_no, ownership_type, rent_company, insurance_company, insurance_expiry, kasko_company, kasko_expiry, inspection_expiry, last_service_date, last_service_mileage, next_service_mileage, notes, created_at, updated_at")
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) throw new Error(`vehicles: ${error.message}`);
  if (!vehicle) return NextResponse.json({ error: "Araç bulunamadı" }, { status: 404 });

  const companyId = (vehicle.company_id as string) ?? null;

  const [
    companyRes,
    assignmentsRes,
    documentsRes,
    servicesRes,
    tripsRes,
    fuelRes,
    finesRes,
    reportsRes,
    weightRes,
  ] = await Promise.all([
    companyId
      ? db.from("companies").select("id, name").eq("id", companyId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("vehicle_assignments").select("driver_id").eq("vehicle_id", vehicleId),
    db
      .from("vehicle_documents")
      .select("id, title, type, file_name, file_size, expiry_date, created_at")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("service_records")
      .select("id, date, type, title, mileage, service_center, cost")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: false })
      .limit(15),
    // vehicle_tasks bir görev listesi değil, sefer/km kaydıdır (start_km → end_km).
    db
      .from("vehicle_tasks")
      .select("id, driver_id, start_km, end_km, distance, description, status, start_time")
      .eq("vehicle_id", vehicleId)
      .order("start_time", { ascending: false })
      .limit(15),
    db
      .from("fuel_records")
      .select("id, fueled_at, liters, total_amount, odometer, station_name")
      .eq("vehicle_id", vehicleId)
      .order("fueled_at", { ascending: false })
      .limit(15),
    db
      .from("traffic_fines")
      .select("id, fine_date, amount, status, violation_type")
      .eq("vehicle_id", vehicleId)
      .order("fine_date", { ascending: false })
      .limit(15),
    db
      .from("vehicle_reports")
      .select("id, title, category, severity, status, created_at")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(15),
    db
      .from("admin_vehicle_weights")
      .select("inline_bytes, inline_count, stored_count")
      .eq("id", vehicleId)
      .maybeSingle(),
  ]);

  // Ağırlık view'ı migration uygulanmadıysa yoktur — panel yine çalışır.
  if (weightRes.error) {
    console.warn(`[admin/vehicles] admin_vehicle_weights okunamadı: ${weightRes.error.message}`);
  }

  // Sefer ve atama satırlarındaki sürücü adları tek sorguda çözülür.
  const driverIds = uniqueIds([
    ...(assignmentsRes.data ?? []).map((a) => a.driver_id as string),
    ...(tripsRes.data ?? []).map((t) => t.driver_id as string),
  ]);
  const driversRes = driverIds.length
    ? await db.from("profiles").select("id, full_name, role").in("id", driverIds)
    : { data: [], error: null };
  const driverById = new Map(
    (driversRes.data ?? []).map((p) => [
      p.id as string,
      { fullName: (p.full_name as string) || "İsimsiz", role: (p.role as string) || "user" },
    ]),
  );

  const assignedIds = uniqueIds((assignmentsRes.data ?? []).map((a) => a.driver_id as string));
  const company = companyRes.data as { id: string; name: string } | null;

  const detail: AdminVehicleDetail = {
    id: vehicleId,
    plate: (vehicle.plate as string) || "—",
    brand: (vehicle.brand as string) || "",
    model: (vehicle.model as string) || "",
    year: (vehicle.year as number) ?? null,
    color: (vehicle.color as string) || "",
    mileage: (vehicle.mileage as number) ?? 0,
    fuelType: (vehicle.fuel_type as string) || "",
    transmission: (vehicle.transmission as string) || "",
    chassisNo: (vehicle.chassis_no as string) || "",
    ownershipType: (vehicle.ownership_type as string) || "",
    rentCompany: (vehicle.rent_company as string) || "",
    companyId,
    companyName: company?.name ?? "—",
    insuranceCompany: (vehicle.insurance_company as string) || "",
    insuranceExpiry: (vehicle.insurance_expiry as string) ?? null,
    kaskoCompany: (vehicle.kasko_company as string) || "",
    kaskoExpiry: (vehicle.kasko_expiry as string) ?? null,
    inspectionExpiry: (vehicle.inspection_expiry as string) ?? null,
    lastServiceDate: (vehicle.last_service_date as string) ?? null,
    lastServiceMileage: (vehicle.last_service_mileage as number) ?? 0,
    nextServiceMileage: (vehicle.next_service_mileage as number) ?? 0,
    notes: (vehicle.notes as string) || "",
    createdAt: vehicle.created_at as string,
    updatedAt: (vehicle.updated_at as string) ?? null,
    inlineBytes: (weightRes.data?.inline_bytes as number) ?? 0,
    inlineCount: (weightRes.data?.inline_count as number) ?? 0,
    storedCount: (weightRes.data?.stored_count as number) ?? 0,
    drivers: assignedIds.map((id) => ({
      id,
      fullName: driverById.get(id)?.fullName ?? "İsimsiz",
      role: driverById.get(id)?.role ?? "user",
    })),
    documents: (documentsRes.data ?? []).map((d) => ({
      id: d.id as string,
      title: (d.title as string) || (d.file_name as string) || "Adsız belge",
      type: (d.type as string) || "diger",
      fileName: (d.file_name as string) || "",
      fileSize: (d.file_size as number) ?? null,
      expiryDate: (d.expiry_date as string) ?? null,
      createdAt: d.created_at as string,
    })),
    services: (servicesRes.data ?? []).map((r) => ({
      id: r.id as string,
      date: (r.date as string) ?? null,
      type: (r.type as string) || "",
      title: (r.title as string) || "",
      serviceCenter: (r.service_center as string) || "",
      cost: r.cost === null || r.cost === undefined ? null : Number(r.cost),
      mileage: (r.mileage as number) ?? 0,
    })),
    trips: (tripsRes.data ?? []).map((t) => ({
      id: t.id as string,
      driverName: driverById.get(t.driver_id as string)?.fullName ?? "—",
      startKm: (t.start_km as number) ?? 0,
      endKm: (t.end_km as number) ?? null,
      distance: (t.distance as number) ?? null,
      description: (t.description as string) || "",
      status: (t.status as string) || "",
      startTime: t.start_time as string,
    })),
    fuelRecords: (fuelRes.data ?? []).map((f) => ({
      id: f.id as string,
      fueledAt: (f.fueled_at as string) ?? null,
      liters: Number(f.liters ?? 0),
      totalAmount: Number(f.total_amount ?? 0),
      odometer: (f.odometer as number) ?? 0,
      stationName: (f.station_name as string) || "",
    })),
    fines: (finesRes.data ?? []).map((f) => ({
      id: f.id as string,
      fineDate: (f.fine_date as string) ?? null,
      amount: Number(f.amount ?? 0),
      status: (f.status as string) || "",
      violationType: (f.violation_type as string) || "",
    })),
    reports: (reportsRes.data ?? []).map((r) => ({
      id: r.id as string,
      title: (r.title as string) || "Başlıksız",
      category: (r.category as string) || "other",
      severity: (r.severity as string) || "medium",
      status: (r.status as string) || "open",
      createdAt: r.created_at as string,
    })),
  };

  return NextResponse.json(detail);
});
