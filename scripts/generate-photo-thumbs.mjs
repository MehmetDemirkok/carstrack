/**
 * Mevcut araç fotoğrafları için küçük boy (thumb) dosyaları üretir.
 *
 * NEDEN: Araç kartları 1200px'lik tam boy fotoğrafı (~200-400 KB) indiriyordu.
 * Yeni yüklemelerde küçük boy istemcide üretiliyor (src/lib/db.ts →
 * uploadVehiclePhoto), ama bu değişiklikten önce yüklenmiş fotoğrafların
 * küçük boyu yok — proxy route onlarda tam boya düşüyor. Bu script o boşluğu
 * kapatır.
 *
 * NEREYE: aynı bucket, aynı klasör, `image.jpg` → `image_thumb.jpg`
 * (src/lib/vehicle-photo.ts içindeki thumbPath ile aynı sözleşme).
 *
 * KULLANIM:
 *   node scripts/generate-photo-thumbs.mjs --dry   # yalnızca rapor
 *   node scripts/generate-photo-thumbs.mjs         # küçük boyları yaz
 *
 * Idempotent: küçük boyu zaten olan fotoğrafa dokunmaz. Yalnızca yeni dosya
 * ekler; mevcut fotoğrafları ve DB satırlarını değiştirmez.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
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
const COLUMNS = ["image", "image_2", "image_3", "image_4"];
const THUMB_PX = 480;
const QUALITY = 72;

/** `.../image.jpg` → `.../image_thumb.jpg` */
function thumbPath(p) {
  const dot = p.lastIndexOf(".");
  return dot <= 0 ? `${p}_thumb` : `${p.slice(0, dot)}_thumb${p.slice(dot)}`;
}

function isStoragePath(v) {
  return typeof v === "string" && v.length > 0 && !v.startsWith("data:") && !v.startsWith("http") && !v.startsWith("/");
}

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function main() {
  const { data: rows, error } = await admin
    .from("vehicles")
    .select(`id, plate, ${COLUMNS.join(", ")}`);
  if (error) throw new Error(`vehicles: ${error.message}`);

  const paths = [];
  for (const row of rows ?? []) {
    for (const col of COLUMNS) {
      if (isStoragePath(row[col])) paths.push({ plate: row.plate, path: row[col] });
    }
  }

  console.log(`${rows?.length ?? 0} araç, ${paths.length} storage fotoğrafı bulundu.${dryRun ? " (DRY RUN)" : ""}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let savedBytes = 0;

  for (const { plate, path: full } of paths) {
    const target = thumbPath(full);

    const { data: existing } = await admin.storage.from(BUCKET).download(target);
    if (existing) {
      skipped++;
      console.log(`  ⏭  ${plate} — küçük boy zaten var`);
      continue;
    }

    const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(full);
    if (!blob) {
      failed++;
      console.log(`  ✖  ${plate} — indirilemedi: ${dlErr?.message ?? "bilinmiyor"}`);
      continue;
    }

    const input = Buffer.from(await blob.arrayBuffer());
    const output = await sharp(input)
      .resize({ width: THUMB_PX, height: THUMB_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer();

    savedBytes += input.length - output.length;
    console.log(`  ${dryRun ? "•" : "✔"}  ${plate} — ${kb(input.length)} → ${kb(output.length)}`);

    if (!dryRun) {
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(target, output, { contentType: "image/jpeg", upsert: true });
      if (upErr) {
        failed++;
        console.log(`      ✖ yazılamadı: ${upErr.message}`);
        continue;
      }
    }
    created++;
  }

  console.log(
    `\n${dryRun ? "Üretilecek" : "Üretildi"}: ${created} · atlandı: ${skipped} · hata: ${failed}` +
      `\nKart başına kazanç toplamı: ~${kb(savedBytes)}`,
  );
}

main().catch((err) => {
  console.error("HATA:", err.message);
  process.exit(1);
});
