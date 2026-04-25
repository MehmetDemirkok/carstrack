import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qkldtqasgicelriarkrr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrbGR0cWFzZ2ljZWxyaWFya3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAwMjQ5MiwiZXhwIjoyMDkyNTc4NDkyfQ.QahOPr9z2Gkbv_pK0Kxals-I6iQ9JE8inh4IfGHXQQU'
)

const companyId = '4473fc65-b936-47f6-806e-c23c116e17ff';

const mockVehicles = [
  {
    company_id: companyId,
    plate: '34 ABC 123',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2021,
    color: 'Beyaz',
    image: 'https://images.unsplash.com/photo-1629897048514-3dd74142b4fa?auto=format&fit=crop&q=80&w=800',
    mileage: 45000,
    engine_type: '1.5 Dynamic Force',
    engine_volume: '1.5',
    power: '125',
    fuel_type: 'Benzin',
    transmission: 'Otomatik',
    chassis_no: 'NMT1234567890',
    tire_status: 'Yazlık',
    tire_brand: 'Michelin',
    tire_size: '205/55 R16',
    tire_install_date: '2023-04-15',
    tire_mileage: 35000,
    battery_brand: 'Mutlu',
    battery_capacity: '60 Ah',
    battery_install_date: '2022-11-20',
    insurance_company: 'Anadolu Sigorta',
    insurance_expiry: '2026-08-15',
    inspection_expiry: '2026-10-20',
    last_service_date: '2025-10-01',
    last_service_mileage: 40000,
    next_service_mileage: 50000,
    maintenance_items: [
      { id: 'oil', name: 'Yağ Değişimi', intervalKm: 10000, intervalMonths: 12, lastDoneDate: '2025-10-01', lastDoneMileage: 40000 },
      { id: 'airfilter', name: 'Hava Filtresi', intervalKm: 20000, intervalMonths: 24, lastDoneDate: '2025-10-01', lastDoneMileage: 40000 },
      { id: 'brakefront', name: 'Ön Fren Balatası', intervalKm: 40000, lastDoneDate: '2024-05-10', lastDoneMileage: 25000 }
    ],
    notes: 'Temiz aile aracı, yetkili servis bakımlı.'
  },
  {
    company_id: companyId,
    plate: '06 XYZ 987',
    brand: 'Ford',
    model: 'Focus',
    year: 2019,
    color: 'Mavi',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    mileage: 82000,
    engine_type: '1.5 TDCi',
    engine_volume: '1.5',
    power: '120',
    fuel_type: 'Dizel',
    transmission: 'Manuel',
    chassis_no: 'WF01234567890',
    tire_status: 'Kışlık',
    tire_brand: 'Continental',
    tire_size: '215/50 R17',
    tire_install_date: '2023-11-01',
    tire_mileage: 75000,
    battery_brand: 'Varta',
    battery_capacity: '72 Ah',
    battery_install_date: '2021-09-10',
    insurance_company: 'Allianz',
    insurance_expiry: '2026-05-01', // Yakında bitecek
    inspection_expiry: '2026-04-10', // Geçmiş
    last_service_date: '2024-02-15',
    last_service_mileage: 70000,
    next_service_mileage: 85000,
    maintenance_items: [
      { id: 'oil', name: 'Yağ Değişimi', intervalKm: 15000, intervalMonths: 12, lastDoneDate: '2024-02-15', lastDoneMileage: 70000 },
      { id: 'brakerear', name: 'Arka Fren Balatası', intervalKm: 60000, lastDoneDate: '2022-08-20', lastDoneMileage: 45000 }
    ],
    notes: 'Muayenesi geçmiş, sigortası bitmek üzere!'
  }
];

async function seed() {
  console.log("Seeding vehicles...");
  const { data, error } = await supabase.from('vehicles').insert(mockVehicles).select();
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Inserted", data.length, "vehicles successfully!");
  }
}

seed();
