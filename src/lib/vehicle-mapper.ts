import type { Vehicle, TrafficFine, TrafficFineStatus } from "./types";

// Saf mapper — DB snake_case satırını TypeScript Vehicle tipine dönüştürür.
// db.ts'deki toVehicle ile birebir aynı mantık; cron context'inde (session yok)
// kullanılabilmesi için buraya taşındı.
export function toVehicleFromRow(row: Record<string, unknown>): Vehicle {
  return {
    id: row.id as string,
    ownershipType: ((row.ownership_type as string) || "ozmal") as Vehicle["ownershipType"],
    rentCompany: (row.rent_company as string) || "",
    ruhsatSahibi: (row.ruhsat_sahibi as string) || "",
    plate: row.plate as string,
    brand: row.brand as string,
    model: row.model as string,
    year: row.year as number,
    color: (row.color as string) || "",
    image: (row.image as string) || "",
    image2: (row.image_2 as string) || "",
    image3: (row.image_3 as string) || "",
    image4: (row.image_4 as string) || "",
    imagePosition: (row.image_position as number) ?? 50,
    imagePositionX: (row.image_position_x as number) ?? 50,
    mileage: (row.mileage as number) || 0,
    engineType: (row.engine_type as string) || "",
    engineVolume: (row.engine_volume as string) || "",
    power: (row.power as string) || "",
    fuelType: (row.fuel_type as Vehicle["fuelType"]) || "Benzin",
    transmission: (row.transmission as Vehicle["transmission"]) || "Manuel",
    chassisNo: (row.chassis_no as string) || "",
    tireStatus: (row.tire_status as Vehicle["tireStatus"]) || "Yazlık",
    tireBrand: (row.tire_brand as string) || "",
    tireSize: (row.tire_size as string) || "",
    tireInstallDate: (row.tire_install_date as string) || "",
    tireMileage: (row.tire_mileage as number) || 0,
    batteryBrand: (row.battery_brand as string) || "",
    batteryCapacity: (row.battery_capacity as string) || "",
    batteryInstallDate: (row.battery_install_date as string) || "",
    insuranceCompany: (row.insurance_company as string) || "",
    insuranceExpiry: (row.insurance_expiry as string) || "",
    kaskoCompany: (row.kasko_company as string) || "",
    kaskoExpiry: (row.kasko_expiry as string) || "",
    greenCardCompany: (row.green_card_company as string) || "",
    greenCardExpiry: (row.green_card_expiry as string) || "",
    inspectionExpiry: (row.inspection_expiry as string) || "",
    lastServiceDate: (row.last_service_date as string) || "",
    lastServiceMileage: (row.last_service_mileage as number) || 0,
    nextServiceMileage: (row.next_service_mileage as number) || 0,
    maintenanceItems: (row.maintenance_items as Vehicle["maintenanceItems"]) || [],
    notes: (row.notes as string) || "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Saf mapper — db.ts'deki toTrafficFine ile birebir aynı mantık; cron
// context'inde (session yok) kullanılabilmesi için buraya taşındı.
export function toTrafficFineFromRow(row: Record<string, unknown>): TrafficFine {
  const vehicleData = row.vehicles as { plate?: string; brand?: string; model?: string } | null;
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    vehicleId: row.vehicle_id as string,
    driverId: (row.driver_id as string) || undefined,
    fineNumber: (row.fine_number as string) || "",
    violationType: (row.violation_type as string) || "",
    amount: Number(row.amount) || 0,
    discountedAmount: row.discounted_amount !== null && row.discounted_amount !== undefined
      ? Number(row.discounted_amount) : undefined,
    fineDate: row.fine_date as string,
    dueDate: (row.due_date as string) || undefined,
    location: (row.location as string) || undefined,
    status: (row.status as TrafficFineStatus) || "unpaid",
    paidAt: (row.paid_at as string) || undefined,
    photoPath: (row.photo_path as string) || undefined,
    notes: (row.notes as string) || "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    vehiclePlate: vehicleData?.plate ?? undefined,
    vehicleName: vehicleData
      ? `${vehicleData.brand ?? ""} ${vehicleData.model ?? ""}`.trim() || undefined
      : undefined,
  };
}
