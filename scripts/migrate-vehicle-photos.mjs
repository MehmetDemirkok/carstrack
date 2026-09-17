/**
 * Araç fotoğraflarını satır içi base64'ten Supabase Storage'a taşır.
 *
 * NEDEN: vehicles tablosundaki image/image_2/image_3/image_4 kolonları base64
 * data-URI tutuyordu; 19 araç tek başına ~21 MB yer kaplıyor, tabloyu 26 MB'a
 * (veritabanının yarısından fazlası) çıkarıyor ve her araç listesi sorgusunda
 * bu yük tarayıcıya iniyordu. Haftalık yedek cron'unun Gateway Timeout
 * yemesinin sebebi de buydu.
 *
 * NEREYE: vehicle-documents bucket'ı,
 *   {company_id}/arac-fotograflari/{vehicle_id}/{kolon}.{uzanti}
 * Bucket policy'si yolun ilk segmentini (company_id) kontrol ettiği için
 * ayrı bucket veya ek policy gerekmiyor.
 *
 * ⚠️ SIRALAMA: Bu script'i ancak src/lib/db.ts'teki imzalı-URL okuma katmanını
 * içeren sürüm CANLIYA ÇIKTIKTAN SONRA çalıştırın. Önce çalıştırılırsa üretimdeki
 * eski kod satırda yol görüp fotoğrafı gösteremez.
 *
 * KULLANIM:
 *   node scripts/migrate-vehicle-photos.mjs --dry   # hiçbir şey yazmadan rapor
 *   node scripts/migrate-vehicle-photos.mjs         # taşımayı uygula
 *
 * Idempotent: zaten taşınmış satırlara dokunmaz, tekrar çalıştırmak güvenlidir.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("HATA: .env.local içinde NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry");
const admin = createClient(url, key, { auth: { persistSession: false } });

const BUCKET = "vehicle-documents";
const DIR = "arac-fotograflari";
const COLUMNS = ["image", "image_2", "image_3", "image_4"];

/** data:image/jpeg;base64,XXXX -> { buffer, contentType, ext } */
function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1] || "image/jpeg";
  const isBase64 = Boolean(match[2]);
  const buffer = Buffer.from(match[3], isBase64 ? "base64" : "utf8");
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return { buffer, contentType, ext };
}

// vehicles satırları büyük olduğu için küçük sayfalarla çek (Gateway Timeout riski).
async function fetchVehicles() {
  const rows = [];
  for (let from = 0; ; from += 10) {
    const { data, error } = await admin
      .from("vehicles")
      .select(`id, company_id, plate, ${COLUMNS.join(", ")}`)
      .range(from, from + 9);
    if (error) throw new Error(`vehicles: ${error.message}`);
    rows.push(...data);
    if (data.length < 10) break;
  }
  return rows;
}

const vehicles = await fetchVehicles();
let inlineCount = 0;
let movedCount = 0;
let movedBytes = 0;
const failures = [];

for (const vehicle of vehicles) {
  const updates = {};

  for (const column of COLUMNS) {
    const value = vehicle[column];
    if (typeof value !== "string" || !value.startsWith("data:")) continue;
    inlineCount += 1;

    const parsed = parseDataUrl(value);
    if (!parsed) {
      failures.push(`${vehicle.plate} ${column}: data-URI çözülemedi`);
      continue;
    }

    const objectPath = `${vehicle.company_id}/${DIR}/${vehicle.id}/${column}.${parsed.ext}`;
    const sizeKb = (parsed.buffer.length / 1024).toFixed(0);

    if (dryRun) {
      console.log(`  [dry] ${vehicle.plate} ${column} -> ${objectPath} (${sizeKb} kB)`);
      movedCount += 1;
      movedBytes += parsed.buffer.length;
      continue;
    }

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(objectPath, parsed.buffer, { contentType: parsed.contentType, upsert: true });
    if (upErr) {
      failures.push(`${vehicle.plate} ${column}: yükleme hatası — ${upErr.message}`);
      continue;
    }

    updates[column] = objectPath;
    movedCount += 1;
    movedBytes += parsed.buffer.length;
    console.log(`  ✓ ${vehicle.plate} ${column} -> ${objectPath} (${sizeKb} kB)`);
  }

  if (!dryRun && Object.keys(updates).length > 0) {
    const { error: updErr } = await admin.from("vehicles").update(updates).eq("id", vehicle.id);
    if (updErr) failures.push(`${vehicle.plate}: satır güncellenemedi — ${updErr.message}`);
  }
}

console.log("");
console.log(`Araç              : ${vehicles.length}`);
console.log(`Satır içi fotoğraf: ${inlineCount}`);
console.log(`${dryRun ? "Taşınacak" : "Taşınan"}          : ${movedCount} (${(movedBytes / 1024 / 1024).toFixed(1)} MB)`);
if (failures.length) {
  console.log(`\nBAŞARISIZ (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
} else if (!dryRun && movedCount > 0) {
  console.log("\nTamamlandı. Yer kazanımını kalıcılaştırmak için: VACUUM FULL public.vehicles;");
}
