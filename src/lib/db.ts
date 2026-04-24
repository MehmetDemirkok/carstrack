import { createClient } from "./supabase/client";
import type { Vehicle, ServiceRecord, Profile, VehicleAssignment } from "./types";

// ─── Mappers ──────────────────────────────────────────────────

function toVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id: row.id as string,
    plate: row.plate as string,
    brand: row.brand as string,
    model: row.model as string,
    year: row.year as number,
    color: (row.color as string) || "",
    image: (row.image as string) || "",
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

function toDbVehicle(v: Partial<Vehicle>, companyId?: string) {
  const obj: Record<string, unknown> = {};
  if (companyId !== undefined) obj.company_id = companyId;
  if (v.plate !== undefined) obj.plate = v.plate;
  if (v.brand !== undefined) obj.brand = v.brand;
  if (v.model !== undefined) obj.model = v.model;
  if (v.year !== undefined) obj.year = v.year;
  if (v.color !== undefined) obj.color = v.color;
  if (v.image !== undefined) obj.image = v.image;
  if (v.mileage !== undefined) obj.mileage = v.mileage;
  if (v.engineType !== undefined) obj.engine_type = v.engineType;
  if (v.engineVolume !== undefined) obj.engine_volume = v.engineVolume;
  if (v.power !== undefined) obj.power = v.power;
  if (v.fuelType !== undefined) obj.fuel_type = v.fuelType;
  if (v.transmission !== undefined) obj.transmission = v.transmission;
  if (v.chassisNo !== undefined) obj.chassis_no = v.chassisNo;
  if (v.tireStatus !== undefined) obj.tire_status = v.tireStatus;
  if (v.tireBrand !== undefined) obj.tire_brand = v.tireBrand;
  if (v.tireSize !== undefined) obj.tire_size = v.tireSize;
  if (v.tireInstallDate !== undefined) obj.tire_install_date = v.tireInstallDate || null;
  if (v.tireMileage !== undefined) obj.tire_mileage = v.tireMileage;
  if (v.batteryBrand !== undefined) obj.battery_brand = v.batteryBrand;
  if (v.batteryCapacity !== undefined) obj.battery_capacity = v.batteryCapacity;
  if (v.batteryInstallDate !== undefined) obj.battery_install_date = v.batteryInstallDate || null;
  if (v.insuranceCompany !== undefined) obj.insurance_company = v.insuranceCompany;
  if (v.insuranceExpiry !== undefined) obj.insurance_expiry = v.insuranceExpiry || null;
  if (v.inspectionExpiry !== undefined) obj.inspection_expiry = v.inspectionExpiry || null;
  if (v.lastServiceDate !== undefined) obj.last_service_date = v.lastServiceDate || null;
  if (v.lastServiceMileage !== undefined) obj.last_service_mileage = v.lastServiceMileage;
  if (v.nextServiceMileage !== undefined) obj.next_service_mileage = v.nextServiceMileage;
  if (v.maintenanceItems !== undefined) obj.maintenance_items = v.maintenanceItems;
  if (v.notes !== undefined) obj.notes = v.notes;
  return obj;
}

function toRecord(row: Record<string, unknown>): ServiceRecord {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    date: row.date as string,
    type: row.type as ServiceRecord["type"],
    title: row.title as string,
    mileage: row.mileage as number,
    serviceCenter: (row.service_center as string) || "",
    notes: (row.notes as string) || "",
    createdAt: row.created_at as string,
  };
}

// ─── Vehicles ─────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toVehicle);
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return toVehicle(data);
}

export async function addVehicle(
  data: Omit<Vehicle, "id" | "createdAt" | "updatedAt">,
  companyId: string
): Promise<Vehicle> {
  const supabase = createClient();
  const row = toDbVehicle(data, companyId);
  const { data: inserted, error } = await supabase
    .from("vehicles")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return toVehicle(inserted);
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<void> {
  const supabase = createClient();
  const row = { ...toDbVehicle(updates), updated_at: new Date().toISOString() };
  const { error } = await supabase.from("vehicles").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteVehicles(ids: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("vehicles").delete().in("id", ids);
  if (error) throw error;
}

// ─── Records ─────────────────────────────────────────────────

export async function getRecords(): Promise<ServiceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_records")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export async function getVehicleRecords(vehicleId: string): Promise<ServiceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_records")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export async function addRecord(
  data: Omit<ServiceRecord, "id" | "createdAt">,
  companyId: string
): Promise<ServiceRecord> {
  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from("service_records")
    .insert({
      vehicle_id: data.vehicleId,
      company_id: companyId,
      date: data.date,
      type: data.type,
      title: data.title,
      mileage: data.mileage,
      service_center: data.serviceCenter,
      notes: data.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return toRecord(inserted);
}

export async function deleteRecord(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("service_records").delete().eq("id", id);
  if (error) throw error;
}

// ─── Drivers / Profiles ──────────────────────────────────────

export async function getDrivers(): Promise<(Profile & { assignedVehicleId: string | null })[]> {
  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*, vehicle_assignments(vehicle_id)")
    .eq("role", "driver")
    .order("full_name");
  if (error) throw error;

  return (profiles ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    role: row.role as Profile["role"],
    fullName: row.full_name,
    createdAt: row.created_at,
    assignedVehicleId:
      Array.isArray(row.vehicle_assignments) && row.vehicle_assignments.length > 0
        ? (row.vehicle_assignments[0] as { vehicle_id: string }).vehicle_id
        : null,
  }));
}

// ─── Assignments ─────────────────────────────────────────────

export async function getAssignments(): Promise<VehicleAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("vehicle_assignments").select("*");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    assignedAt: row.assigned_at,
  }));
}

export async function getMyAssignment(): Promise<VehicleAssignment | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("vehicle_assignments")
    .select("*")
    .eq("driver_id", user.id)
    .single();
  if (error) return null;
  return {
    id: data.id,
    vehicleId: data.vehicle_id,
    driverId: data.driver_id,
    assignedAt: data.assigned_at,
  };
}

export async function assignVehicle(vehicleId: string, driverId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("vehicle_assignments").delete().eq("driver_id", driverId);
  const { error } = await supabase
    .from("vehicle_assignments")
    .insert({ vehicle_id: vehicleId, driver_id: driverId });
  if (error) throw error;
}

export async function unassignDriver(driverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vehicle_assignments")
    .delete()
    .eq("driver_id", driverId);
  if (error) throw error;
}
