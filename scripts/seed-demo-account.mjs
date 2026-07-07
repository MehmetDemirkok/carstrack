// Tek seferlik demo veri üretme script'i.
// Kullanım: node scripts/seed-demo-account.mjs
// .env.local içindeki NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY kullanılır.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";

// ─── env yükle ──────────────────────────────────────────────
function loadEnv(path) {
  const out = {};
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}
const env = loadEnv(new URL("../.env.local", import.meta.url));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env eksik");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

// ─── seeded RNG (tekrar üretilebilirlik için) ──────────────
let seed = 20260707;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function pickWeighted(pairs) {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = rnd() * total;
  for (const [val, w] of pairs) { if ((r -= w) <= 0) return val; }
  return pairs[pairs.length - 1][0];
}
function randInt(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }
function addDays(d, days) { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; }
function iso(d) { return d.toISOString().slice(0, 10); }
const TODAY = new Date();

// ─── sabitler ───────────────────────────────────────────────
const COMPANY_NAME = "Demo Filo A.Ş.";
const MANAGER_EMAIL = "demo.yonetici@carstrack.app";
const DRIVER_EMAIL = "demo.surucu@carstrack.app";
const DEMO_PASSWORD = "Demo2026!Carstrack";

const MAINTENANCE_TEMPLATES = [
  { id: "oil", name: "Yağ Değişimi", intervalKm: 15000, intervalMonths: 12 },
  { id: "airfilter", name: "Hava Filtresi", intervalKm: 20000, intervalMonths: 24 },
  { id: "cabinfilter", name: "Kabin Filtresi", intervalKm: 15000, intervalMonths: 12 },
  { id: "fuelfilter", name: "Yakıt Filtresi", intervalKm: 40000, intervalMonths: 48 },
  { id: "sparkplug", name: "Buji", intervalKm: 30000, intervalMonths: 36 },
  { id: "timingbelt", name: "Triger Kayışı / Zinciri", intervalKm: 80000, intervalMonths: 60 },
  { id: "brakefluid", name: "Fren Hidroliği", intervalMonths: 24 },
  { id: "coolant", name: "Antifiriz", intervalMonths: 36 },
  { id: "brakefront", name: "Ön Fren Balatası", intervalKm: 40000 },
  { id: "brakerear", name: "Arka Fren Balatası", intervalKm: 60000 },
];

const CATALOG = [
  { brand: "Fiat", model: "Egea", body: "sedan" },
  { brand: "Renault", model: "Clio", body: "hatchback" },
  { brand: "Renault", model: "Megane", body: "sedan" },
  { brand: "Volkswagen", model: "Passat", body: "sedan" },
  { brand: "Volkswagen", model: "Golf", body: "hatchback" },
  { brand: "Volkswagen", model: "Transporter", body: "van" },
  { brand: "Ford", model: "Focus", body: "hatchback" },
  { brand: "Ford", model: "Transit", body: "van" },
  { brand: "Ford", model: "Courier", body: "van" },
  { brand: "Toyota", model: "Corolla", body: "sedan" },
  { brand: "Toyota", model: "Hilux", body: "pickup" },
  { brand: "Hyundai", model: "i20", body: "hatchback" },
  { brand: "Hyundai", model: "Tucson", body: "suv" },
  { brand: "Mercedes-Benz", model: "Vito", body: "van" },
  { brand: "Mercedes-Benz", model: "Sprinter", body: "van" },
  { brand: "Mercedes-Benz", model: "C 200", body: "sedan" },
  { brand: "BMW", model: "320i", body: "sedan" },
  { brand: "BMW", model: "X3", body: "suv" },
  { brand: "Audi", model: "A4", body: "sedan" },
  { brand: "Peugeot", model: "3008", body: "suv" },
  { brand: "Peugeot", model: "Partner", body: "van" },
  { brand: "Citroën", model: "Berlingo", body: "van" },
  { brand: "Dacia", model: "Duster", body: "suv" },
  { brand: "Dacia", model: "Sandero", body: "hatchback" },
  { brand: "Opel", model: "Astra", body: "hatchback" },
  { brand: "Opel", model: "Combo", body: "van" },
  { brand: "Skoda", model: "Octavia", body: "sedan" },
  { brand: "Nissan", model: "Qashqai", body: "suv" },
  { brand: "Nissan", model: "NV200", body: "van" },
  { brand: "Honda", model: "Civic", body: "sedan" },
  { brand: "Kia", model: "Sportage", body: "suv" },
  { brand: "Volvo", model: "XC60", body: "suv" },
  { brand: "Isuzu", model: "D-Max", body: "pickup" },
  { brand: "Ford", model: "F-Max", body: "truck" },
  { brand: "Mercedes-Benz", model: "Actros", body: "truck" },
];
const BODY_KEYWORDS = {
  sedan: "sedan-car", hatchback: "hatchback-car", suv: "suv-car",
  van: "cargo-van", pickup: "pickup-truck", truck: "semi-truck",
};
const COLORS = ["Beyaz", "Siyah", "Gri", "Gümüş", "Kırmızı", "Lacivert", "Mavi", "Kahverengi", "Yeşil"];
const TIRE_BRANDS = ["Michelin", "Bridgestone", "Continental", "Goodyear", "Pirelli", "Lassa"];
const BATTERY_BRANDS = ["Bosch", "Varta", "Mutlu", "Inci"];
const INSURERS = ["Anadolu Sigorta", "Allianz Sigorta", "Axa Sigorta", "Türkiye Sigorta", "Ray Sigorta", "HDI Sigorta", "Sompo Sigorta", "Groupama Sigorta"];
const CITY_CODES = ["34", "06", "35", "16", "41", "01", "07", "26", "42", "55"];
const PLATE_LETTERS = "ABCDEFGHJKLMNPRSTUVYZ";
const NOTES_POOL = [
  "Klima gazı bu sezon dolduruldu.", "Ön tampon boyalı, kaza kaydı yok.",
  "Depoda yedek lastik bulunmuyor.", "Araç gece park alanında muhafaza ediliyor.",
  "Son kullanıcı değişikliğinde iç temizlik yapıldı.", "GPS takip cihazı montajlı.",
  "Filoya yeni katıldı, ilk periyodik bakımı yaklaşıyor.", "",
];

function randomPlate() {
  const city = pick(CITY_CODES);
  const letters = Array.from({ length: randInt(2, 3) }, () => pick(PLATE_LETTERS)).join("");
  const numbers = randInt(2, 3) === 3 ? randInt(100, 999) : randInt(10, 99) * 10 + randInt(0, 9);
  return `${city} ${letters} ${randInt(10, 999)}`;
}
function randomChassis() {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  return "WVW" + Array.from({ length: 14 }, () => chars[randInt(0, chars.length - 1)]).join("");
}
function carImage(seedTag, bodyKeyword, offset) {
  return `https://loremflickr.com/800/600/${bodyKeyword}?lock=${seedTag}${offset}`;
}

// ─── health profilleri (bakım kalemi aşınma oranı + belge tarihi kovası) ──
const PROFILES = [
  { name: "excellent", weight: 15, wearRange: [0.05, 0.5], docBucket: "healthy" },
  { name: "good", weight: 15, wearRange: [0.5, 0.85], docBucket: "healthy" },
  { name: "attention", weight: 12, wearRange: [0.85, 1.15], docBucket: "warning" },
  { name: "critical", weight: 8, wearRange: [1.1, 1.4], docBucket: "critical" },
];
function pickProfile() { return pickWeighted(PROFILES.map((p) => [p, p.weight])); }
function docExpiryDate(bucket) {
  if (bucket === "critical") {
    return rnd() < 0.5 ? addDays(TODAY, -randInt(1, 45)) : addDays(TODAY, randInt(1, 13));
  }
  if (bucket === "warning") return addDays(TODAY, randInt(15, 60));
  return addDays(TODAY, randInt(61, 400));
}

console.log("1) Şirket oluşturuluyor...");
const { data: existingCompany } = await admin.from("companies").select("id").eq("name", COMPANY_NAME).maybeSingle();
if (existingCompany) {
  console.error(`"${COMPANY_NAME}" zaten mevcut (id=${existingCompany.id}). Script'i tekrar çalıştırmadan önce eski demo verisini temizleyin.`);
  process.exit(1);
}
function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[randInt(0, chars.length - 1)]).join("");
}
const { data: company, error: companyErr } = await admin
  .from("companies")
  .insert({ name: COMPANY_NAME, plan: "fleet", invite_code: inviteCode() })
  .select("id")
  .single();
if (companyErr) throw companyErr;
const companyId = company.id;
console.log("   company_id =", companyId);

// ─── 2) Kullanıcılar ────────────────────────────────────────
console.log("2) Kullanıcılar oluşturuluyor...");
async function createUser(email, password, appMeta) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { company_id: companyId, ...appMeta },
    user_metadata: { company_id: companyId },
  });
  if (error) throw error;
  return data.user.id;
}

const managerId = await createUser(MANAGER_EMAIL, DEMO_PASSWORD, {});
const driverId = await createUser(DRIVER_EMAIL, DEMO_PASSWORD, {});

const colleagueDefs = [
  { email: "demo.driver2@carstrack.app", fullName: "Ayşe Demir", role: "user", dept: "Lojistik / Şoför", avatar: "women/68" },
  { email: "demo.driver3@carstrack.app", fullName: "Hakan Şahin", role: "user", dept: "Dağıtım / Şoför", avatar: "men/22" },
  { email: "demo.driver4@carstrack.app", fullName: "Zeynep Arslan", role: "user", dept: "Lojistik / Şoför", avatar: "women/44" },
  { email: "demo.operator1@carstrack.app", fullName: "Barış Koç", role: "operator", dept: "Filo Operasyon", avatar: "men/51" },
];
const colleagues = [];
for (const c of colleagueDefs) {
  const pass = randomBytes(12).toString("hex");
  const id = await createUser(c.email, pass, {});
  colleagues.push({ ...c, id });
}

// NOT: PostgREST toplu insert'te satırlar arası eksik anahtarları sütun
// DEFAULT'u yerine NULL ile dolduruyor — bu yüzden her satırda aynı anahtar
// kümesi (license_number/licenses dahil) açıkça verilmeli.
const profilesRows = [
  {
    id: managerId, company_id: companyId, role: "manager", full_name: "Emre Yıldız",
    department: "Filo Yönetimi", avatar_url: "https://randomuser.me/api/portraits/men/67.jpg",
    notify_by_email: true, license_number: "", licenses: [],
  },
  {
    id: driverId, company_id: companyId, role: "user", full_name: "Mustafa Kaya",
    department: "Lojistik / Şoför", avatar_url: "https://randomuser.me/api/portraits/men/86.jpg",
    notify_by_email: true, license_number: "34 D 456789",
    licenses: [
      { class: "B", issueDate: "2013-04-12", expiryDate: "2033-04-12" },
      { class: "C", issueDate: "2019-09-01", expiryDate: "2029-09-01" },
    ],
  },
  ...colleagues.map((c) => ({
    id: c.id, company_id: companyId, role: c.role, full_name: c.fullName,
    department: c.dept, avatar_url: `https://randomuser.me/api/portraits/${c.avatar}.jpg`,
    notify_by_email: true,
    license_number: c.role === "user" ? `${pick(CITY_CODES)} D ${randInt(100000, 999999)}` : "",
    licenses: c.role === "user" ? [{ class: "B", issueDate: "2016-05-20", expiryDate: "2036-05-20" }] : [],
  })),
];
const { error: profErr } = await admin.from("profiles").insert(profilesRows);
if (profErr) throw profErr;
console.log("   6 profil oluşturuldu (1 yönetici, 4 şoför, 1 operatör)");

const allDrivers = [{ id: driverId, fullName: "Mustafa Kaya" }, ...colleagues.filter((c) => c.role === "user").map((c) => ({ id: c.id, fullName: c.fullName }))];

// ─── 3) Araçlar ─────────────────────────────────────────────
console.log("3) 50 araç üretiliyor...");
const VEHICLE_COUNT = 50;
const usedPlates = new Set();
const vehicleRows = [];
const vehicleMeta = []; // { profile, body }
for (let i = 0; i < VEHICLE_COUNT; i++) {
  const cat = CATALOG[i % CATALOG.length];
  const bodyKw = BODY_KEYWORDS[cat.body];
  let plate;
  do { plate = randomPlate(); } while (usedPlates.has(plate));
  usedPlates.add(plate);

  const profile = pickProfile();
  const year = randInt(2016, 2025);
  const isHeavy = cat.body === "truck" || cat.body === "van" || cat.body === "pickup";
  const mileage = isHeavy ? randInt(30000, 320000) : randInt(15000, 180000);

  const fuelType = isHeavy
    ? pickWeighted([["Dizel", 8], ["LPG", 1]])
    : pickWeighted([["Dizel", 4], ["Benzin", 4], ["Hibrit", 2], ["LPG", 2], ["Elektrik", 1]]);
  const transmission = pickWeighted([["Manuel", 4], ["Otomatik", 4], ["CVT", 1], ["DSG", 2], ["Yarı Otomatik", 1]]);

  const insuranceExpiry = docExpiryDate(profile.docBucket);
  const kaskoExpiry = addDays(insuranceExpiry, randInt(-20, 20));
  const inspectionExpiry = docExpiryDate(profile.docBucket === "critical" ? pick(["critical", "warning"]) : profile.docBucket);
  const hasGreenCard = rnd() < 0.4;
  const greenCardExpiry = hasGreenCard ? docExpiryDate(profile.docBucket) : null;

  const lastServiceDate = addDays(TODAY, -randInt(10, 200));
  const lastServiceMileage = Math.max(0, mileage - randInt(500, 12000));
  const nextServiceMileage = lastServiceMileage + 15000;

  const maintenanceItems = MAINTENANCE_TEMPLATES.map((tpl) => {
    const [lo, hi] = profile.wearRange;
    const wear = lo + rnd() * (hi - lo);
    const lastDoneMileage = tpl.intervalKm ? Math.max(0, Math.round(mileage - tpl.intervalKm * wear)) : Math.max(0, mileage - randInt(1000, 20000));
    const monthsAgo = tpl.intervalMonths ? Math.max(0, Math.round(tpl.intervalMonths * wear)) : randInt(1, 12);
    const lastDoneDate = addDays(TODAY, -monthsAgo * 30);
    return { id: tpl.id, name: tpl.name, lastDoneMileage, lastDoneDate: iso(lastDoneDate), intervalKm: tpl.intervalKm, intervalMonths: tpl.intervalMonths };
  });

  const tireStatus = pickWeighted([["Yazlık", 5], ["Dört Mevsim", 4], ["Kışlık", 1]]);
  const ownership = pickWeighted([["ozmal", 8], ["kiralik", 2]]);
  const rentCompany = ownership === "kiralik" ? pick(["Garenta", "Avis Filo Kiralama", "Budget Filo", "Enterprise Filo"]) : "";
  const ruhsatSahibi = ownership === "kiralik" ? rentCompany : COMPANY_NAME;

  const lockSeed = 1000 + i * 4;
  vehicleRows.push({
    id: randomUUID(),
    company_id: companyId,
    ownership_type: ownership,
    rent_company: rentCompany,
    ruhsat_sahibi: ruhsatSahibi,
    plate, brand: cat.brand, model: cat.model, year,
    color: pick(COLORS),
    image: carImage(lockSeed, bodyKw, 0),
    image_2: carImage(lockSeed, bodyKw, 1),
    image_3: carImage(lockSeed, bodyKw, 2),
    image_4: carImage(lockSeed, bodyKw, 3),
    image_position: 50, image_position_x: 50, image_zoom: 1,
    sort_order: i,
    mileage,
    engine_type: fuelType === "Elektrik" ? "Elektrik Motoru" : isHeavy ? "Turbo Dizel" : pick(["Turbo Benzin", "Turbo Dizel", "Atmosferik"]),
    engine_volume: fuelType === "Elektrik" ? "-" : isHeavy ? pick(["2.0", "2.2", "2.5", "12.8"]) : pick(["1.0", "1.4", "1.6", "1.8", "2.0"]),
    power: isHeavy ? `${randInt(120, 480)} hp` : `${randInt(75, 245)} hp`,
    fuel_type: fuelType,
    transmission,
    chassis_no: randomChassis(),
    tire_status: tireStatus,
    tire_brand: pick(TIRE_BRANDS),
    tire_size: isHeavy ? pick(["205/75R16C", "225/70R15C"]) : pick(["195/65R15", "205/55R16", "215/60R17", "225/45R18"]),
    tire_install_date: iso(addDays(TODAY, -randInt(30, 500))),
    tire_mileage: randInt(1000, 40000),
    battery_brand: pick(BATTERY_BRANDS),
    battery_capacity: isHeavy ? pick(["110Ah", "140Ah"]) : pick(["60Ah", "70Ah", "80Ah"]),
    battery_install_date: iso(addDays(TODAY, -randInt(30, 700))),
    insurance_company: pick(INSURERS),
    insurance_expiry: iso(insuranceExpiry),
    kasko_company: pick(INSURERS),
    kasko_expiry: iso(kaskoExpiry),
    green_card_company: hasGreenCard ? pick(INSURERS) : "",
    green_card_expiry: hasGreenCard ? iso(greenCardExpiry) : null,
    inspection_expiry: iso(inspectionExpiry),
    last_service_date: iso(lastServiceDate),
    last_service_mileage: lastServiceMileage,
    next_service_mileage: nextServiceMileage,
    maintenance_items: maintenanceItems,
    notes: pick(NOTES_POOL),
  });
  vehicleMeta.push({ profileName: profile.name, body: cat.body });
}

const { data: insertedVehicles, error: vehErr } = await admin.from("vehicles").insert(vehicleRows).select("id, plate, brand, model, last_service_date, last_service_mileage, mileage");
if (vehErr) throw vehErr;
console.log(`   ${insertedVehicles.length} araç eklendi`);

// ─── 4) Servis kayıtları ────────────────────────────────────
console.log("4) Servis kayıtları üretiliyor...");
const SERVICE_CENTERS = ["Bosch Car Service - Kadıköy", "Optimum Lastik & Bakım", "Mercedes Yetkili Servis - Ataşehir", "TotalEnergies Hızlı Bakım", "Filo Teknik Servis Merkezi"];
const SERVICE_TITLES = {
  routine: ["Periyodik Bakım", "Yağ ve Filtre Değişimi", "Genel Kontrol"],
  repair: ["Fren Sistemi Onarımı", "Süspansiyon Onarımı", "Elektrik Arıza Giderme"],
  tire: ["Lastik Değişimi", "Rot Balans", "Lastik Tamiri"],
  inspection: ["Araç Muayenesi"],
  battery: ["Akü Değişimi"],
  other: ["Klima Bakımı", "Cam Suyu / Sıvı Kontrolü"],
};
const serviceRecordRows = [];
for (const v of insertedVehicles) {
  const count = randInt(2, 4);
  let mileageCursor = v.last_service_mileage;
  let dateCursor = new Date(v.last_service_date);
  for (let j = 0; j < count; j++) {
    const type = pickWeighted([["routine", 5], ["repair", 2], ["tire", 2], ["inspection", 1], ["battery", 1], ["other", 1]]);
    serviceRecordRows.push({
      id: randomUUID(), company_id: companyId, vehicle_id: v.id,
      date: iso(dateCursor), type, title: pick(SERVICE_TITLES[type]),
      mileage: Math.max(0, mileageCursor),
      service_center: pick(SERVICE_CENTERS),
      notes: "",
    });
    mileageCursor -= randInt(3000, 15000);
    dateCursor = addDays(dateCursor, -randInt(30, 90));
  }
}
for (let i = 0; i < serviceRecordRows.length; i += 500) {
  const { error } = await admin.from("service_records").insert(serviceRecordRows.slice(i, i + 500));
  if (error) throw error;
}
console.log(`   ${serviceRecordRows.length} servis kaydı eklendi`);

// ─── 5) Araç atamaları ──────────────────────────────────────
console.log("5) Sürücü atamaları yapılıyor...");
const assignments = [];
const shuffled = [...insertedVehicles].sort(() => rnd() - 0.5);
let cursor = 0;
for (const drv of allDrivers) {
  const n = randInt(3, 5);
  for (let k = 0; k < n && cursor < shuffled.length; k++, cursor++) {
    assignments.push({ id: randomUUID(), vehicle_id: shuffled[cursor].id, driver_id: drv.id });
  }
}
const { error: asgErr } = await admin.from("vehicle_assignments").insert(assignments);
if (asgErr) throw asgErr;
console.log(`   ${assignments.length} araç sürücülere atandı`);

// atamaları driver bazında grupla (tasks üretimi için)
const assignmentsByDriver = new Map();
for (const a of assignments) {
  if (!assignmentsByDriver.has(a.driver_id)) assignmentsByDriver.set(a.driver_id, []);
  assignmentsByDriver.get(a.driver_id).push(a.vehicle_id);
}
const vehicleById = new Map(insertedVehicles.map((v) => [v.id, v]));

// ─── 6) Görevler (vehicle_tasks) ────────────────────────────
console.log("6) Görev geçmişi üretiliyor...");
const TASK_DESCRIPTIONS = ["Şube arası malzeme sevkiyatı", "Müşteri teslimatı", "Depo transferi", "Personel servisi", "Saha ziyareti", "Yakıt ikmali için sevkiyat merkezi"];
const taskRows = [];
for (const drv of allDrivers) {
  const vIds = assignmentsByDriver.get(drv.id) || [];
  if (vIds.length === 0) continue;
  const isHero = drv.id === driverId;
  const historyCount = isHero ? 9 : randInt(3, 5);
  let dayCursor = -2;
  for (let t = 0; t < historyCount; t++) {
    const vId = pick(vIds);
    const v = vehicleById.get(vId);
    const startKm = v.mileage - randInt(200, 4000) - t * 50;
    const distance = randInt(15, 380);
    const endKm = startKm + distance;
    const startTime = addDays(TODAY, dayCursor - randInt(0, 2));
    startTime.setHours(randInt(7, 16), randInt(0, 59), 0, 0);
    const endTime = new Date(startTime.getTime() + randInt(30, 240) * 60000);
    taskRows.push({
      id: randomUUID(), company_id: companyId, vehicle_id: vId, driver_id: drv.id,
      start_km: Math.max(0, startKm), end_km: Math.max(0, endKm), distance,
      description: pick(TASK_DESCRIPTIONS), status: "completed",
      start_time: startTime.toISOString(), end_time: endTime.toISOString(),
    });
    dayCursor -= randInt(1, 4);
  }
  // hero sürücü için 1 aktif görev
  if (isHero) {
    const vId = vIds[0];
    const v = vehicleById.get(vId);
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - 1, startTime.getMinutes() - 20);
    taskRows.push({
      id: randomUUID(), company_id: companyId, vehicle_id: vId, driver_id: drv.id,
      start_km: v.mileage, description: "Merkez depo - Bayrampaşa dağıtım turu",
      status: "active", start_time: startTime.toISOString(),
    });
  }
}
const { error: taskErr } = await admin.from("vehicle_tasks").insert(taskRows);
if (taskErr) throw taskErr;
console.log(`   ${taskRows.length} görev kaydı eklendi`);

// ─── 7) Arıza bildirimleri ──────────────────────────────────
console.log("7) Arıza bildirimleri üretiliyor...");
const REPORTS_DEF = [
  { category: "brake", severity: "high", status: "open", title: "Fren yaparken ses geliyor", description: "Özellikle düşük hızda fren yaparken ön taraftan metalik ses geliyor. Kontrol edilmesi gerekiyor." },
  { category: "tire", severity: "low", status: "resolved", title: "Ön sol lastik basıncı düşük", description: "Gösterge panelinde lastik basınç uyarısı yandı, basınç kontrolü yapıldı ve tamamlandı." },
  { category: "warning_light", severity: "critical", status: "in_progress", title: "Motor arıza lambası yandı", description: "Seyir halindeyken motor arıza lambası sabit yanmaya başladı, güç kaybı hissediliyor." },
  { category: "electrical", severity: "medium", status: "acknowledged", title: "Sağ sinyal lambası çalışmıyor", description: "Sağ arka sinyal lambası yanmıyor, ampul veya kablo kontrolü gerekiyor." },
];
const reportRows = [];
const reportLogRows = [];
for (let i = 0; i < REPORTS_DEF.length; i++) {
  const def = REPORTS_DEF[i];
  const reporterId = i < 2 ? driverId : pick(colleagues.filter((c) => c.role === "user")).id;
  const vId = (assignmentsByDriver.get(reporterId) || shuffled.map((v) => v.id))[0] || shuffled[i].id;
  const createdAt = addDays(TODAY, -randInt(2, 20));
  const reportId = randomUUID();
  reportRows.push({
    id: reportId, company_id: companyId, vehicle_id: vId, reporter_id: reporterId,
    title: def.title, description: def.description, category: def.category, severity: def.severity,
    status: def.status, resolution_note: def.status === "resolved" ? "Servise götürüldü, sorun giderildi." : "",
    created_at: createdAt.toISOString(), updated_at: createdAt.toISOString(),
    resolved_at: def.status === "resolved" ? addDays(createdAt, 1).toISOString() : null,
    photo_paths: [],
  });
  reportLogRows.push({ id: randomUUID(), report_id: reportId, company_id: companyId, actor_id: reporterId, from_status: null, to_status: "open", note: "Bildirim oluşturuldu.", created_at: createdAt.toISOString() });
  if (def.status !== "open") {
    reportLogRows.push({ id: randomUUID(), report_id: reportId, company_id: companyId, actor_id: managerId, from_status: "open", to_status: def.status, note: def.status === "resolved" ? "Servise götürüldü, sorun giderildi." : "İnceleniyor.", created_at: addDays(createdAt, 1).toISOString() });
  }
}
const { error: repErr } = await admin.from("vehicle_reports").insert(reportRows);
if (repErr) throw repErr;
const { error: repLogErr } = await admin.from("vehicle_report_logs").insert(reportLogRows);
if (repLogErr) throw repLogErr;
console.log(`   ${reportRows.length} arıza bildirimi + ${reportLogRows.length} log eklendi`);

// ─── 8) Bildirimler (zil) ───────────────────────────────────
console.log("8) Bildirimler üretiliyor...");
const notifRows = [];
function addNotif({ type, severity, title, body, url, vehicleId, plate, daysAgo, read }) {
  const createdAt = addDays(TODAY, -daysAgo);
  notifRows.push({
    id: randomUUID(), company_id: companyId, user_id: managerId, type, title, body,
    url: url || null, severity, vehicle_id: vehicleId || null, vehicle_plate: plate || null,
    meta: {}, created_at: createdAt.toISOString(),
    read_at: read ? addDays(createdAt, 0.2).toISOString() : null,
  });
}
addNotif({ type: "driver_new", severity: "info", title: "👋 Yeni Sürücü Katıldı", body: "Mustafa Kaya ekibe katıldı.", url: "/users", daysAgo: 14, read: true });
colleagues.forEach((c, idx) => addNotif({ type: "driver_new", severity: "info", title: "👋 Yeni Ekip Üyesi Katıldı", body: `${c.fullName} ekibe katıldı.`, url: "/users", daysAgo: 12 - idx, read: true }));
for (const r of reportRows) {
  addNotif({ type: "report_new", severity: r.severity === "critical" || r.severity === "high" ? "critical" : "warning", title: "🔧 Yeni Arıza Bildirimi", body: r.title, url: "/reports", vehicleId: r.vehicle_id, daysAgo: randInt(1, 15), read: r.status === "resolved" });
}
for (const t of taskRows.filter((t) => t.status === "completed").slice(0, 8)) {
  const v = vehicleById.get(t.vehicle_id);
  addNotif({ type: "task_end", severity: "info", title: "✅ Görev Tamamlandı", body: `${v.plate} aracıyla görev tamamlandı — ${t.distance} km.`, url: "/tasks", vehicleId: t.vehicle_id, plate: v.plate, daysAgo: randInt(1, 10), read: true });
}
for (const v of insertedVehicles.slice(0, 4)) {
  addNotif({ type: "vehicle_new", severity: "info", title: "🚘 Yeni Araç Eklendi", body: `${v.brand} ${v.model} (${v.plate}) filoya eklendi.`, url: "/vehicles", vehicleId: v.id, plate: v.plate, daysAgo: randInt(15, 30), read: true });
}
addNotif({ type: "task_start", severity: "info", title: "🚗 Görev Başladı", body: "Mustafa Kaya bir göreve başladı.", url: "/tasks", daysAgo: 0.05, read: false });
addNotif({ type: "report_new", severity: "critical", title: "🔧 Yeni Arıza Bildirimi", body: "Motor arıza lambası yandı", url: "/reports", daysAgo: 0.5, read: false });
const { error: notifErr } = await admin.from("notifications").insert(notifRows);
if (notifErr) throw notifErr;
console.log(`   ${notifRows.length} bildirim eklendi`);

// ─── 9) Servis sağlayıcıları ────────────────────────────────
console.log("9) Servis sağlayıcı defteri...");
const providerRows = [
  { id: randomUUID(), company_id: companyId, name: "Bosch Car Service - Kadıköy", phone: "0216 555 10 20", address: "Kadıköy, İstanbul", notes: "Genel bakım ve periyodik servis.", created_by: managerId },
  { id: randomUUID(), company_id: companyId, name: "Optimum Lastik & Bakım", phone: "0212 555 30 40", address: "Ümraniye, İstanbul", notes: "Lastik değişimi ve rot balans.", created_by: managerId },
  { id: randomUUID(), company_id: companyId, name: "Mercedes Yetkili Servis - Ataşehir", phone: "0216 555 50 60", address: "Ataşehir, İstanbul", notes: "Ticari araç ve binek yetkili servis.", created_by: managerId },
];
const { error: provErr } = await admin.from("service_providers").insert(providerRows);
if (provErr) throw provErr;

// ─── 10) Davet + audit log ───────────────────────────────────
console.log("10) Davet ve denetim kayıtları...");
const { data: companyRow } = await admin.from("companies").select("invite_code").eq("id", companyId).single();
const inviteRow = {
  id: randomUUID(), company_id: companyId, email: "yeni.operator@example.com", role: "operator",
  token: randomBytes(24).toString("hex"), status: "pending", invited_by: managerId,
  expires_at: addDays(TODAY, 5).toISOString(),
};
const { error: inviteErr } = await admin.from("company_invites").insert(inviteRow);
if (inviteErr) throw inviteErr;

const auditRows = [
  { id: randomUUID(), company_id: companyId, actor_id: managerId, actor_name: "Emre Yıldız", action: "invite_sent", entity_type: "invite", entity_id: inviteRow.id, entity_label: "yeni.operator@example.com", meta: { role: "operator" }, created_at: addDays(TODAY, -3).toISOString() },
  { id: randomUUID(), company_id: companyId, actor_id: managerId, actor_name: "Emre Yıldız", action: "role_changed", entity_type: "profile", entity_id: colleagues.find((c) => c.role === "operator").id, entity_label: "Barış Koç", meta: { from: "user", to: "operator" }, created_at: addDays(TODAY, -20).toISOString() },
];
const { error: auditErr } = await admin.from("audit_logs").insert(auditRows);
if (auditErr) throw auditErr;

// ─── 11) Geri bildirim ───────────────────────────────────────
const { error: fbErr } = await admin.from("feedback").insert({
  id: randomUUID(), company_id: companyId, user_id: driverId, type: "suggestion",
  message: "Görev ekranında aracın güncel yakıt seviyesini de girebilsek çok iyi olur.",
  page_url: "/tasks", status: "new",
});
if (fbErr) throw fbErr;
console.log("   davet, denetim kaydı ve geri bildirim eklendi");

// ─── 12) Araç belgeleri (Storage upload) ────────────────────
console.log("11) Örnek araç belgeleri yükleniyor (Storage)...");
function buildPlaceholderPdf(lines) {
  const content = lines.map((l, i) => `BT /F1 16 Tf 40 ${760 - i * 26} Td (${l.replace(/[()\\]/g, "")}) Tj ET`).join("\n");
  const stream = `q 1 1 1 rg 0 0 612 792 re f Q 0 0 0 rg\n${content}`;
  const objs = [];
  objs.push("1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj");
  objs.push("2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj");
  objs.push("3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj");
  objs.push("4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj");
  objs.push(`5 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const o of objs) { offsets.push(pdf.length); pdf += o + "\n"; }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const docCandidates = [...insertedVehicles].sort(() => rnd() - 0.5).slice(0, 14);
const docRows = [];
for (const v of docCandidates) {
  const ruhsatId = randomUUID();
  const ruhsatPath = `${companyId}/${v.id}/${ruhsatId}.pdf`;
  const ruhsatPdf = buildPlaceholderPdf(["ARAC RUHSATI (ORNEK - DEMO)", `Plaka: ${v.plate}`, `Marka/Model: ${v.brand} ${v.model}`, "CarsTrack Demo Verisi"]);
  const { error: e1 } = await admin.storage.from("vehicle-documents").upload(ruhsatPath, ruhsatPdf, { contentType: "application/pdf", upsert: false });
  if (e1) throw e1;
  docRows.push({ id: randomUUID(), company_id: companyId, vehicle_id: v.id, type: "ruhsat", title: "Araç Ruhsatı", file_path: ruhsatPath, file_name: `ruhsat-${v.plate.replace(/\s/g, "")}.pdf`, file_size: ruhsatPdf.length, mime_type: "application/pdf", notes: "" });

  const sigortaId = randomUUID();
  const sigortaPath = `${companyId}/${v.id}/${sigortaId}.pdf`;
  const sigortaPdf = buildPlaceholderPdf(["TRAFIK SIGORTASI POLICESI (ORNEK - DEMO)", `Plaka: ${v.plate}`, "CarsTrack Demo Verisi"]);
  const { error: e2 } = await admin.storage.from("vehicle-documents").upload(sigortaPath, sigortaPdf, { contentType: "application/pdf", upsert: false });
  if (e2) throw e2;
  docRows.push({ id: randomUUID(), company_id: companyId, vehicle_id: v.id, type: "trafik_sigortasi", title: "Trafik Sigortası Poliçesi", file_path: sigortaPath, file_name: `sigorta-${v.plate.replace(/\s/g, "")}.pdf`, file_size: sigortaPdf.length, mime_type: "application/pdf", notes: "" });
}
const { error: docErr } = await admin.from("vehicle_documents").insert(docRows);
if (docErr) throw docErr;
console.log(`   ${docRows.length} belge yüklendi (${docCandidates.length} araç için)`);

console.log("\n✅ Demo hesap oluşturuldu.");
console.log(`   Şirket: ${COMPANY_NAME} (${companyId})`);
console.log(`   Yönetici girişi: ${MANAGER_EMAIL} / ${DEMO_PASSWORD}`);
console.log(`   Sürücü girişi:   ${DRIVER_EMAIL} / ${DEMO_PASSWORD}`);
