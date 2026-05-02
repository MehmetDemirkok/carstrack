import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL = "demo@carstrack.app";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_COMPANY_NAME = "Demo Filo A.Ş.";
const DEMO_FULL_NAME = "Demo Kullanıcı";

// Relative to 2026-05-02
const D = {
  daysAgo: (n: number) => {
    const d = new Date("2026-05-02");
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  },
  daysFromNow: (n: number) => {
    const d = new Date("2026-05-02");
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  },
};

function makeMaintItems(overrides: { oil?: boolean; brake?: boolean; air?: boolean; tire?: boolean } = {}) {
  return [
    {
      id: "yag-filtresi",
      name: "Yağ & Filtre",
      lastDoneDate: overrides.oil ? D.daysAgo(320) : D.daysAgo(85),
      lastDoneMileage: overrides.oil ? 40000 : 43200,
      intervalKm: 10000,
      intervalMonths: 12,
    },
    {
      id: "fren-balata",
      name: "Fren Balataları",
      lastDoneDate: overrides.brake ? D.daysAgo(500) : D.daysAgo(180),
      lastDoneMileage: overrides.brake ? 30000 : 42000,
      intervalKm: 30000,
      intervalMonths: 24,
    },
    {
      id: "hava-filtresi",
      name: "Hava Filtresi",
      lastDoneDate: overrides.air ? D.daysAgo(400) : D.daysAgo(90),
      lastDoneMileage: overrides.air ? 35000 : 43100,
      intervalKm: 20000,
      intervalMonths: 18,
    },
    {
      id: "antifriz",
      name: "Antifriz",
      lastDoneDate: D.daysAgo(200),
      lastDoneMileage: 41000,
      intervalKm: 40000,
      intervalMonths: 24,
    },
    {
      id: "triger",
      name: "Triger Kayışı",
      lastDoneDate: overrides.tire ? D.daysAgo(720) : D.daysAgo(300),
      lastDoneMileage: overrides.tire ? 80000 : 105000,
      intervalKm: 60000,
      intervalMonths: 48,
    },
  ];
}

function buildVehicles(companyId: string) {
  return [
    // 1. BMW 320i – İyi durum
    {
      company_id: companyId,
      plate: "34 ABK 001",
      brand: "BMW",
      model: "320i",
      year: 2021,
      color: "Beyaz",
      mileage: 45200,
      engine_type: "Benzinli",
      engine_volume: "2.0",
      power: "184 HP",
      fuel_type: "Benzin",
      transmission: "Otomatik",
      chassis_no: "WBA5R11080G123456",
      tire_status: "Yazlık",
      tire_brand: "Michelin",
      tire_size: "225/45 R17",
      tire_install_date: D.daysAgo(180),
      tire_mileage: 43000,
      battery_brand: "Varta",
      battery_capacity: "70 Ah",
      battery_install_date: D.daysAgo(365),
      insurance_company: "Allianz Sigorta",
      insurance_expiry: D.daysFromNow(92),
      inspection_expiry: D.daysFromNow(245),
      last_service_date: D.daysAgo(85),
      last_service_mileage: 43200,
      next_service_mileage: 53200,
      maintenance_items: makeMaintItems(),
      notes: "Yöneticinin aracı. Düzenli bakımları yapılmaktadır.",
    },
    // 2. VW Tiguan – Sigorta uyarısı
    {
      company_id: companyId,
      plate: "06 VWK 789",
      brand: "Volkswagen",
      model: "Tiguan",
      year: 2019,
      color: "Gri",
      mileage: 87400,
      engine_type: "Dizel",
      engine_volume: "2.0 TDI",
      power: "150 HP",
      fuel_type: "Dizel",
      transmission: "DSG",
      chassis_no: "WVGZZZ5NZKW054321",
      tire_status: "Dört Mevsim",
      tire_brand: "Continental",
      tire_size: "215/60 R17",
      tire_install_date: D.daysAgo(90),
      tire_mileage: 85000,
      battery_brand: "Bosch",
      battery_capacity: "68 Ah",
      battery_install_date: D.daysAgo(730),
      insurance_company: "Axa Sigorta",
      insurance_expiry: D.daysFromNow(15),   // uyarı: 15 gün
      inspection_expiry: D.daysFromNow(125),
      last_service_date: D.daysAgo(185),
      last_service_mileage: 85000,
      next_service_mileage: 95000,
      maintenance_items: makeMaintItems({ brake: true }),
      notes: "Satış ekibi aracı. Sigorta yenilenmesi acil.",
    },
    // 3. Toyota Corolla – Mükemmel durum
    {
      company_id: companyId,
      plate: "35 TYK 234",
      brand: "Toyota",
      model: "Corolla",
      year: 2022,
      color: "Mavi",
      mileage: 28100,
      engine_type: "Hibrit",
      engine_volume: "1.8",
      power: "122 HP",
      fuel_type: "Hibrit",
      transmission: "CVT",
      chassis_no: "SB1ZS3JE0NE087654",
      tire_status: "Yazlık",
      tire_brand: "Bridgestone",
      tire_size: "195/65 R15",
      tire_install_date: D.daysAgo(30),
      tire_mileage: 27800,
      battery_brand: "Panasonic",
      battery_capacity: "Hibrit Paketi",
      battery_install_date: D.daysAgo(60),
      insurance_company: "Güneş Sigorta",
      insurance_expiry: D.daysFromNow(190),
      inspection_expiry: D.daysFromNow(335),
      last_service_date: D.daysAgo(32),
      last_service_mileage: 27900,
      next_service_mileage: 37900,
      maintenance_items: makeMaintItems(),
      notes: "İdari işler aracı. En yeni araç filoda.",
    },
    // 4. Mercedes E200 – Kritik durum
    {
      company_id: companyId,
      plate: "01 MRC 567",
      brand: "Mercedes",
      model: "E200",
      year: 2018,
      color: "Siyah",
      mileage: 156300,
      engine_type: "Benzinli",
      engine_volume: "2.0",
      power: "197 HP",
      fuel_type: "Benzin",
      transmission: "Otomatik",
      chassis_no: "WDB2130501A456789",
      tire_status: "Kışlık",            // yaz mevsiminde kışlık → uyarı
      tire_brand: "Pirelli",
      tire_size: "245/45 R18",
      tire_install_date: D.daysAgo(210),
      tire_mileage: 149000,
      battery_brand: "Varta",
      battery_capacity: "80 Ah",
      battery_install_date: D.daysAgo(1100),
      insurance_company: "Generali Sigorta",
      insurance_expiry: D.daysAgo(10),   // kritik: geçmiş!
      inspection_expiry: D.daysAgo(62),  // kritik: geçmiş!
      last_service_date: D.daysAgo(240),
      last_service_mileage: 148000,
      next_service_mileage: 158000,
      maintenance_items: makeMaintItems({ oil: true, brake: true, air: true, tire: true }),
      notes: "Genel Müdür aracı. Acil sigorta ve muayene yenilemesi gerekiyor!",
    },
    // 5. Ford Transit – Orta durum, muayene yakında
    {
      company_id: companyId,
      plate: "34 FRD 890",
      brand: "Ford",
      model: "Transit",
      year: 2020,
      color: "Beyaz",
      mileage: 112800,
      engine_type: "Dizel",
      engine_volume: "2.0 EcoBlue",
      power: "130 HP",
      fuel_type: "Dizel",
      transmission: "Manuel",
      chassis_no: "WF0XXXTTGXKB12345",
      tire_status: "Yazlık",
      tire_brand: "Goodyear",
      tire_size: "235/65 R16C",
      tire_install_date: D.daysAgo(150),
      tire_mileage: 108000,
      battery_brand: "Exide",
      battery_capacity: "95 Ah",
      battery_install_date: D.daysAgo(400),
      insurance_company: "HDI Sigorta",
      insurance_expiry: D.daysFromNow(47),
      inspection_expiry: D.daysFromNow(28),  // uyarı: 28 gün
      last_service_date: D.daysAgo(125),
      last_service_mileage: 110000,
      next_service_mileage: 120000,
      maintenance_items: makeMaintItems({ air: true }),
      notes: "Lojistik aracı. Muayene tarihi yakında.",
    },
    // 6. Renault Megane – Mükemmel durum
    {
      company_id: companyId,
      plate: "34 RNO 112",
      brand: "Renault",
      model: "Megane",
      year: 2022,
      color: "Kırmızı",
      mileage: 31500,
      engine_type: "Benzinli",
      engine_volume: "1.3 TCe",
      power: "140 HP",
      fuel_type: "Benzin",
      transmission: "Otomatik",
      chassis_no: "VF1BMA00067890123",
      tire_status: "Yazlık",
      tire_brand: "Michelin",
      tire_size: "205/55 R16",
      tire_install_date: D.daysAgo(45),
      tire_mileage: 30800,
      battery_brand: "Varta",
      battery_capacity: "60 Ah",
      battery_install_date: D.daysAgo(180),
      insurance_company: "Mapfre Sigorta",
      insurance_expiry: D.daysFromNow(215),
      inspection_expiry: D.daysFromNow(310),
      last_service_date: D.daysAgo(42),
      last_service_mileage: 30000,
      next_service_mileage: 40000,
      maintenance_items: makeMaintItems(),
      notes: "Pazarlama ekibi aracı. Tüm bakımları zamanında yapılmaktadır.",
    },
    // 7. Hyundai Tucson – Mükemmel durum
    {
      company_id: companyId,
      plate: "06 HYN 445",
      brand: "Hyundai",
      model: "Tucson",
      year: 2023,
      color: "Gümüş",
      mileage: 17800,
      engine_type: "Hibrit",
      engine_volume: "1.6 T-GDI",
      power: "230 HP",
      fuel_type: "Hibrit",
      transmission: "Otomatik",
      chassis_no: "TMAJ3812XPJ012345",
      tire_status: "Yazlık",
      tire_brand: "Hankook",
      tire_size: "235/55 R18",
      tire_install_date: D.daysAgo(20),
      tire_mileage: 17200,
      battery_brand: "Hyundai OEM",
      battery_capacity: "Hibrit Paketi",
      battery_install_date: D.daysAgo(30),
      insurance_company: "Zurich Sigorta",
      insurance_expiry: D.daysFromNow(330),
      inspection_expiry: D.daysFromNow(720),
      last_service_date: D.daysAgo(28),
      last_service_mileage: 15000,
      next_service_mileage: 25000,
      maintenance_items: makeMaintItems(),
      notes: "Yönetim kurulu aracı. Yeni alım, ilk bakımları tamamlandı.",
    },
    // 8. Skoda Octavia – İyi durum
    {
      company_id: companyId,
      plate: "35 SKD 778",
      brand: "Škoda",
      model: "Octavia",
      year: 2021,
      color: "Lacivert",
      mileage: 52400,
      engine_type: "Dizel",
      engine_volume: "2.0 TDI",
      power: "150 HP",
      fuel_type: "Dizel",
      transmission: "DSG",
      chassis_no: "TMBCA9NE6M0098765",
      tire_status: "Yazlık",
      tire_brand: "Continental",
      tire_size: "225/45 R17",
      tire_install_date: D.daysAgo(60),
      tire_mileage: 51000,
      battery_brand: "Bosch",
      battery_capacity: "72 Ah",
      battery_install_date: D.daysAgo(300),
      insurance_company: "Allianz Sigorta",
      insurance_expiry: D.daysFromNow(175),
      inspection_expiry: D.daysFromNow(255),
      last_service_date: D.daysAgo(55),
      last_service_mileage: 50000,
      next_service_mileage: 60000,
      maintenance_items: makeMaintItems(),
      notes: "Teknik ekip aracı. 50.000 km büyük bakımı tamamlandı.",
    },
    // 9. Honda Civic – Mükemmel durum
    {
      company_id: companyId,
      plate: "34 HND 221",
      brand: "Honda",
      model: "Civic",
      year: 2023,
      color: "Antrasit",
      mileage: 21200,
      engine_type: "Benzinli",
      engine_volume: "1.5 VTEC Turbo",
      power: "182 HP",
      fuel_type: "Benzin",
      transmission: "CVT",
      chassis_no: "SHHFK87680U345678",
      tire_status: "Yazlık",
      tire_brand: "Bridgestone",
      tire_size: "215/50 R17",
      tire_install_date: D.daysAgo(35),
      tire_mileage: 20500,
      battery_brand: "Bosch",
      battery_capacity: "48 Ah",
      battery_install_date: D.daysAgo(90),
      insurance_company: "Güneş Sigorta",
      insurance_expiry: D.daysFromNow(290),
      inspection_expiry: D.daysFromNow(680),
      last_service_date: D.daysAgo(18),
      last_service_mileage: 20000,
      next_service_mileage: 30000,
      maintenance_items: makeMaintItems(),
      notes: "İnsan kaynakları aracı. Periyodik bakımlar yetkili serviste yapılıyor.",
    },
    // 10. Peugeot 3008 – İyi durum
    {
      company_id: companyId,
      plate: "07 PGT 334",
      brand: "Peugeot",
      model: "3008",
      year: 2022,
      color: "Turuncu",
      mileage: 39800,
      engine_type: "Dizel",
      engine_volume: "1.5 BlueHDi",
      power: "130 HP",
      fuel_type: "Dizel",
      transmission: "Otomatik",
      chassis_no: "VF3MCYHZXLS456789",
      tire_status: "Yazlık",
      tire_brand: "Michelin",
      tire_size: "225/55 R18",
      tire_install_date: D.daysAgo(70),
      tire_mileage: 38500,
      battery_brand: "Exide",
      battery_capacity: "70 Ah",
      battery_install_date: D.daysAgo(250),
      insurance_company: "Groupama Sigorta",
      insurance_expiry: D.daysFromNow(155),
      inspection_expiry: D.daysFromNow(220),
      last_service_date: D.daysAgo(68),
      last_service_mileage: 37500,
      next_service_mileage: 47500,
      maintenance_items: makeMaintItems(),
      notes: "Bölge müdürü aracı. Düzenli servis takibi yapılmaktadır.",
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
    // BMW records
    { vehicle_id: bmwId, company_id: companyId, date: D.daysAgo(85), type: "routine", title: "Periyodik Bakım", mileage: 43200, service_center: "BMW Yetkili Servis İstanbul", notes: "Yağ, filtre, genel kontrol tamamlandı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.daysAgo(180), type: "tire", title: "Lastik Değişimi", mileage: 41500, service_center: "Pirelli Lastik Merkezi", notes: "4 adet Michelin yazlık takıldı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.daysAgo(390), type: "routine", title: "Periyodik Bakım", mileage: 35000, service_center: "BMW Yetkili Servis İstanbul", notes: "Standart 10.000 km bakımı." },
    { vehicle_id: bmwId, company_id: companyId, date: D.daysAgo(365), type: "battery", title: "Akü Değişimi", mileage: 35800, service_center: "BMW Yetkili Servis İstanbul", notes: "Varta 70Ah akü takıldı." },

    // VW records
    { vehicle_id: vwId, company_id: companyId, date: D.daysAgo(185), type: "routine", title: "Periyodik Bakım", mileage: 85000, service_center: "VW Yetkili Servis Ankara", notes: "Yağ değişimi, fren kontrolü yapıldı." },
    { vehicle_id: vwId, company_id: companyId, date: D.daysAgo(90), type: "tire", title: "Dört Mevsim Lastik", mileage: 85000, service_center: "Continental Yetkili Bayi", notes: "4 adet Continental AllSeason takıldı." },
    { vehicle_id: vwId, company_id: companyId, date: D.daysAgo(380), type: "repair", title: "Fren Sistemi Bakım", mileage: 72000, service_center: "VW Yetkili Servis Ankara", notes: "Ön fren balata ve disk değişimi." },
    { vehicle_id: vwId, company_id: companyId, date: D.daysAgo(550), type: "routine", title: "Periyodik Bakım", mileage: 65000, service_center: "VW Yetkili Servis Ankara", notes: "Standart dizel bakım." },

    // Toyota records
    { vehicle_id: toyotaId, company_id: companyId, date: D.daysAgo(32), type: "routine", title: "Periyodik Bakım", mileage: 27900, service_center: "Toyota Yetkili Servis İzmir", notes: "Hibrit sistem kontrolü, yağ değişimi." },
    { vehicle_id: toyotaId, company_id: companyId, date: D.daysAgo(30), type: "tire", title: "Yazlık Lastik Montajı", mileage: 27800, service_center: "Bridgestone Yetkili Bayi", notes: "4 adet Bridgestone Turanza takıldı." },
    { vehicle_id: toyotaId, company_id: companyId, date: D.daysAgo(200), type: "inspection", title: "Zorunlu Muayene", mileage: 25000, service_center: "TÜVTÜRK İzmir", notes: "Muayeneden geçti. Bir sonraki: Kasım 2027." },

    // Mercedes records
    { vehicle_id: mercedesId, company_id: companyId, date: D.daysAgo(240), type: "routine", title: "Periyodik Bakım", mileage: 148000, service_center: "Mercedes Yetkili Servis Ankara", notes: "Yağ ve filtreler değiştirildi." },
    { vehicle_id: mercedesId, company_id: companyId, date: D.daysAgo(450), type: "repair", title: "Şanzıman Bakımı", mileage: 138000, service_center: "Mercedes Yetkili Servis Ankara", notes: "Şanzıman yağı ve filtre değişimi." },
    { vehicle_id: mercedesId, company_id: companyId, date: D.daysAgo(600), type: "routine", title: "Periyodik Bakım", mileage: 128000, service_center: "Mercedes Yetkili Servis Ankara", notes: "Triger, antifriz, yağ değişimi." },
    { vehicle_id: mercedesId, company_id: companyId, date: D.daysAgo(750), type: "repair", title: "Motor Soğutma Sistemi", mileage: 118000, service_center: "Özel Servis Ankara", notes: "Termostat ve su pompası değişimi." },

    // Ford records
    { vehicle_id: fordId, company_id: companyId, date: D.daysAgo(125), type: "routine", title: "Periyodik Bakım", mileage: 110000, service_center: "Ford Yetkili Servis İstanbul", notes: "Dizel filtreler, yağ değişimi." },
    { vehicle_id: fordId, company_id: companyId, date: D.daysAgo(150), type: "tire", title: "Yazlık Lastik Takımı", mileage: 108000, service_center: "Goodyear Yetkili Bayi", notes: "4 adet Goodyear EfficientGrip takıldı." },
    { vehicle_id: fordId, company_id: companyId, date: D.daysAgo(300), type: "repair", title: "Fren Balata Değişimi", mileage: 100000, service_center: "Ford Yetkili Servis İstanbul", notes: "Ön ve arka balata takımı yenilendi." },
    { vehicle_id: fordId, company_id: companyId, date: D.daysAgo(480), type: "routine", title: "Periyodik Bakım", mileage: 90000, service_center: "Ford Yetkili Servis İstanbul", notes: "Standart 10.000 km bakımı yapıldı." },

    // Renault records
    { vehicle_id: renaultId, company_id: companyId, date: D.daysAgo(42), type: "routine", title: "Periyodik Bakım", mileage: 30000, service_center: "Renault Yetkili Servis İstanbul", notes: "30.000 km bakımı. Yağ, filtre, genel kontrol tamamlandı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.daysAgo(45), type: "tire", title: "Yazlık Lastik Montajı", mileage: 30800, service_center: "Michelin Yetkili Bayi İstanbul", notes: "4 adet Michelin Energy Saver takıldı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.daysAgo(180), type: "battery", title: "Akü Değişimi", mileage: 26000, service_center: "Renault Yetkili Servis İstanbul", notes: "Varta 60Ah akü takıldı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.daysAgo(380), type: "routine", title: "Periyodik Bakım", mileage: 20000, service_center: "Renault Yetkili Servis İstanbul", notes: "20.000 km bakımı yapıldı." },
    { vehicle_id: renaultId, company_id: companyId, date: D.daysAgo(310), type: "inspection", title: "Zorunlu Muayene", mileage: 22000, service_center: "TÜVTÜRK İstanbul", notes: "Araç muayeneden sorunsuz geçti." },

    // Hyundai records
    { vehicle_id: hyundaiId, company_id: companyId, date: D.daysAgo(28), type: "routine", title: "İlk Periyodik Bakım", mileage: 15000, service_center: "Hyundai Yetkili Servis Ankara", notes: "15.000 km ilk büyük bakımı. Yağ, filtreler yenilendi." },
    { vehicle_id: hyundaiId, company_id: companyId, date: D.daysAgo(20), type: "tire", title: "Yazlık Lastik Montajı", mileage: 17200, service_center: "Hankook Yetkili Bayi Ankara", notes: "4 adet Hankook Ventus S1 takıldı." },
    { vehicle_id: hyundaiId, company_id: companyId, date: D.daysAgo(210), type: "routine", title: "İlk Bakım", mileage: 5000, service_center: "Hyundai Yetkili Servis Ankara", notes: "5.000 km garanti kapsamı ilk bakımı." },

    // Skoda records
    { vehicle_id: skodaId, company_id: companyId, date: D.daysAgo(55), type: "routine", title: "50.000 km Büyük Bakım", mileage: 50000, service_center: "Škoda Yetkili Servis İzmir", notes: "50.000 km büyük bakım: yağ, filtreler, triger kontrolü, fren sıvısı." },
    { vehicle_id: skodaId, company_id: companyId, date: D.daysAgo(60), type: "tire", title: "Yazlık Lastik Takımı", mileage: 51000, service_center: "Continental Yetkili Bayi İzmir", notes: "4 adet Continental PremiumContact takıldı." },
    { vehicle_id: skodaId, company_id: companyId, date: D.daysAgo(280), type: "routine", title: "Periyodik Bakım", mileage: 40000, service_center: "Škoda Yetkili Servis İzmir", notes: "40.000 km bakımı. Yağ ve filtreler değiştirildi." },
    { vehicle_id: skodaId, company_id: companyId, date: D.daysAgo(450), type: "inspection", title: "Zorunlu Muayene", mileage: 32000, service_center: "TÜVTÜRK İzmir", notes: "Muayeneden geçti. Bir sonraki: Eylül 2027." },
    { vehicle_id: skodaId, company_id: companyId, date: D.daysAgo(540), type: "routine", title: "Periyodik Bakım", mileage: 30000, service_center: "Škoda Yetkili Servis İzmir", notes: "30.000 km bakımı yapıldı." },

    // Honda records
    { vehicle_id: hondaId, company_id: companyId, date: D.daysAgo(18), type: "routine", title: "20.000 km Periyodik Bakım", mileage: 20000, service_center: "Honda Yetkili Servis İstanbul", notes: "20.000 km bakımı. Yağ, hava filtresi, genel kontrol." },
    { vehicle_id: hondaId, company_id: companyId, date: D.daysAgo(35), type: "tire", title: "Yazlık Lastik Montajı", mileage: 20500, service_center: "Bridgestone Yetkili Bayi İstanbul", notes: "4 adet Bridgestone Turanza 6 takıldı." },
    { vehicle_id: hondaId, company_id: companyId, date: D.daysAgo(310), type: "routine", title: "İlk Periyodik Bakım", mileage: 10000, service_center: "Honda Yetkili Servis İstanbul", notes: "10.000 km garanti bakımı tamamlandı." },

    // Peugeot records
    { vehicle_id: peugeotId, company_id: companyId, date: D.daysAgo(68), type: "routine", title: "Periyodik Bakım", mileage: 37500, service_center: "Peugeot Yetkili Servis Antalya", notes: "Yağ, dizel filtre, klima bakımı yapıldı." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.daysAgo(70), type: "tire", title: "Yazlık Lastik Montajı", mileage: 38500, service_center: "Michelin Yetkili Bayi Antalya", notes: "4 adet Michelin Pilot Sport takıldı." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.daysAgo(330), type: "routine", title: "Periyodik Bakım", mileage: 27500, service_center: "Peugeot Yetkili Servis Antalya", notes: "Standart 10.000 km bakımı." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.daysAgo(420), type: "inspection", title: "Zorunlu Muayene", mileage: 24000, service_center: "TÜVTÜRK Antalya", notes: "Muayeneden sorunsuz geçti." },
    { vehicle_id: peugeotId, company_id: companyId, date: D.daysAgo(500), type: "repair", title: "Klima Bakımı", mileage: 21000, service_center: "Peugeot Yetkili Servis Antalya", notes: "Klima gazı dolduruldu, filtre değiştirildi." },
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

      // Get company from profile
      const { data: profile } = await admin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      if (!profile?.company_id) {
        return NextResponse.json({ error: "Demo profil bozuk." }, { status: 500 });
      }
      companyId = profile.company_id;

      // Check if vehicles exist, re-seed if missing
      const { count } = await admin
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      if ((count ?? 0) >= 8) {
        // Data already exists, nothing to do
        return NextResponse.json({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      }

      // Re-seed vehicles (data was cleared)
      await admin.from("vehicles").delete().eq("company_id", companyId);
      await admin.from("service_records").delete().eq("company_id", companyId);
    } else {
      // 2a. Create demo company
      const { data: company, error: companyErr } = await admin
        .from("companies")
        .insert({ name: DEMO_COMPANY_NAME, invite_code: "DEMO0000" })
        .select("id")
        .single();
      if (companyErr) throw companyErr;
      companyId = company.id;

      // 2b. Create demo user
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { company_id: companyId },
      });
      if (authErr) throw authErr;
      userId = authData.user.id;

      // 2c. Create demo profile (manager so they see all features)
      const { error: profileErr } = await admin.from("profiles").insert({
        id: userId,
        company_id: companyId,
        role: "manager",
        full_name: DEMO_FULL_NAME,
      });
      if (profileErr) throw profileErr;
    }

    // 3. Seed vehicles
    const vehicleRows = buildVehicles(companyId);
    const { data: insertedVehicles, error: vehicleErr } = await admin
      .from("vehicles")
      .insert(vehicleRows)
      .select("id, plate");
    if (vehicleErr) throw vehicleErr;

    const vehicleMap: Record<string, string> = {};
    for (const v of insertedVehicles ?? []) {
      vehicleMap[v.plate] = v.id;
    }

    // 4. Seed service records
    const recordRows = buildServiceRecords(vehicleMap, companyId);
    const { error: recordErr } = await admin.from("service_records").insert(recordRows);
    if (recordErr) throw recordErr;

    return NextResponse.json({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  } catch (err: unknown) {
    console.error("Demo setup error:", err);
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
