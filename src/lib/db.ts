import { createClient } from "./supabase/client";
import type {
  Vehicle, ServiceRecord, Profile, VehicleAssignment, VehicleTask, VehicleDocument,
  VehicleReport, VehicleReportLog, ReportStatus, ReportSeverity, ReportCategory,
  Feedback, FeedbackType,
} from "./types";

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
    image2: (row.image_2 as string) || "",
    image3: (row.image_3 as string) || "",
    image4: (row.image_4 as string) || "",
    imagePosition: (row.image_position as number) ?? 50,
    imagePositionX: (row.image_position_x as number) ?? 50,
    imageZoom: (row.image_zoom as number) ?? 100,
    sortOrder: (row.sort_order as number) ?? undefined,
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
  if (v.image2 !== undefined) obj.image_2 = v.image2;
  if (v.image3 !== undefined) obj.image_3 = v.image3;
  if (v.image4 !== undefined) obj.image_4 = v.image4;
  if (v.imagePosition !== undefined) obj.image_position = v.imagePosition;
  if (v.imagePositionX !== undefined) obj.image_position_x = v.imagePositionX;
  if (v.imageZoom !== undefined) obj.image_zoom = v.imageZoom;
  if (v.sortOrder !== undefined) obj.sort_order = v.sortOrder;
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
  if (v.kaskoCompany !== undefined) obj.kasko_company = v.kaskoCompany;
  if (v.kaskoExpiry !== undefined) obj.kasko_expiry = v.kaskoExpiry || null;
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
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return setCached(cacheKey, (data ?? []).map(toVehicle));
}

/**
 * Persists a manual drag-and-drop ordering of vehicles. `orderedIds` is the
 * full list of vehicle ids in their new visual order; each gets a sort_order
 * matching its index so the order survives reloads and is shared company-wide.
 */
export async function updateVehicleOrder(orderedIds: string[]): Promise<void> {
  const companyId = await requireCompanyId();
  const supabase = createClient();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("vehicles")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("company_id", companyId)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  bustCache(`vehicles:${companyId}`);
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
  const vehicle = toVehicle(inserted);
  // Yöneticilere bildirim (fire-and-forget) — 4 kanaldan
  notifyEvent("/api/vehicles/notify-new", { vehicleId: vehicle.id });
  return vehicle;
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
  const record = toRecord(inserted);
  // Yöneticilere bildirim (fire-and-forget) — 4 kanaldan
  notifyEvent("/api/records/notify-new", { recordId: record.id });
  return record;
}

export async function updateRecord(
  id: string,
  data: Partial<Omit<ServiceRecord, "id" | "vehicleId" | "createdAt">>
): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const patch: Record<string, unknown> = {};
  if (data.date !== undefined) patch.date = data.date;
  if (data.type !== undefined) patch.type = data.type;
  if (data.title !== undefined) patch.title = data.title;
  if (data.mileage !== undefined) patch.mileage = data.mileage;
  if (data.serviceCenter !== undefined) patch.service_center = data.serviceCenter;
  if (data.notes !== undefined) patch.notes = data.notes;
  const { error } = await supabase
    .from("service_records")
    .update(patch)
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;
  bustCache(`records:${companyId}`);
  bustCache(`vrecords:${companyId}`);
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
    .eq("role", "user")
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

  if (profile?.role !== "user") return getVehicles();

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
  role: "manager" | "operator" | "user"
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

// ─── Bildirim tetikleyicisi ───────────────────────────────────

// Bir olay bildirimi route'unu fire-and-forget tetikler. Sunucu tarafında
// dispatchToManagers ile 4 kanala (zil + telegram + push + e-posta) dağıtılır.
// Başarısız olsa bile çağıran akışı etkilemez.
function notifyEvent(path: string, body: Record<string, unknown>): void {
  try {
    void fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    /* yoksay */
  }
}

// ─── Vehicle Tasks ────────────────────────────────────────────

// Görev başladığında yöneticilere Telegram bilgi mesajı gönderir (fire-and-forget).
// Başarısız olsa bile görev akışını etkilemez.
function notifyTaskStart(taskId: string): void {
  try {
    void fetch("/api/tasks/notify-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  } catch {
    /* yoksay */
  }
}

// Görev tamamlandığında yöneticilere Telegram bilgi mesajı gönderir
// (fire-and-forget). Başarısız olsa bile görev akışını etkilemez.
function notifyTaskEnd(taskId: string): void {
  try {
    void fetch("/api/tasks/notify-end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  } catch {
    /* yoksay */
  }
}

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

// Bir araç tek bir görevde (sefer) fiziksel olarak en fazla bu kadar km
// yapabilir. Bunun üzerindeki kayıtlar hatalı kabul edilir ve engellenir;
// aksi halde araç KM'si ve buna bağlı bakım hesapları yanlış şişer.
// Not: Sınır görev başınadır — gün içindeki birden çok görevin toplamı kontrol
// edilmez (km farkını kapatabilmek için kasıtlı olarak böyle).
export const MAX_VEHICLE_TASK_KM = 1500;

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
  const task = toTask(inserted as Record<string, unknown>);
  notifyTaskStart(task.id);
  return task;
}

export async function endTask(taskId: string, endKm: number): Promise<VehicleTask> {
  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("vehicle_tasks")
    .select("start_km, vehicle_id, start_time")
    .eq("id", taskId)
    .eq("status", "active")
    .single();

  if (fetchErr || !existing) throw new Error("Aktif görev bulunamadı.");
  const distance = endKm - (existing.start_km as number);

  if (distance < 0) {
    throw new Error(`Bitiş KM, başlangıç KM'den (${(existing.start_km as number).toLocaleString("tr-TR")}) küçük olamaz.`);
  }

  // Görev başına 1500 km sınırı — tek bir sefer bunu aşamaz. Gün içindeki
  // birden çok görevin toplamı KONTROL EDİLMEZ (km farkını kapatabilmek için).
  if (distance > MAX_VEHICLE_TASK_KM) {
    throw new Error(
      `Bir araç tek görevde en fazla ${MAX_VEHICLE_TASK_KM.toLocaleString("tr-TR")} km yapabilir. ` +
      `Bu seyahat ${distance.toLocaleString("tr-TR")} km görünüyor — bitiş KM'yi kontrol edin.`
    );
  }

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

  // Görev tamamlanınca aracın kilometresini bitiş KM ile güncelle.
  // Sadece bitiş KM mevcut kayıtlı KM'den büyükse güncellenir; bu sayede
  // geriye giden / hatalı km kaydı ve çift güncelleme engellenir.
  const vehicleId = existing.vehicle_id as string;
  try {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("mileage, company_id")
      .eq("id", vehicleId)
      .single();

    if (vehicle && endKm > ((vehicle.mileage as number) ?? 0)) {
      const { error: kmErr } = await supabase
        .from("vehicles")
        .update({ mileage: endKm, updated_at: new Date().toISOString() })
        .eq("id", vehicleId);
      if (kmErr) {
        console.error("endTask: araç KM güncellenemedi:", kmErr);
      } else if (vehicle.company_id) {
        // Güncel km'nin sonraki sorgularda görünmesi için cache temizle
        bustCache(`vehicles:${vehicle.company_id as string}`);
        bustCache("myvehicles:");
      }
    }
  } catch (kmErr) {
    // KM güncellemesi başarısız olsa bile görev tamamlanmış sayılır
    console.error("endTask: araç KM güncelleme hatası:", kmErr);
  }

  notifyTaskEnd(taskId);
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
  const task = toTask(inserted as Record<string, unknown>);
  notifyTaskStart(task.id);
  return task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("vehicle_tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
}

// ─── Vehicle Status (görevde / müsait) ────────────────────────

export interface VehicleStatusInfo {
  vehicleId: string;
  driverId: string;
  driverName?: string;
  since: string;
}

/**
 * Şirketteki araçların anlık durumunu döndürür. Aktif görevde olan
 * araçların listesini ve hangi sürücüde olduğunu içerir.
 * Sonuç kısa süreli cache'lenmez — durum gerçek zamanlı olmalı.
 */
export async function getVehicleStatuses(): Promise<{
  activeVehicleIds: Set<string>;
  active: VehicleStatusInfo[];
}> {
  try {
    const res = await fetch("/api/vehicles/statuses", { credentials: "same-origin" });
    if (!res.ok) return { activeVehicleIds: new Set(), active: [] };
    const json = (await res.json()) as { activeVehicleIds?: string[]; active?: VehicleStatusInfo[] };
    return {
      activeVehicleIds: new Set(json.activeVehicleIds ?? []),
      active: json.active ?? [],
    };
  } catch (err) {
    console.error("getVehicleStatuses failed:", err);
    return { activeVehicleIds: new Set(), active: [] };
  }
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

export async function getDocumentSignedUrl(
  filePath: string,
  downloadName?: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("vehicle-documents")
    .createSignedUrl(filePath, 3600, downloadName ? { download: downloadName } : undefined);
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

// ─── Vehicle Reports (Arıza / Durum Bildirimleri) ─────────────

// Yeni arıza bildirimi oluşunca yöneticilere Telegram bilgi mesajı gönderir
// (fire-and-forget). Başarısız olsa bile bildirim akışını etkilemez.
function notifyReportCreate(reportId: string): void {
  try {
    void fetch("/api/reports/notify-new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ reportId }),
    }).catch(() => {});
  } catch {
    /* yoksay */
  }
}

function toReport(row: Record<string, unknown>): VehicleReport {
  const vehicleData = row.vehicles as { plate?: string; brand?: string; model?: string } | null;
  const reporter = row.profiles as { full_name?: string; department?: string } | null;
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    vehicleId: row.vehicle_id as string,
    reporterId: row.reporter_id as string,
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    category: (row.category as ReportCategory) || "other",
    severity: (row.severity as ReportSeverity) || "medium",
    status: (row.status as ReportStatus) || "open",
    resolutionNote: (row.resolution_note as string) || "",
    photoPaths: (row.photo_paths as string[] | null) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    resolvedAt: row.resolved_at != null ? (row.resolved_at as string) : undefined,
    vehiclePlate: vehicleData?.plate ?? undefined,
    vehicleName: vehicleData
      ? `${vehicleData.brand ?? ""} ${vehicleData.model ?? ""}`.trim() || undefined
      : undefined,
    reporterName: reporter?.full_name ?? undefined,
    reporterDepartment: reporter?.department || undefined,
  };
}

function toReportLog(row: Record<string, unknown>): VehicleReportLog {
  const actor = row.profiles as { full_name?: string } | null;
  return {
    id: row.id as string,
    reportId: row.report_id as string,
    companyId: row.company_id as string,
    actorId: row.actor_id as string,
    fromStatus: (row.from_status as ReportStatus) || undefined,
    toStatus: (row.to_status as ReportStatus) || undefined,
    note: (row.note as string) || "",
    createdAt: row.created_at as string,
    actorName: actor?.full_name ?? undefined,
  };
}

const REPORT_SELECT =
  "*, vehicles(plate, brand, model), profiles!vehicle_reports_reporter_id_fkey(full_name, department)";

/**
 * Bildirimleri döndürür. RLS gereği yöneticiler/operatörler tüm şirket
 * bildirimlerini, sürücüler yalnızca kendi bildirimlerini görür.
 */
export async function getReports(filters?: {
  vehicleId?: string;
  driverId?: string;
  status?: ReportStatus;
  severity?: ReportSeverity;
}): Promise<VehicleReport[]> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  let query = supabase
    .from("vehicle_reports")
    .select(REPORT_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.vehicleId) query = query.eq("vehicle_id", filters.vehicleId);
  if (filters?.driverId)  query = query.eq("reporter_id", filters.driverId);
  if (filters?.status)    query = query.eq("status", filters.status);
  if (filters?.severity)  query = query.eq("severity", filters.severity);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => toReport(r as Record<string, unknown>));
}

/** Sürücünün kendi bildirimleri (reporter_id = current user). */
export async function getMyReports(): Promise<VehicleReport[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("vehicle_reports")
    .select(REPORT_SELECT)
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toReport(r as Record<string, unknown>));
}

/** Bir bildirimin durum geçmişi (eski→yeni). */
export async function getReportLogs(reportId: string): Promise<VehicleReportLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicle_report_logs")
    .select("*, profiles!vehicle_report_logs_actor_id_fkey(full_name)")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toReportLog(r as Record<string, unknown>));
}

// Arıza bildirimi fotoğrafları için en fazla yüklenebilecek adet.
export const MAX_REPORT_PHOTOS = 3;

/**
 * Tek bir arıza fotoğrafını `report-photos` bucket'ına yükler ve dosya yolunu
 * döndürür. Yol deseni storage RLS ile uyumludur: <company_id>/<vehicle_id>/<uuid>.<ext>
 */
export async function uploadReportPhoto(vehicleId: string, file: File): Promise<string> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const photoId = crypto.randomUUID();
  const filePath = `${companyId}/${vehicleId}/${photoId}.${ext}`;
  const { error } = await supabase.storage
    .from("report-photos")
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return filePath;
}

/** Verilen fotoğraf yolları için imzalı (geçici) görüntüleme URL'leri üretir. */
export async function getReportPhotoSignedUrls(paths: string[]): Promise<string[]> {
  if (!paths || paths.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("report-photos")
    .createSignedUrls(paths, 3600);
  if (error) throw error;
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
}

/** Sürücü yeni bir arıza/durum bildirimi oluşturur + "oluşturuldu" logu yazar. */
export async function createReport(data: {
  vehicleId: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  photoPaths?: string[];
}): Promise<VehicleReport> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Oturum bulunamadı.");

  const { data: inserted, error } = await supabase
    .from("vehicle_reports")
    .insert({
      company_id: companyId,
      vehicle_id: data.vehicleId,
      reporter_id: userId,
      title: data.title,
      description: data.description,
      category: data.category,
      severity: data.severity,
      status: "open",
      photo_paths: (data.photoPaths ?? []).slice(0, MAX_REPORT_PHOTOS),
    })
    .select(REPORT_SELECT)
    .single();
  if (error) throw error;

  const report = toReport(inserted as Record<string, unknown>);

  // "Oluşturuldu" logu (audit trail başlangıcı)
  await supabase.from("vehicle_report_logs").insert({
    report_id: report.id,
    company_id: companyId,
    actor_id: userId,
    from_status: null,
    to_status: "open",
    note: data.title,
  });

  // Yöneticilere Telegram bildirimi (fire-and-forget)
  notifyReportCreate(report.id);

  return report;
}

/**
 * Yönetici/operatör bildirim durumunu ilerletir. Her geçiş loglanır.
 * "resolved" durumunda resolved_at + resolution_note kaydedilir.
 */
export async function updateReportStatus(
  reportId: string,
  toStatus: ReportStatus,
  note?: string,
): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Oturum bulunamadı.");

  const { data: existing, error: fetchErr } = await supabase
    .from("vehicle_reports")
    .select("status, vehicle_id, title, description, category")
    .eq("id", reportId)
    .single();
  if (fetchErr || !existing) throw new Error("Bildirim bulunamadı.");
  const fromStatus = existing.status as ReportStatus;

  const patch: Record<string, unknown> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
  };
  if (toStatus === "resolved") {
    patch.resolved_at = new Date().toISOString();
    if (note !== undefined) patch.resolution_note = note;
  } else {
    patch.resolved_at = null;
  }

  const { error } = await supabase
    .from("vehicle_reports")
    .update(patch)
    .eq("id", reportId);
  if (error) throw error;

  await supabase.from("vehicle_report_logs").insert({
    report_id: reportId,
    company_id: companyId,
    actor_id: userId,
    from_status: fromStatus,
    to_status: toStatus,
    note: note ?? "",
  });

  // Durum gerçekten değiştiyse yöneticilere bildirim (fire-and-forget) — 4 kanaldan
  if (fromStatus !== toStatus) {
    notifyEvent("/api/reports/notify-status", { reportId, fromStatus, toStatus, note: note ?? "" });
  }

  // Arıza çözüldüğünde (ve daha önce çözülmemişse) aracın servis geçmişine
  // otomatik bir "tamir/bakım" kaydı düşerek geriye dönük takibi kolaylaştırır.
  if (toStatus === "resolved" && fromStatus !== "resolved") {
    try {
      const vehicleId = existing.vehicle_id as string;
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("mileage")
        .eq("id", vehicleId)
        .single();

      const noteParts = [
        existing.description ? `Bildirilen sorun: ${existing.description as string}` : "",
        note?.trim() ? `Çözüm: ${note.trim()}` : "",
      ].filter(Boolean);

      await supabase.from("service_records").insert({
        vehicle_id: vehicleId,
        company_id: companyId,
        date: new Date().toISOString().slice(0, 10),
        type: (existing.category as ReportCategory) === "tire" ? "tire" : "repair",
        title: `Arıza giderildi: ${(existing.title as string) || "Bildirim"}`,
        mileage: (vehicle?.mileage as number) ?? 0,
        service_center: "",
        notes: noteParts.join(" · "),
      });
      bustCache(`records:${companyId}`);
      bustCache(`vrecords:${companyId}`);
    } catch (recErr) {
      // Servis kaydı oluşturulamasa bile durum güncellemesi geçerli sayılır.
      console.error("updateReportStatus: otomatik servis kaydı eklenemedi:", recErr);
    }
  }
}

/** Yönetici/operatör bir bildirimi kalıcı olarak siler (loglar cascade ile silinir). */
export async function deleteReport(reportId: string): Promise<void> {
  const supabase = createClient();
  const companyId = await requireCompanyId();

  // Bağlı fotoğrafları storage'dan temizle (DB satırı cascade ile silinir,
  // ancak storage nesneleri otomatik silinmez).
  const { data: existing } = await supabase
    .from("vehicle_reports")
    .select("photo_paths")
    .eq("id", reportId)
    .eq("company_id", companyId)
    .maybeSingle();
  const photoPaths = (existing?.photo_paths as string[] | null) ?? [];
  if (photoPaths.length > 0) {
    const { error: storageErr } = await supabase.storage.from("report-photos").remove(photoPaths);
    if (storageErr) console.error("Report photo storage delete (non-fatal):", storageErr);
  }

  const { error } = await supabase
    .from("vehicle_reports")
    .delete()
    .eq("id", reportId)
    .eq("company_id", companyId);
  if (error) throw error;
}

// ─── Uygulama içi (zil) bildirimleri ──────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  severity: "info" | "warning" | "critical";
  vehicleId: string | null;
  vehiclePlate: string | null;
  readAt: string | null;
  createdAt: string;
}

function toNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    url: (row.url as string) ?? null,
    severity: (row.severity as AppNotification["severity"]) || "info",
    vehicleId: (row.vehicle_id as string) ?? null,
    vehiclePlate: (row.vehicle_plate as string) ?? null,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Kullanıcının kendi olay bildirimleri (RLS ile sınırlı), en yeniden eskiye. */
export async function getNotifications(limit = 30): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, severity, vehicle_id, vehicle_plate, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getNotifications error:", error);
    return [];
  }
  return (data ?? []).map(toNotification);
}

/** Okunmamış tüm olay bildirimlerini okundu işaretler. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) console.error("markAllNotificationsRead error:", error);
}

/** Belirli olay bildirimlerini okundu işaretler (tek tek tıklandığında). */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);
  if (error) console.error("markNotificationsRead error:", error);
}

// ─── Kullanıcı Geri Bildirimleri (Feedback) ───────────────────

function toFeedback(row: Record<string, unknown>): Feedback {
  const profile = row.profiles as { full_name?: string } | null;
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    type: row.type as FeedbackType,
    message: (row.message as string) || "",
    pageUrl: (row.page_url as string) || undefined,
    status: row.status as Feedback["status"],
    createdAt: row.created_at as string,
    userName: profile?.full_name ?? undefined,
  };
}

/** Yeni geri bildirimi uygulama sahibine e-posta ile bildirir (fire-and-forget). */
function notifyFeedbackCreate(feedbackId: string): void {
  try {
    void fetch("/api/feedback/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ feedbackId }),
    }).catch(() => {});
  } catch {
    /* yoksay */
  }
}

/** Mevcut kullanıcı adına yeni bir geri bildirim oluşturur. */
export async function submitFeedback(data: {
  type: FeedbackType;
  message: string;
  pageUrl?: string;
}): Promise<Feedback> {
  const supabase = createClient();
  const companyId = await requireCompanyId();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Oturum bulunamadı.");

  const message = data.message.trim();
  if (!message) throw new Error("Lütfen bir mesaj yazın.");

  const { data: inserted, error } = await supabase
    .from("feedback")
    .insert({
      company_id: companyId,
      user_id: userId,
      type: data.type,
      message: message.slice(0, 4000),
      page_url: (data.pageUrl ?? "").slice(0, 500),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "",
      status: "new",
    })
    .select("*, profiles(full_name)")
    .single();

  if (error) throw error;
  const feedback = toFeedback(inserted as Record<string, unknown>);
  notifyFeedbackCreate(feedback.id);
  return feedback;
}

/** Mevcut kullanıcının gönderdiği geri bildirimleri (en yeni önce) döndürür. */
export async function getMyFeedback(): Promise<Feedback[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("feedback")
    .select("*, profiles(full_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []).map((r) => toFeedback(r as Record<string, unknown>));
}
