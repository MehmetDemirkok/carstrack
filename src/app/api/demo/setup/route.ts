import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL        = "demo@carstrack.app";
const DEMO_PASSWORD     = "Demo1234!";
const DEMO_COMPANY_NAME = "Demo Filo A.Ş.";
const DEMO_FULL_NAME    = "Demo Kullanıcı";

const DRIVER_EMAIL     = "sofor@carstrack.app";
const DRIVER_PASSWORD  = "Sofor1234!";
const DRIVER_FULL_NAME = "Ahmet Sürücü";

// Always relative to today
const D = {
  ago: (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  },
  from: (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  },
};

// All 10 standard maintenance items — IDs match MAINTENANCE_TEMPLATES in store.ts
type MaintScenario = "healthy" | "warning" | "critical";

function makeMaintItems(mileage: number, scenario: MaintScenario) {
  if (scenario === "healthy") {
    return [
      { id: "oil",         name: "Yağ Değişimi",            lastDoneDate: D.ago(75),  lastDoneMileage: mileage - 7500,  intervalKm: 10000, intervalMonths: 12 },
      { id: "airfilter",   name: "Hava Filtresi",           lastDoneDate: D.ago(200), lastDoneMileage: mileage - 10000, intervalKm: 20000, intervalMonths: 24 },
      { id: "cabinfilter", name: "Kabin Filtresi",          lastDoneDate: D.ago(90),  lastDoneMileage: mileage - 8000,  intervalKm: 15000, intervalMonths: 12 },
      { id: "fuelfilter",  name: "Yakıt Filtresi",          lastDoneDate: D.ago(300), lastDoneMileage: mileage - 18000, intervalKm: 40000, intervalMonths: 48 },
      { id: "sparkplug",   name: "Buji",                    lastDoneDate: D.ago(350), lastDoneMileage: mileage - 14000, intervalKm: 30000, intervalMonths: 36 },
      { id: "timingbelt",  name: "Triger Kayışı / Zinciri", lastDoneDate: D.ago(480), lastDoneMileage: mileage - 28000, intervalKm: 80000, intervalMonths: 60 },
      { id: "brakefluid",  name: "Fren Hidroliği",          lastDoneDate: D.ago(280), intervalMonths: 24 },
      { id: "coolant",     name: "Antifriz",                lastDoneDate: D.ago(450), intervalMonths: 36 },
      { id: "brakefront",  name: "Ön Fren Balatası",        lastDoneDate: D.ago(320), lastDoneMileage: mileage - 18000, intervalKm: 40000 },
      { id: "brakerear",   name: "Arka Fren Balatası",      lastDoneDate: D.ago(280), lastDoneMileage: mileage - 14000, intervalKm: 60000 },
    ];
  }

  if (scenario === "warning") {
    return [
      { id: "oil",         name: "Yağ Değişimi",            lastDoneDate: D.ago(340), lastDoneMileage: mileage - 9100,  intervalKm: 10000, intervalMonths: 12 },
      { id: "airfilter",   name: "Hava Filtresi",           lastDoneDate: D.ago(680), lastDoneMileage: mileage - 18500, intervalKm: 20000, intervalMonths: 24 },
      { id: "cabinfilter", name: "Kabin Filtresi",          lastDoneDate: D.ago(340), lastDoneMileage: mileage - 13800, intervalKm: 15000, intervalMonths: 12 },
      { id: "fuelfilter",  name: "Yakıt Filtresi",          lastDoneDate: D.ago(400), lastDoneMileage: mileage - 22000, intervalKm: 40000, intervalMonths: 48 },
      { id: "sparkplug",   name: "Buji",                    lastDoneDate: D.ago(900), lastDoneMileage: mileage - 25000, intervalKm: 30000, intervalMonths: 36 },
      { id: "timingbelt",  name: "Triger Kayışı / Zinciri", lastDoneDate: D.ago(600), lastDoneMileage: mileage - 35000, intervalKm: 80000, intervalMonths: 60 },
      { id: "brakefluid",  name: "Fren Hidroliği",          lastDoneDate: D.ago(580), intervalMonths: 24 },
      { id: "coolant",     name: "Antifriz",                lastDoneDate: D.ago(700), intervalMonths: 36 },
      { id: "brakefront",  name: "Ön Fren Balatası",        lastDoneDate: D.ago(500), lastDoneMileage: mileage - 30000, intervalKm: 40000 },
      { id: "brakerear",   name: "Arka Fren Balatası",      lastDoneDate: D.ago(450), lastDoneMileage: mileage - 28000, intervalKm: 60000 },
    ];
  }

  // critical
  return [
    { id: "oil",         name: "Yağ Değişimi",            lastDoneDate: D.ago(430), lastDoneMileage: mileage - 12500, intervalKm: 10000, intervalMonths: 12 },
    { id: "airfilter",   name: "Hava Filtresi",           lastDoneDate: D.ago(870), lastDoneMileage: mileage - 23000, intervalKm: 20000, intervalMonths: 24 },
    { id: "cabinfilter", name: "Kabin Filtresi",          lastDoneDate: D.ago(430), lastDoneMileage: mileage - 17500, intervalKm: 15000, intervalMonths: 12 },
    { id: "fuelfilter",  name: "Yakıt Filtresi",          lastDoneDate: D.ago(1500), lastDoneMileage: mileage - 43000, intervalKm: 40000, intervalMonths: 48 },
    { id: "sparkplug",   name: "Buji",                    lastDoneDate: D.ago(1200), lastDoneMileage: mileage - 33000, intervalKm: 30000, intervalMonths: 36 },
    { id: "timingbelt",  name: "Triger Kayışı / Zinciri", lastDoneDate: D.ago(1950), lastDoneMileage: mileage - 82000, intervalKm: 80000, intervalMonths: 60 },
    { id: "brakefluid",  name: "Fren Hidroliği",          lastDoneDate: D.ago(900),  intervalMonths: 24 },
    { id: "coolant",     name: "Antifriz",                lastDoneDate: D.ago(1200), intervalMonths: 36 },
    { id: "brakefront",  name: "Ön Fren Balatası",        lastDoneDate: D.ago(700),  lastDoneMileage: mileage - 44000, intervalKm: 40000 },
    { id: "brakerear",   name: "Arka Fren Balatası",      lastDoneDate: D.ago(600),  lastDoneMileage: mileage - 63000, intervalKm: 60000 },
  ];
}

function buildVehicles(companyId: string) {
  return [
    // 1. BMW 320i — Sağlıklı, şirket yetkilisinin aracı
    {
      company_id: companyId,
      plate: "34 ABK 001",
      brand: "BMW", model: "320i", year: 2021, color: "Beyaz",
      mileage: 45200,
      engine_type: "Benzinli", engine_volume: "2.0", power: "184 HP",
      fuel_type: "Benzin", transmission: "Otomatik",
      chassis_no: "WBA5R11080G123456",
      tire_status: "Yazlık", tire_brand: "Michelin", tire_size: "225/45 R17",
      tire_install_date: D.ago(175), tire_mileage: 43000,
      battery_brand: "Varta", battery_capacity: "70 Ah", battery_install_date: D.ago(340),
      insurance_company: "Allianz Sigorta",
      insurance_expiry: D.from(95),
      green_card_company: "Allianz Sigorta",
      green_card_expiry: D.from(95),
      inspection_expiry: D.from(248),
      last_service_date: D.ago(75),
      last_service_mileage: 43200,
      next_service_mileage: 53200,
      maintenance_items: makeMaintItems(45200, "healthy"),
      notes: "Genel müdür aracı. Düzenli bakımları yetkili serviste yapılmaktadır.",
    },
    // 2. Volkswagen Tiguan — Uyarı, sigorta yakında bitiyor
    {
      company_id: companyId,
      plate: "06 VWK 789",
      brand: "Volkswagen", model: "Tiguan", year: 2019, color: "Gri",
      mileage: 87400,
      engine_type: "Dizel", engine_volume: "2.0 TDI", power: "150 HP",
      fuel_type: "Dizel", transmission: "DSG",
      chassis_no: "WVGZZZ5NZKW054321",
      tire_status: "Dört Mevsim", tire_brand: "Continental", tire_size: "215/60 R17",
      tire_install_date: D.ago(85), tire_mileage: 85000,
      battery_brand: "Bosch", battery_capacity: "68 Ah", battery_install_date: D.ago(710),
      insurance_company: "Axa Sigorta",
      insurance_expiry: D.from(18),
      green_card_company: "Axa Sigorta",
      green_card_expiry: D.from(18),
      inspection_expiry: D.from(130),
      last_service_date: D.ago(340),
      last_service_mileage: 78500,
      next_service_mileage: 97000,
      maintenance_items: makeMaintItems(87400, "warning"),
      notes: "Satış ekibi aracı. Sigorta yenilenmesi 18 gün içinde yapılmalı!",
    },
    // 3. Toyota Corolla Hybrid — Mükemmel durum
    {
      company_id: companyId,
      plate: "35 TYK 234",
      brand: "Toyota", model: "Corolla", year: 2022, color: "Mavi",
      mileage: 28100,
      engine_type: "Hibrit", engine_volume: "1.8", power: "122 HP",
      fuel_type: "Hibrit", transmission: "CVT",
      chassis_no: "SB1ZS3JE0NE087654",
      tire_status: "Yazlık", tire_brand: "Bridgestone", tire_size: "195/65 R15",
      tire_install_date: D.ago(32), tire_mileage: 27800,
      battery_brand: "Panasonic", battery_capacity: "Hibrit Paketi", battery_install_date: D.ago(55),
      insurance_company: "Güneş Sigorta",
      insurance_expiry: D.from(192),
      green_card_company: "Güneş Sigorta",
      green_card_expiry: D.from(165),
      inspection_expiry: D.from(338),
      last_service_date: D.ago(75),
      last_service_mileage: 27900,
      next_service_mileage: 37900,
      maintenance_items: makeMaintItems(28100, "healthy"),
      notes: "İdari işler aracı. Filonun en yeni aracı, tüm bakımlar yetkili serviste.",
    },
    // 4. Mercedes E200 — Kritik durum, sigorta ve muayene geçmiş
    {
      company_id: companyId,
      plate: "01 MRC 567",
      brand: "Mercedes", model: "E200", year: 2018, color: "Siyah",
      mileage: 156300,
      engine_type: "Benzinli", engine_volume: "2.0", power: "197 HP",
      fuel_type: "Benzin", transmission: "Otomatik",
      chassis_no: "WDB2130501A456789",
      tire_status: "Kışlık",
      tire_brand: "Pirelli", tire_size: "245/45 R18",
      tire_install_date: D.ago(215), tire_mileage: 149000,
      battery_brand: "Varta", battery_capacity: "80 Ah", battery_install_date: D.ago(1090),
      insurance_company: "Generali Sigorta",
      insurance_expiry: D.ago(12),
      green_card_company: "Generali Sigorta",
      green_card_expiry: D.ago(12),
      inspection_expiry: D.ago(65),
      last_service_date: D.ago(430),
      last_service_mileage: 144000,
      next_service_mileage: 166000,
      maintenance_items: makeMaintItems(156300, "critical"),
      notes: "Eski genel müdür aracı. Sigorta ve muayene süresi DOLMUŞ — acil yenileme gerekiyor!",
    },
    // 5. Ford Transit — Orta durum, muayene 28 günde
    {
      company_id: companyId,
      plate: "34 FRD 890",
      brand: "Ford", model: "Transit", year: 2020, color: "Beyaz",
      mileage: 112800,
      engine_type: "Dizel", engine_volume: "2.0 EcoBlue", power: "130 HP",
      fuel_type: "Dizel", transmission: "Manuel",
      chassis_no: "WF0XXXTTGXKB12345",
      tire_status: "Yazlık", tire_brand: "Goodyear", tire_size: "235/65 R16C",
      tire_install_date: D.ago(145), tire_mileage: 108000,
      battery_brand: "Exide", battery_capacity: "95 Ah", battery_install_date: D.ago(395),
      insurance_company: "HDI Sigorta",
      insurance_expiry: D.from(50),
      green_card_company: "HDI Sigorta",
      green_card_expiry: D.from(50),
      inspection_expiry: D.from(28),
      last_service_date: D.ago(340),
      last_service_mileage: 103800,
      next_service_mileage: 122000,
      maintenance_items: makeMaintItems(112800, "warning"),
      notes: "Lojistik aracı. Muayene tarihi 28 gün içinde. Çok yüklü kullanım.",
    },
    // 6. Renault Megane — İyi durum
    {
      company_id: companyId,
      plate: "34 RNO 112",
      brand: "Renault", model: "Megane", year: 2022, color: "Kırmızı",
      mileage: 31500,
      engine_type: "Benzinli", engine_volume: "1.3 TCe", power: "140 HP",
      fuel_type: "Benzin", transmission: "Otomatik",
      chassis_no: "VF1BMA00067890123",
      tire_status: "Yazlık", tire_brand: "Michelin", tire_size: "205/55 R16",
      tire_install_date: D.ago(44), tire_mileage: 30800,
      battery_brand: "Varta", battery_capacity: "60 Ah", battery_install_date: D.ago(175),
      insurance_company: "Mapfre Sigorta",
      insurance_expiry: D.from(218),
      green_card_company: "Mapfre Sigorta",
      green_card_expiry: D.from(190),
      inspection_expiry: D.from(312),
      last_service_date: D.ago(75),
      last_service_mileage: 30000,
      next_service_mileage: 40000,
      maintenance_items: makeMaintItems(31500, "healthy"),
      notes: "Pazarlama ekibi aracı. Tüm bakımlar zamanında yapılmaktadır.",
    },
    // 7. Hyundai Tucson Hybrid — Mükemmel durum, en yeni alım
    {
      company_id: companyId,
      plate: "06 HYN 445",
      brand: "Hyundai", model: "Tucson", year: 2023, color: "Gümüş",
      mileage: 17800,
      engine_type: "Hibrit", engine_volume: "1.6 T-GDI", power: "230 HP",
      fuel_type: "Hibrit", transmission: "Otomatik",
      chassis_no: "TMAJ3812XPJ012345",
      tire_status: "Yazlık", tire_brand: "Hankook", tire_size: "235/55 R18",
      tire_install_date: D.ago(22), tire_mileage: 17200,
      battery_brand: "Hyundai OEM", battery_capacity: "Hibrit Paketi", battery_install_date: D.ago(32),
      insurance_company: "Zurich Sigorta",
      insurance_expiry: D.from(332),
      green_card_company: "Zurich Sigorta",
      green_card_expiry: D.from(300),
      inspection_expiry: D.from(723),
      last_service_date: D.ago(30),
      last_service_mileage: 15000,
      next_service_mileage: 25000,
      maintenance_items: makeMaintItems(17800, "healthy"),
      notes: "Yönetim kurulu aracı. Bu yıl teslim alındı, garanti kapsamında.",
    },
    // 8. Škoda Octavia — İyi durum, 50K bakımı yeni yapıldı
    {
      company_id: companyId,
      plate: "35 SKD 778",
      brand: "Škoda", model: "Octavia", year: 2021, color: "Lacivert",
      mileage: 52400,
      engine_type: "Dizel", engine_volume: "2.0 TDI", power: "150 HP",
      fuel_type: "Dizel", transmission: "DSG",
      chassis_no: "TMBCA9NE6M0098765",
      tire_status: "Yazlık", tire_brand: "Continental", tire_size: "225/45 R17",
      tire_install_date: D.ago(58), tire_mileage: 51000,
      battery_brand: "Bosch", battery_capacity: "72 Ah", battery_install_date: D.ago(295),
      insurance_company: "Allianz Sigorta",
      insurance_expiry: D.from(178),
      green_card_company: "Allianz Sigorta",
      green_card_expiry: D.from(150),
      inspection_expiry: D.from(258),
      last_service_date: D.ago(52),
      last_service_mileage: 50000,
      next_service_mileage: 60000,
      maintenance_items: makeMaintItems(52400, "healthy"),
      notes: "Teknik ekip aracı. 50.000 km büyük bakımı tamamlandı.",
    },
    // 9. Honda Civic — Mükemmel durum
    {
      company_id: companyId,
      plate: "34 HND 221",
      brand: "Honda", model: "Civic", year: 2023, color: "Antrasit",
      mileage: 21200,
      engine_type: "Benzinli", engine_volume: "1.5 VTEC Turbo", power: "182 HP",
      fuel_type: "Benzin", transmission: "CVT",
      chassis_no: "SHHFK87680U345678",
      tire_status: "Yazlık", tire_brand: "Bridgestone", tire_size: "215/50 R17",
      tire_install_date: D.ago(38), tire_mileage: 20500,
      battery_brand: "Bosch", battery_capacity: "48 Ah", battery_install_date: D.ago(88),
      insurance_company: "Güneş Sigorta",
      insurance_expiry: D.from(292),
      green_card_company: "Güneş Sigorta",
      green_card_expiry: D.from(260),
      inspection_expiry: D.from(683),
      last_service_date: D.ago(20),
      last_service_mileage: 20000,
      next_service_mileage: 30000,
      maintenance_items: makeMaintItems(21200, "healthy"),
      notes: "İnsan kaynakları aracı. Periyodik bakımlar yetkili serviste yapılıyor.",
    },
    // 10. Peugeot 3008 — Uyarı seviyesi
    {
      company_id: companyId,
      plate: "07 PGT 334",
      brand: "Peugeot", model: "3008", year: 2021, color: "Turuncu",
      mileage: 63800,
      engine_type: "Dizel", engine_volume: "1.5 BlueHDi", power: "130 HP",
      fuel_type: "Dizel", transmission: "Otomatik",
      chassis_no: "VF3MCYHZXLS456789",
      tire_status: "Yazlık", tire_brand: "Michelin", tire_size: "225/55 R18",
      tire_install_date: D.ago(72), tire_mileage: 62000,
      battery_brand: "Exide", battery_capacity: "70 Ah", battery_install_date: D.ago(245),
      insurance_company: "Groupama Sigorta",
      insurance_expiry: D.from(60),
      green_card_company: "Groupama Sigorta",
      green_card_expiry: D.from(60),
      inspection_expiry: D.from(225),
      last_service_date: D.ago(340),
      last_service_mileage: 54600,
      next_service_mileage: 73000,
      maintenance_items: makeMaintItems(63800, "warning"),
      notes: "Bölge müdürü aracı. Bakım ve sigorta takibi yapılması gerekiyor.",
    },
  ];
}

function tsTask(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function buildTasks(companyId: string, driverId: string, vehicleMap: Record<string, string>) {
  const v = (plate: string) => vehicleMap[plate] ?? Object.values(vehicleMap)[0];
  return [
    // 1. Bugün — aktif görev
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 ABK 001"),
      start_km: 45200, end_km: null, distance: null,
      description: "Atatürk Havalimanı VIP karşılama transferi",
      status: "active",
      start_time: tsTask(0, 8, 30), end_time: null,
    },
    // 2. Dün
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 RNO 112"),
      start_km: 31200, end_km: 31500, distance: 300,
      description: "Yönetim toplantısı transferi — Maslak Ofis",
      status: "completed",
      start_time: tsTask(1, 9, 0), end_time: tsTask(1, 12, 30),
    },
    // 3. 3 gün önce
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 ABK 001"),
      start_km: 44900, end_km: 45200, distance: 300,
      description: "Havalimanı VIP transferi — misafir ekibi",
      status: "completed",
      start_time: tsTask(3, 6, 45), end_time: tsTask(3, 9, 15),
    },
    // 4. 5 gün önce
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("06 VWK 789"),
      start_km: 87400, end_km: 87612, distance: 212,
      description: "Levent ofisi müşteri ziyareti",
      status: "completed",
      start_time: tsTask(5, 9, 0), end_time: tsTask(5, 11, 30),
    },
    // 5. 8 gün önce
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("35 TYK 234"),
      start_km: 27960, end_km: 28100, distance: 140,
      description: "Şehir içi evrak teslimatı — Beşiktaş noterlik",
      status: "completed",
      start_time: tsTask(8, 14, 0), end_time: tsTask(8, 15, 45),
    },
    // 6. 12 gün önce
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 FRD 890"),
      start_km: 112600, end_km: 112800, distance: 200,
      description: "Depo teslimatı — İkitelli Lojistik Merkezi",
      status: "completed",
      start_time: tsTask(12, 8, 0), end_time: tsTask(12, 11, 0),
    },
    // 7. 18 gün önce
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("35 SKD 778"),
      start_km: 51800, end_km: 52100, distance: 300,
      description: "Araç servise götürme ve teslim alma — Škoda İzmir",
      status: "completed",
      start_time: tsTask(18, 10, 0), end_time: tsTask(18, 14, 30),
    },
    // 8. 25 gün önce
    {
      company_id: companyId, driver_id: driverId,
      vehicle_id: v("34 FRD 890"),
      start_km: 111800, end_km: 112600, distance: 800,
      description: "Şehirlerarası kargo nakliyesi — İstanbul → Ankara",
      status: "completed",
      start_time: tsTask(25, 7, 0), end_time: tsTask(25, 15, 0),
    },
  ];
}

function buildServiceRecords(vehicleMap: Record<string, string>, companyId: string) {
  const [bmwId, vwId, toyotaId, mercedesId, fordId, renaultId, hyundaiId, skodaId, hondaId, peugeotId] = [
    vehicleMap["34 ABK 001"],
    vehicleMap["06 VWK 789"],
    vehicleMap["35 TYK 234"],
    vehicleMap["01 MRC 567"],
    vehicleMap["34 FRD 890"],
    vehicleMap["34 RNO 112"],
    vehicleMap["06 HYN 445"],
    vehicleMap["35 SKD 778"],
    vehicleMap["34 HND 221"],
    vehicleMap["07 PGT 334"],
  ];

  return [
    // BMW 320i
    { vehicle_id: bmwId, company_id: companyId, date: D.ago(75),  type: "routine",    title: "Periyodik Bakım",         mileage: 43200, service_center: "BMW Yetkili Servis İstanbul", notes: "Yağ değişimi, hava/kabin filtresi, genel kontrol tamamlandı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.ago(175), type: "tire",       title: "Yazlık Lastik Montajı",   mileage: 41500, service_center: "Michelin Lastik Merkezi",       notes: "4 adet Michelin Pilot Sport 5 takıldı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.ago(340), type: "battery",    title: "Akü Değişimi",            mileage: 39000, service_center: "BMW Yetkili Servis İstanbul", notes: "Varta Silver Dynamic 70Ah takıldı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.ago(450), type: "routine",    title: "Periyodik Bakım",         mileage: 35000, service_center: "BMW Yetkili Servis İstanbul", notes: "35.000 km standart bakımı yapıldı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.ago(620), type: "inspection", title: "Zorunlu Muayene",         mileage: 30500, service_center: "TÜVTÜRK Kadıköy",            notes: "Araç muayeneden sorunsuz geçti." },

    // VW Tiguan
    { vehicle_id: vwId, company_id: companyId, date: D.ago(85),  type: "tire",    title: "Dört Mevsim Lastik",      mileage: 85000, service_center: "Continental Yetkili Bayi Ankara", notes: "4 adet Continental AllSeasonContact 2 takıldı." },
    { vehicle_id: vwId, company_id: companyId, date: D.ago(340), type: "routine", title: "Periyodik Bakım",         mileage: 78500, service_center: "VW Yetkili Servis Ankara",         notes: "Yağ değişimi, fren kontrolü yapıldı. Ön balata yakında değişmeli." },
    { vehicle_id: vwId, company_id: companyId, date: D.ago(560), type: "repair",  title: "Ön Fren Sistemi Onarımı", mileage: 68000, service_center: "VW Yetkili Servis Ankara",         notes: "Sol ön fren diski ve balata değişimi. Kaliper temizlendi." },
    { vehicle_id: vwId, company_id: companyId, date: D.ago(780), type: "routine", title: "Periyodik Bakım",         mileage: 57000, service_center: "VW Yetkili Servis Ankara",         notes: "Standart dizel bakımı, yakıt filtresi değiştirildi." },

    // Toyota Corolla
    { vehicle_id: toyotaId, company_id: companyId, date: D.ago(32), type: "tire",    title: "Yazlık Lastik Montajı", mileage: 27800, service_center: "Bridgestone Yetkili Bayi İzmir",       notes: "4 adet Bridgestone Turanza 6 takıldı." },
    { vehicle_id: toyotaId, company_id: companyId, date: D.ago(75), type: "routine", title: "Periyodik Bakım",       mileage: 27900, service_center: "Toyota Yetkili Servis İzmir",           notes: "Hibrit sistem kontrolü, yağ değişimi. Sistem normal çalışıyor." },
    { vehicle_id: toyotaId, company_id: companyId, date: D.ago(310), type: "routine",    title: "20.000 km Bakımı",    mileage: 20000, service_center: "Toyota Yetkili Servis İzmir", notes: "20.000 km periyodik bakımı yapıldı." },
    { vehicle_id: toyotaId, company_id: companyId, date: D.ago(480), type: "inspection", title: "Zorunlu Muayene",    mileage: 15000, service_center: "TÜVTÜRK İzmir",               notes: "Muayeneden geçti." },

    // Mercedes E200
    { vehicle_id: mercedesId, company_id: companyId, date: D.ago(430),  type: "routine", title: "Periyodik Bakım",         mileage: 144000, service_center: "Mercedes Yetkili Servis Ankara", notes: "Yağ ve filtreler değiştirildi. Birçok kalem ertelenmiş durumda." },
    { vehicle_id: mercedesId, company_id: companyId, date: D.ago(650),  type: "repair",  title: "Şanzıman Yağ Değişimi",   mileage: 133000, service_center: "Mercedes Yetkili Servis Ankara", notes: "Otomatik şanzıman yağı ve filtresi yenilendi." },
    { vehicle_id: mercedesId, company_id: companyId, date: D.ago(900),  type: "routine", title: "Periyodik Bakım",         mileage: 122000, service_center: "Mercedes Yetkili Servis Ankara", notes: "Triger, antifriz, yağ değişimi yapıldı." },
    { vehicle_id: mercedesId, company_id: companyId, date: D.ago(1200), type: "repair",  title: "Soğutma Sistemi Onarımı", mileage: 108000, service_center: "Özel Servis Ankara",              notes: "Termostat ve su pompası değişimi." },

    // Ford Transit
    { vehicle_id: fordId, company_id: companyId, date: D.ago(145), type: "tire",    title: "Yazlık Lastik Takımı",  mileage: 108000, service_center: "Goodyear Yetkili Bayi",           notes: "4 adet Goodyear Cargo Vector 2 ticari lastik takıldı." },
    { vehicle_id: fordId, company_id: companyId, date: D.ago(340), type: "routine", title: "Periyodik Bakım",       mileage: 103800, service_center: "Ford Yetkili Servis İstanbul",     notes: "Dizel filtreler, yağ değişimi yapıldı. Hava filtresi uyarısı var." },
    { vehicle_id: fordId, company_id: companyId, date: D.ago(520), type: "repair",  title: "Fren Balata Değişimi",  mileage: 94000,  service_center: "Ford Yetkili Servis İstanbul",     notes: "Ön ve arka balata takımı yenilendi." },
    { vehicle_id: fordId, company_id: companyId, date: D.ago(680), type: "routine", title: "Periyodik Bakım",       mileage: 84000,  service_center: "Ford Yetkili Servis İstanbul",     notes: "Standart 10.000 km bakımı yapıldı." },

    // Renault Megane
    { vehicle_id: renaultId, company_id: companyId, date: D.ago(44),  type: "tire",       title: "Yazlık Lastik Montajı", mileage: 30800, service_center: "Michelin Yetkili Bayi İstanbul",       notes: "4 adet Michelin Energy Saver+ takıldı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.ago(75),  type: "routine",    title: "30.000 km Periyodik",   mileage: 30000, service_center: "Renault Yetkili Servis İstanbul",       notes: "30.000 km bakımı: yağ, filtre, genel kontrol tamamlandı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.ago(175), type: "battery",    title: "Akü Değişimi",          mileage: 26000, service_center: "Renault Yetkili Servis İstanbul",       notes: "Varta 60Ah akü takıldı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.ago(340), type: "inspection", title: "Zorunlu Muayene",       mileage: 22000, service_center: "TÜVTÜRK İstanbul",                      notes: "Araç muayeneden sorunsuz geçti." },
    { vehicle_id: renaultId, company_id: companyId, date: D.ago(500), type: "routine",    title: "20.000 km Periyodik",   mileage: 20000, service_center: "Renault Yetkili Servis İstanbul",       notes: "20.000 km bakımı yapıldı." },

    // Hyundai Tucson
    { vehicle_id: hyundaiId, company_id: companyId, date: D.ago(22), type: "tire",    title: "Yazlık Lastik Montajı",  mileage: 17200, service_center: "Hankook Yetkili Bayi Ankara",        notes: "4 adet Hankook Ventus S1 Evo 3 takıldı." },
    { vehicle_id: hyundaiId, company_id: companyId, date: D.ago(30), type: "routine", title: "15.000 km İlk Büyük Bakım", mileage: 15000, service_center: "Hyundai Yetkili Servis Ankara", notes: "15.000 km periyodik bakım: yağ, filtreler yenilendi. Hibrit sistem nominal." },
    { vehicle_id: hyundaiId, company_id: companyId, date: D.ago(210), type: "routine", title: "5.000 km İlk Bakım",    mileage: 5000,  service_center: "Hyundai Yetkili Servis Ankara",        notes: "Garanti kapsamı 5.000 km bakımı tamamlandı." },

    // Škoda Octavia
    { vehicle_id: skodaId, company_id: companyId, date: D.ago(52), type: "routine",    title: "50.000 km Büyük Bakım",  mileage: 50000, service_center: "Škoda Yetkili Servis İzmir",       notes: "Büyük bakım: yağ, hava/kabin/yakıt filtreleri, fren sıvısı, buji değişimi." },
    { vehicle_id: skodaId, company_id: companyId, date: D.ago(58), type: "tire",       title: "Yazlık Lastik Takımı",   mileage: 51000, service_center: "Continental Yetkili Bayi İzmir",    notes: "4 adet Continental SportContact 7 takıldı." },
    { vehicle_id: skodaId, company_id: companyId, date: D.ago(295), type: "battery",   title: "Akü Değişimi",           mileage: 43000, service_center: "Škoda Yetkili Servis İzmir",       notes: "Bosch S5 72Ah akü takıldı." },
    { vehicle_id: skodaId, company_id: companyId, date: D.ago(420), type: "routine",   title: "40.000 km Periyodik",    mileage: 40000, service_center: "Škoda Yetkili Servis İzmir",       notes: "40.000 km bakımı yapıldı." },
    { vehicle_id: skodaId, company_id: companyId, date: D.ago(600), type: "inspection", title: "Zorunlu Muayene",       mileage: 33000, service_center: "TÜVTÜRK İzmir",                    notes: "Muayeneden geçti." },

    // Honda Civic
    { vehicle_id: hondaId, company_id: companyId, date: D.ago(20), type: "routine", title: "20.000 km Periyodik",    mileage: 20000, service_center: "Honda Yetkili Servis İstanbul",     notes: "Yağ, hava filtresi, genel kontrol yapıldı." },
    { vehicle_id: hondaId, company_id: companyId, date: D.ago(38), type: "tire",    title: "Yazlık Lastik Montajı",  mileage: 20500, service_center: "Bridgestone Yetkili Bayi İstanbul", notes: "4 adet Bridgestone Turanza 6 takıldı." },
    { vehicle_id: hondaId, company_id: companyId, date: D.ago(88), type: "battery", title: "Akü Değişimi",           mileage: 18500, service_center: "Honda Yetkili Servis İstanbul",     notes: "Bosch S4 48Ah akü takıldı." },
    { vehicle_id: hondaId, company_id: companyId, date: D.ago(360), type: "routine", title: "10.000 km İlk Bakım",   mileage: 10000, service_center: "Honda Yetkili Servis İstanbul",     notes: "10.000 km garanti bakımı tamamlandı." },

    // Peugeot 3008
    { vehicle_id: peugeotId, company_id: companyId, date: D.ago(72),  type: "tire",       title: "Yazlık Lastik Montajı", mileage: 62000, service_center: "Michelin Yetkili Bayi Antalya",      notes: "4 adet Michelin Pilot Sport 5 SUV takıldı." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.ago(340), type: "routine",    title: "Periyodik Bakım",       mileage: 54600, service_center: "Peugeot Yetkili Servis Antalya",     notes: "Yağ, dizel filtre, klima bakımı yapıldı. Buji ve hava filtresi yakında." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.ago(500), type: "inspection", title: "Zorunlu Muayene",       mileage: 46000, service_center: "TÜVTÜRK Antalya",                    notes: "Muayeneden geçti." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.ago(620), type: "routine",    title: "Periyodik Bakım",       mileage: 38000, service_center: "Peugeot Yetkili Servis Antalya",     notes: "Standart 10.000 km bakımı yapıldı." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.ago(750), type: "repair",     title: "Klima Bakımı & Gaz",    mileage: 31000, service_center: "Peugeot Yetkili Servis Antalya",     notes: "Klima gazı R134a dolduruldu, filtre ve kurutucu değiştirildi." },
  ];
}

export async function POST() {
  try {
    const admin = createAdminClient();

    // 1. Find or create demo user
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;

    let userId: string;
    let companyId: string;
    const existing = users.find((u) => u.email === DEMO_EMAIL);

    if (existing) {
      userId = existing.id;

      const { data: profile } = await admin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      if (!profile?.company_id) {
        return NextResponse.json({ error: "Demo profil bozuk." }, { status: 500 });
      }
      companyId = profile.company_id;
    } else {
      // Create demo company
      const { data: company, error: companyErr } = await admin
        .from("companies")
        .insert({ name: DEMO_COMPANY_NAME, invite_code: "DEMO0000" })
        .select("id")
        .single();
      if (companyErr) throw companyErr;
      companyId = company.id;

      // Create demo user
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { company_id: companyId },
      });
      if (authErr) throw authErr;
      userId = authData.user.id;

      // Create demo profile (manager)
      const { error: profileErr } = await admin.from("profiles").insert({
        id: userId,
        company_id: companyId,
        role: "manager",
        full_name: DEMO_FULL_NAME,
      });
      if (profileErr) throw profileErr;
    }

    // 2. Always wipe and re-seed vehicles + service records
    await admin.from("service_records").delete().eq("company_id", companyId);
    await admin.from("vehicles").delete().eq("company_id", companyId);

    // 3. Seed vehicles
    const vehicleRows = buildVehicles(companyId);
    const { data: insertedVehicles, error: vehicleErr } = await admin
      .from("vehicles")
      .insert(vehicleRows)
      .select("id, plate");
    if (vehicleErr) throw vehicleErr;

    const vehicleMap: Record<string, string> = {};
    for (const v of insertedVehicles ?? []) vehicleMap[v.plate] = v.id;

    // 4. Seed service records
    const recordRows = buildServiceRecords(vehicleMap, companyId);
    const { error: recordErr } = await admin.from("service_records").insert(recordRows);
    if (recordErr) throw recordErr;

    // 5. Find or create driver user
    const driverExisting = users.find((u) => u.email === DRIVER_EMAIL);
    let driverId: string;

    if (driverExisting) {
      driverId = driverExisting.id;
      await admin.auth.admin.updateUserById(driverId, {
        user_metadata: { company_id: companyId },
      });
    } else {
      const { data: driverAuth, error: driverAuthErr } = await admin.auth.admin.createUser({
        email: DRIVER_EMAIL,
        password: DRIVER_PASSWORD,
        email_confirm: true,
        user_metadata: { company_id: companyId },
      });
      if (driverAuthErr) throw driverAuthErr;
      driverId = driverAuth.user.id;

      const { error: driverProfileErr } = await admin.from("profiles").insert({
        id: driverId,
        company_id: companyId,
        role: "driver",
        full_name: DRIVER_FULL_NAME,
      });
      if (driverProfileErr) throw driverProfileErr;
    }

    // 6. Always re-seed tasks
    await admin.from("vehicle_tasks").delete().eq("driver_id", driverId);
    const taskRows = buildTasks(companyId, driverId, vehicleMap);
    const { error: taskErr } = await admin.from("vehicle_tasks").insert(taskRows);
    if (taskErr) throw taskErr;

    return NextResponse.json({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  } catch (err: unknown) {
    console.error("Demo setup error:", err);
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
