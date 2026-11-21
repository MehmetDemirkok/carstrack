#!/usr/bin/env node
/**
 * CarsTrack sürüm yardımcısı. Sürüm geçmişinin tek kaynağı
 * src/data/changelog.json; package.json "version" alanı onun ilk kaydıyla
 * aynı olmak zorunda. CHANGELOG.md bu JSON'dan üretilir — elle düzenlenmez.
 *
 *   node scripts/release.mjs check
 *       package.json ↔ changelog.json tutarlı mı, CHANGELOG.md güncel mi?
 *       (npm run build öncesi otomatik çalışır; tutarsızsa build durur.)
 *
 *   node scripts/release.mjs bump <patch|minor|major> "Başlık"
 *       Sürümü yükseltir, changelog.json'un en üstüne boş bir kayıt açar,
 *       package.json'u ve CHANGELOG.md'yi günceller. Sonra "changes"
 *       dizisini doldurun.
 *
 *   node scripts/release.mjs md
 *       CHANGELOG.md'yi changelog.json'dan yeniden üretir.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "package.json");
const CHANGELOG_JSON = join(ROOT, "src/data/changelog.json");
const CHANGELOG_MD = join(ROOT, "CHANGELOG.md");

const TYPE_LABELS = {
  yeni: "Yeni",
  iyilestirme: "İyileştirme",
  duzeltme: "Düzeltme",
  guvenlik: "Güvenlik",
};
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, data) => writeFileSync(p, JSON.stringify(data, null, 2) + "\n");

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function renderMarkdown(changelog) {
  const lines = [
    "# Sürüm Geçmişi",
    "",
    "> Bu dosya `src/data/changelog.json` dosyasından otomatik üretilir — elle düzenlemeyin.",
    "> Yeni sürüm için: `npm run release -- <patch|minor|major> \"Başlık\"` (bkz. CLAUDE.md > Sürümleme).",
    "",
  ];
  for (const v of changelog.versions) {
    lines.push(`## v${v.version} — ${v.date}`, "", `**${v.title}**`, "");
    for (const type of Object.keys(TYPE_LABELS)) {
      const items = (v.changes ?? []).filter((c) => c.type === type);
      if (items.length === 0) continue;
      lines.push(`### ${TYPE_LABELS[type]}`, "");
      for (const c of items) lines.push(`- ${c.text}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

function validate(changelog) {
  const versions = changelog.versions ?? [];
  if (versions.length === 0) fail("changelog.json içinde hiç sürüm yok.");
  const seen = new Set();
  for (const v of versions) {
    if (!SEMVER.test(v.version ?? "")) fail(`Geçersiz sürüm numarası: "${v.version}"`);
    if (seen.has(v.version)) fail(`Sürüm iki kez yazılmış: ${v.version}`);
    seen.add(v.version);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "")) fail(`v${v.version}: tarih YYYY-AA-GG olmalı.`);
    if (!v.title) fail(`v${v.version}: başlık eksik.`);
    for (const c of v.changes ?? []) {
      if (!TYPE_LABELS[c.type]) fail(`v${v.version}: bilinmeyen değişiklik türü "${c.type}".`);
      if (!c.text) fail(`v${v.version}: boş değişiklik metni.`);
    }
  }
  return versions;
}

function check() {
  const pkg = readJson(PKG);
  const changelog = readJson(CHANGELOG_JSON);
  const [latest] = validate(changelog);

  if (pkg.version !== latest.version) {
    fail(
      `package.json sürümü (${pkg.version}) changelog.json'daki son sürümle (${latest.version}) aynı değil.\n` +
        `  Yeni sürüm için: npm run release -- <patch|minor|major> "Başlık"`,
    );
  }
  if ((latest.changes ?? []).length === 0) {
    fail(`v${latest.version} için hiç değişiklik yazılmamış (src/data/changelog.json).`);
  }
  let md = "";
  try { md = readFileSync(CHANGELOG_MD, "utf8"); } catch { /* yok */ }
  if (md !== renderMarkdown(changelog)) {
    fail("CHANGELOG.md güncel değil. Üretmek için: npm run changelog");
  }
  console.log(`✔ Sürüm v${latest.version} tutarlı.`);
}

function bump(kind, title) {
  if (!["patch", "minor", "major"].includes(kind)) {
    fail('Kullanım: npm run release -- <patch|minor|major> "Başlık"');
  }
  if (!title) fail("Sürüm başlığı gerekli.");

  const pkg = readJson(PKG);
  const changelog = readJson(CHANGELOG_JSON);
  validate(changelog);

  const [major, minor, patch] = SEMVER.exec(pkg.version).slice(1).map(Number);
  const next =
    kind === "major" ? `${major + 1}.0.0`
    : kind === "minor" ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  changelog.versions.unshift({ version: next, date: today, title, changes: [] });
  pkg.version = next;

  writeJson(CHANGELOG_JSON, changelog);
  writeJson(PKG, pkg);
  writeFileSync(CHANGELOG_MD, renderMarkdown(changelog));
  console.log(`✔ v${next} açıldı. Şimdi src/data/changelog.json içinde "changes" dizisini doldurun,`);
  console.log(`  ardından: npm run changelog && git tag v${next} (merge sonrası, main üzerinde)`);
}

function md() {
  const changelog = readJson(CHANGELOG_JSON);
  validate(changelog);
  writeFileSync(CHANGELOG_MD, renderMarkdown(changelog));
  console.log("✔ CHANGELOG.md üretildi.");
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "check") check();
else if (cmd === "bump") bump(args[0], args.slice(1).join(" ").trim());
else if (cmd === "md") md();
else fail('Komut: check | bump <patch|minor|major> "Başlık" | md');
