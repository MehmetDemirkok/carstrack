import { createClient } from "./supabase/client";
import type { Vehicle, ServiceRecord, Profile, VehicleAssignment, VehicleTask, VehicleDocument } from "./types";

// ─── TTL data cache ───────────────────────────────────────────
// Keeps data in memory for 60 seconds so navigating between pages is instant.
const dataCache = new Map<string, { value: unknown; expiresAt: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

function getCached<T>(key: string): T | undefined {
  const entry = dataCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value as T;
  dataCache.delete(key);
  return undefined;
}

function setCached<T>(key: string, value: T): T {
  dataCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
  return value;
}

function bustCache(prefix: string) {
  for (const key of dataCache.keys()) {
    if (key.startsWith(prefix)) dataCache.delete(key);
  }
}

// ─── Auth helpers ─────────────────────────────────────────────

// Cached per-user. Always resolves the current session first so a logout +
// different user login in the same browser cannot leak data across companies.
let cachedCompanyId: string | null = null;
let cachedUserId: string | null = null;

export function clearCompanyCache() {
  cachedCompanyId = null;
  cachedUserId = null;
  dataCache.clear();
}

let companyIdPromise: Promise<string> | null = null;

export async function requireCompanyId(): Promise<string> {
  const supabase = createClient();

  // 1. Try local session first (no network call — reads from memory/cookie)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    clearCompanyCache();
    throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  }

  // 2. Return cached value if we're the same user
  if (cachedUserId === user.id && cachedCompanyId) {
    return cachedCompanyId;
  }

  // 3. Fast path: use company_id from user metadata (set during registration / auto-migrated)
  const metadataCompanyId = user.user_metadata?.company_id as string | undefined;
  if (metadataCompanyId) {
    cachedUserId = user.id;
    cachedCompanyId = metadataCompanyId;
    return metadataCompanyId;
  }

  // 4. Deduplicate concurrent calls
  if (companyIdPromise) return companyIdPromise;

  companyIdPromise = (async () => {
    try {
      console.log("requireCompanyId: Fetching profile from server API...");

      // Use server API route instead of client-side Supabase query
      // (client-side supabase.auth.getUser() hangs in the browser)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("/api/auth/profile", {
        signal: controller.signal,
        credentials: "same-origin",
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        clearCompanyCache();
        throw new Error("Şirket profili bulunamadı.");
      }

      const { profile } = await res.json();
      if (!profile?.companyId) {
        clearCompanyCache();
        throw new Error("Şirket profili bulunamadı.");
      }

      cachedUserId = user.id;
      cachedCompanyId = profile.companyId;

      // Auto-migrate company_id to metadata for future speed
      console.log("requireCompanyId: Auto-migrating company_id to metadata...");
      supabase.auth.updateUser({ data: { company_id: profile.companyId } })
        .catch((err: unknown) => console.error("Metadata migration failed:", err));

      return cachedCompanyId!;
    } finally {
      companyIdPromise = null;
    }
  })();

  return companyIdPromise;
}


// ─── Mappers ──────────────────────────────────────────────────

function toVehicle(row: Record<string, unknown>): Vehicle {
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
    imagePosition: (row.image_position as number) ?? 50,
    imagePositionX: (row.image_position_x as number) ?? 50,
    imageZoom: (row.image_zoom as number) ?? 100,
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

function toDbVehicle(v: Partial<Vehicle>, companyId?: string) {
  const obj: Record<string, unknown> = {};
  if (companyId !== undefined) obj.company_id = companyId;
  if (v.ownershipType !== undefined) obj.ownership_type = v.ownershipType;
  if (v.rentCompany !== undefined) obj.rent_company = v.rentCompany;
  if (v.ruhsatSahibi !== undefined) obj.ruhsat_sahibi = v.ruhsatSahibi;
  if (v.plate !== undefined) obj.plate = v.plate;
  if (v.brand !== undefined) obj.brand = v.brand;
  if (v.model !== undefined) obj.model = v.model;
  if (v.year !== undefined) obj.year = v.year;
  if (v.color !== undefined) obj.color = v.color;
  if (v.image !== undefined) obj.image = v.image;
  if (v.imagePosition !== undefined) obj.image_position = v.imagePosition;
  if (v.imagePositionX !== undefined) obj.image_position_x = v.imagePositionX;
  if (v.imageZoom !== undefined) obj.image_zoom = v.imageZoom;
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
  if (v.greenCardCompany !== undefined) obj.green_card_company = v.greenCardCompany;
  if (v.greenCardExpiry !== undefined) obj.green_card_expiry = v.greenCardExpiry || null;
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
  const companyId = await requireCompanyId();
  const cacheKey = `vehicles:${companyId}`;
  const cached = getCached<Vehicle[]>(cacheKey);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return setCached(cacheKey, (data ?? []).map(toVehicle));
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (error) return null;
  return toVehicle(data);
}

export async function addVehicle(
  data: Omit<Vehicle, "id" | "createdAt" | "updatedAt">
): Promise<Vehicle> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const row = toDbVehicle(data, companyId);
  const { data: inserted, error } = await supabase
    .from("vehicles")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  bustCache(`vehicles:${companyId}`);
  return toVehicle(inserted);
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const row = { ...toDbVehicle(updates), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("vehicles")
    .update(row)
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`vehicles:${companyId}`);
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`vehicles:${companyId}`);
}

export async function deleteVehicles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .in("id", ids)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`vehicles:${companyId}`);
}

// ─── Records ─────────────────────────────────────────────────

export async function getRecords(): Promise<ServiceRecord[]> {
  const companyId = await requireCompanyId();
  const cacheKey = `records:${companyId}`;
  const cached = getCached<ServiceRecord[]>(cacheKey);
  if (cached) return cached;
  try {
    const res = await fetch("/api/records", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Records fetch failed: ${res.status}`);
    const { records } = await res.json();
    return setCached(cacheKey, records ?? []);
  } catch (err) {
    console.error("getRecords server fetch failed, trying client fallback:", err);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("service_records")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false });
    if (error) throw error;
    return setCached(cacheKey, (data ?? []).map(toRecord));
  }
}

export async function getVehicleRecords(vehicleId: string): Promise<ServiceRecord[]> {
  const companyId = await requireCompanyId();
  const cacheKey = `vrecords:${companyId}:${vehicleId}`;
  const cached = getCached<ServiceRecord[]>(cacheKey);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_records")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("company_id", companyId)
    .order("date", { ascending: false });
  if (error) throw error;
  return setCached(cacheKey, (data ?? []).map(toRecord));
}

export async function addRecord(
  data: Omit<ServiceRecord, "id" | "createdAt">
): Promise<ServiceRecord> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
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
  bustCache(`records:${companyId}`);
  bustCache(`vrecords:${companyId}`);
  return toRecord(inserted);
}

export async function deleteRecord(id: string): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { error } = await supabase
    .from("service_records")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`records:${companyId}`);
  bustCache(`vrecords:${companyId}`);
}

// ─── Drivers / Profiles ──────────────────────────────────────

export async function getDrivers(): Promise<(Profile & { assignedVehicleIds: string[] })[]> {
  const companyId = await requireCompanyId();
  const cacheKey = `drivers:${companyId}`;
  const cached = getCached<(Profile & { assignedVehicleIds: string[] })[]>(cacheKey);
  if (cached) return cached;
  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*, vehicle_assignments(vehicle_id)")
    .eq("company_id", companyId)
    .eq("role", "driver")
    .order("full_name");
  if (error) throw error;

  return setCached(cacheKey, (profiles ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    companyId: row.company_id as string,
    role: row.role as Profile["role"],
    fullName: row.full_name as string,
    department: (row.department as string) || "",
    notifyByEmail: row.notify_by_email !== false,
    createdAt: row.created_at as string,
    assignedVehicleIds: Array.isArray(row.vehicle_assignments)
      ? (row.vehicle_assignments as { vehicle_id: string }[]).map((a) => a.vehicle_id)
      : [],
  })));
}

// ─── Assignments ─────────────────────────────────────────────

export async function getAssignments(): Promise<VehicleAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("vehicle_assignments").select("*");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    driverId: row.driver_id as string,
    assignedAt: row.assigned_at as string,
  }));
}

export async function getMyAssignments(): Promise<VehicleAssignment[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("vehicle_assignments")
    .select("*")
    .eq("driver_id", user.id);
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    driverId: row.driver_id as string,
    assignedAt: row.assigned_at as string,
  }));
}

export async function getMyVehicles(): Promise<Vehicle[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const cacheKey = `myvehicles:${userId}`;
  const cached = getCached<Vehicle[]>(cacheKey);
  if (cached) return cached;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role !== "driver") return getVehicles();

  try {
    const res = await fetch("/api/my-vehicles");
    if (!res.ok) return [];
    const json = await res.json() as { vehicles?: Record<string, unknown>[] };
    return setCached(cacheKey, (json.vehicles ?? []).map(toVehicle));
  } catch {
    return [];
  }
}

export async function assignVehicle(vehicleId: string, driverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vehicle_assignments")
    .insert({ vehicle_id: vehicleId, driver_id: driverId });
  if (error && error.code !== "23505") throw error; // ignore duplicate (same vehicle already assigned)
  bustCache("drivers:");
  bustCache(`myvehicles:${driverId}`);
}

export async function unassignVehicle(vehicleId: string, driverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vehicle_assignments")
    .delete()
    .eq("driver_id", driverId)
    .eq("vehicle_id", vehicleId);
  if (error) throw error;
  bustCache("drivers:");
  bustCache(`myvehicles:${driverId}`);
}

export async function getMembers(): Promise<Profile[]> {
  const companyId = await requireCompanyId();
  const cacheKey = `members:${companyId}`;
  const cached = getCached<Profile[]>(cacheKey);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("full_name");
  if (error) throw error;
  return setCached(cacheKey, (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    companyId: row.company_id as string,
    role: row.role as Profile["role"],
    fullName: row.full_name as string,
    department: (row.department as string) || "",
    notifyByEmail: row.notify_by_email !== false,
    createdAt: row.created_at as string,
  })));
}

export async function updateMemberProfile(
  memberId: string,
  updates: { fullName?: string; department?: string }
): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, string> = {};
  if (updates.fullName !== undefined) patch.full_name = updates.fullName;
  if (updates.department !== undefined) patch.department = updates.department;
  const { error } = await supabase.from("profiles").update(patch).eq("id", memberId);
  if (error) throw error;
  bustCache("members:");
}

export async function updateMemberRole(
  memberId: string,
  role: "manager" | "driver"
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", memberId);
  if (error) throw error;
  bustCache("members:");
}

export async function unassignDriver(driverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vehicle_assignments")
    .delete()
    .eq("driver_id", driverId);
  if (error) throw error;
}

// ─── Vehicle Tasks ────────────────────────────────────────────

function toTask(row: Record<string, unknown>): VehicleTask {
  const vehicleData = row.vehicles as { plate?: string; brand?: string; model?: string } | null;
  const profileData = row.profiles as { full_name?: string; department?: string } | null;
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    vehicleId: row.vehicle_id as string,
    driverId: row.driver_id as string,
    startKm: row.start_km as number,
    endKm: row.end_km != null ? (row.end_km as number) : undefined,
    distance: row.distance != null ? (row.distance as number) : undefined,
    description: (row.description as string) || "",
    status: row.status as VehicleTask["status"],
    startTime: row.start_time as string,
    endTime: row.end_time != null ? (row.end_time as string) : undefined,
    createdAt: row.created_at as string,
    vehiclePlate: vehicleData?.plate ?? undefined,
    vehicleName: vehicleData
      ? `${vehicleData.brand ?? ""} ${vehicleData.model ?? ""}`.trim() || undefined
      : undefined,
    driverName: profileData?.full_name ?? undefined,
    driverDepartment: profileData?.department || undefined,
  };
}

export async function getMyActiveTask(): Promise<VehicleTask | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("vehicle_tasks")
    .select("*, vehicles(plate, brand, model), profiles(full_name, department)")
    .eq("driver_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return toTask(data as Record<string, unknown>);
}

export async function getTasks(filters?: {
  vehicleId?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: "active" | "completed";
  department?: string;
}): Promise<VehicleTask[]> {
  const params = new URLSearchParams();
  if (filters?.vehicleId)   params.set("vehicleId",   filters.vehicleId);
  if (filters?.driverId)    params.set("driverId",    filters.driverId);
  if (filters?.dateFrom)    params.set("dateFrom",    filters.dateFrom);
  if (filters?.dateTo)      params.set("dateTo",      filters.dateTo);
  if (filters?.status)      params.set("status",      filters.status);
  if (filters?.department)  params.set("department",  filters.department);

  try {
    const res = await fetch(`/api/tasks?${params}`, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`);
    const { tasks } = await res.json();
    return tasks ?? [];
  } catch (err) {
    console.error("getTasks server fetch failed, trying client fallback:", err);
    const supabase = createClient();
    const companyId = await requireCompanyId();
    let query = supabase
      .from("vehicle_tasks")
      .select("*, vehicles(plate, brand, model), profiles(full_name, department)")
      .eq("company_id", companyId)
      .order("start_time", { ascending: false });

    if (filters?.vehicleId) query = query.eq("vehicle_id", filters.vehicleId);
    if (filters?.driverId)  query = query.eq("driver_id",  filters.driverId);
    if (filters?.dateFrom)  query = query.gte("start_time", filters.dateFrom);
    if (filters?.dateTo)    query = query.lte("start_time", `${filters.dateTo}T23:59:59`);
    if (filters?.status)    query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((r: unknown) => toTask(r as Record<string, unknown>));
  }
}

export async function startTask(data: {
  vehicleId: string;
  startKm: number;
  description: string;
}): Promise<VehicleTask> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Oturum bulunamadı.");

  const { data: inserted, error } = await supabase
    .from("vehicle_tasks")
    .insert({
      company_id: companyId,
      vehicle_id: data.vehicleId,
      driver_id: userId,
      start_km: data.startKm,
      description: data.description,
      status: "active",
      start_time: new Date().toISOString(),
    })
    .select("*, vehicles(plate, brand, model), profiles(full_name, department)")
    .single();

  if (error) throw error;
  return toTask(inserted as Record<string, unknown>);
}

export async function endTask(taskId: string, endKm: number): Promise<VehicleTask> {
  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("vehicle_tasks")
    .select("start_km")
    .eq("id", taskId)
    .eq("status", "active")
    .single();

  if (fetchErr || !existing) throw new Error("Aktif görev bulunamadı.");
  const distance = endKm - (existing.start_km as number);

  const { data: updated, error } = await supabase
    .from("vehicle_tasks")
    .update({
      end_km: endKm,
      distance,
      status: "completed",
      end_time: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("*, vehicles(plate, brand, model), profiles(full_name, department)")
    .single();

  if (error) throw error;
  return toTask(updated as Record<string, unknown>);
}

export async function createTaskAsManager(data: {
  vehicleId: string;
  driverId: string;
  startKm: number;
  description: string;
}): Promise<VehicleTask> {
  const supabase = createClient();
  const companyId = await requireCompanyId();

  const { data: inserted, error } = await supabase
    .from("vehicle_tasks")
    .insert({
      company_id: companyId,
      vehicle_id: data.vehicleId,
      driver_id: data.driverId,
      start_km: data.startKm,
      description: data.description,
      status: "active",
      start_time: new Date().toISOString(),
    })
    .select("*, vehicles(plate, brand, model), profiles(full_name, department)")
    .single();

  if (error) throw error;
  return toTask(inserted as Record<string, unknown>);
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vehicle_tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
}

// ─── Vehicle Documents ────────────────────────────────────────

function toDocument(row: Record<string, unknown>): VehicleDocument {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    vehicleId: row.vehicle_id as string,
    type: (row.type as VehicleDocument["type"]) || "diger",
    title: row.title as string,
    filePath: row.file_path as string,
    fileName: row.file_name as string,
    fileSize: row.file_size != null ? (row.file_size as number) : undefined,
    mimeType: (row.mime_type as string) || undefined,
    issueDate: (row.issue_date as string) || undefined,
    expiryDate: (row.expiry_date as string) || undefined,
    notes: (row.notes as string) || "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  const companyId = await requireCompanyId();
  const cacheKey = `vdocs:${companyId}:${vehicleId}`;
  const cached = getCached<VehicleDocument[]>(cacheKey);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicle_documents")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return setCached(cacheKey, (data ?? []).map(toDocument));
}

export async function addVehicleDocument(
  data: Omit<VehicleDocument, "id" | "createdAt" | "updatedAt">,
): Promise<VehicleDocument> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { data: inserted, error } = await supabase
    .from("vehicle_documents")
    .insert({
      company_id: companyId,
      vehicle_id: data.vehicleId,
      type: data.type,
      title: data.title,
      file_path: data.filePath,
      file_name: data.fileName,
      file_size: data.fileSize ?? null,
      mime_type: data.mimeType ?? null,
      issue_date: data.issueDate || null,
      expiry_date: data.expiryDate || null,
      notes: data.notes,
    })
    .select()
    .single();
  if (error) throw error;
  bustCache(`vdocs:${companyId}`);
  return toDocument(inserted);
}

export async function updateVehicleDocument(
  id: string,
  updates: Partial<Pick<VehicleDocument, "type" | "title" | "issueDate" | "expiryDate" | "notes">>,
): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.issueDate !== undefined) patch.issue_date = updates.issueDate || null;
  if (updates.expiryDate !== undefined) patch.expiry_date = updates.expiryDate || null;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  const { error } = await supabase
    .from("vehicle_documents")
    .update(patch)
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`vdocs:${companyId}`);
}

export async function deleteVehicleDocument(id: string, filePath: string): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { error: storageErr } = await supabase.storage
    .from("vehicle-documents")
    .remove([filePath]);
  if (storageErr) console.error("Storage delete (non-fatal):", storageErr);
  const { error } = await supabase
    .from("vehicle_documents")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`vdocs:${companyId}`);
}

export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("vehicle-documents")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadDocumentFile(
  vehicleId: string,
  file: File,
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const docId = crypto.randomUUID();
  const filePath = `${companyId}/${vehicleId}/${docId}.${ext}`;
  const { error } = await supabase.storage
    .from("vehicle-documents")
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { filePath, fileName: file.name, fileSize: file.size, mimeType: file.type };
}
