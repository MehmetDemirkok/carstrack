export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { withAdmin, type AdminContext } from "@/lib/admin/api";
import type { AdminStorageResponse } from "@/lib/admin/types";

/** Kullanımı ölçülen bucket'lar. */
const BUCKETS = ["vehicle-documents", "db-backups", "report-photos"] as const;
/** Tek klasör listelemede alınacak azami dosya — bucket'lar bu ölçekte küçük. */
const LIST_LIMIT = 1000;
/** Klasör derinliği sınırı: {company_id}/{alt klasör}/{dosya} üç seviye yeter. */
const MAX_DEPTH = 3;

interface StorageEntry {
  name: string;
  id?: string | null;
  metadata?: { size?: number } | null;
}

/**
 * Bir bucket'ı klasör klasör gezip dosya sayısı ve toplam boyutu toplar.
 *
 * Supabase Storage API'sinde "bucket boyutu" diye tek bir çağrı yok; listeleme
 * özyinelemeli değil. `id` alanı olan girdi dosyadır, olmayan klasördür.
 */
async function measureBucket(
  db: AdminContext["db"],
  bucket: string,
): Promise<{ name: string; fileCount: number; bytes: number; error: string | null }> {
  let fileCount = 0;
  let bytes = 0;

  async function walk(prefix: string, depth: number): Promise<string | null> {
    if (depth > MAX_DEPTH) return null;

    const { data, error } = await db.storage
      .from(bucket)
      .list(prefix, { limit: LIST_LIMIT, sortBy: { column: "name", order: "asc" } });
    if (error) return error.message;

    const entries = (data ?? []) as StorageEntry[];
    for (const entry of entries) {
      if (!entry.name || entry.name.startsWith(".")) continue;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.id) {
        fileCount++;
        bytes += entry.metadata?.size ?? 0;
      } else {
        const err = await walk(path, depth + 1);
        if (err) return err;
      }
    }
    return null;
  }

  const error = await walk("", 1);
  return { name: bucket, fileCount, bytes, error };
}

/**
 * Depolama baskısı: araç fotoğraflarının storage'a taşınma durumu ve bucket
 * kullanımı.
 *
 * Fotoğraf ağırlığı `admin_vehicle_weights` / `admin_company_weights` view'ları
 * üzerinden, bayt hesabı SQL tarafında yapılmış olarak gelir — satırları buraya
 * çekip ölçmek db-backup'ın yaşadığı Gateway Timeout'ları üretirdi.
 */
export const GET = withAdmin(async (_req, { db }) => {
  const [companyWeightsRes, vehicleWeightsRes, vehicleCountRes, buckets] = await Promise.all([
    db
      .from("admin_company_weights")
      .select("id, name, vehicle_count, inline_bytes, inline_count, stored_count")
      .gt("inline_bytes", 0)
      .order("inline_bytes", { ascending: false })
      .limit(10),
    db
      .from("admin_vehicle_weights")
      .select("id, company_id, plate, brand, model, inline_bytes, inline_count")
      .gt("inline_bytes", 0)
      .order("inline_bytes", { ascending: false })
      .limit(10),
    db.from("vehicles").select("id", { count: "exact", head: true }),
    Promise.all(BUCKETS.map((b) => measureBucket(db, b))),
  ]);

  // View'lar yoksa migration uygulanmamıştır; panel çalışmaya devam eder.
  const unavailable = Boolean(companyWeightsRes.error || vehicleWeightsRes.error);
  if (unavailable) {
    console.warn(
      `[admin/storage] ağırlık view'ları okunamadı: ${
        companyWeightsRes.error?.message ?? vehicleWeightsRes.error?.message
      }`,
    );
  }

  const companyRows = companyWeightsRes.data ?? [];
  const vehicleRows = vehicleWeightsRes.data ?? [];

  const companyNames = new Map(companyRows.map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]));
  // En ağır araçların şirketi ilk 10 şirket listesinde olmayabilir.
  const missingCompanyIds = [
    ...new Set(
      vehicleRows
        .map((v) => v.company_id as string)
        .filter((id) => id && !companyNames.has(id)),
    ),
  ];
  if (missingCompanyIds.length) {
    const { data } = await db.from("companies").select("id, name").in("id", missingCompanyIds);
    for (const c of data ?? []) {
      companyNames.set(c.id as string, (c.name as string) || "İsimsiz Şirket");
    }
  }

  // Toplamlar için ayrı, sayfalanmamış özet: yalnızca satır içi taşıyanlar.
  const { data: allInline } = await db
    .from("admin_vehicle_weights")
    .select("inline_bytes, inline_count, stored_count")
    .gt("inline_bytes", 0);
  const { count: storedPhotoVehicles } = await db
    .from("admin_vehicle_weights")
    .select("id", { count: "exact", head: true })
    .gt("stored_count", 0);

  const inlineRows = allInline ?? [];
  const payload: AdminStorageResponse = {
    photos: {
      inlineVehicles: inlineRows.length,
      inlineBytes: inlineRows.reduce((sum, r) => sum + ((r.inline_bytes as number) ?? 0), 0),
      storedPhotos: storedPhotoVehicles ?? 0,
      totalVehicles: vehicleCountRes.count ?? 0,
    },
    heaviestCompanies: companyRows.map((c) => ({
      id: c.id as string,
      name: (c.name as string) || "İsimsiz Şirket",
      vehicleCount: (c.vehicle_count as number) ?? 0,
      inlineBytes: (c.inline_bytes as number) ?? 0,
      inlineCount: (c.inline_count as number) ?? 0,
    })),
    heaviestVehicles: vehicleRows.map((v) => ({
      id: v.id as string,
      plate: (v.plate as string) || "—",
      brand: (v.brand as string) || "",
      model: (v.model as string) || "",
      companyId: (v.company_id as string) ?? null,
      companyName: companyNames.get(v.company_id as string) ?? "—",
      inlineBytes: (v.inline_bytes as number) ?? 0,
      inlineCount: (v.inline_count as number) ?? 0,
    })),
    buckets,
    unavailable,
  };

  return NextResponse.json(payload);
});
