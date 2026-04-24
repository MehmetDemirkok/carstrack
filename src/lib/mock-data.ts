export const mockVehicles = [
  {
    id: "v1",
    plate: "34 ABC 123",
    brand: "BMW",
    model: "320i",
    year: 2022,
    mileage: 45200,
    engineType: "1.6 Benzin Turbo",
    fuelType: "Benzin",
    transmission: "Otomatik",
    chassisNo: "WBA3X5C50EF123456",
    healthScore: 92,
    tireStatus: "Yazlık" as const,
    tireBrand: "Michelin Primacy 4",
    tireInstallDate: "2025-04-15",
    tireMileage: 8400,
    batteryBrand: "Varta 72Ah",
    batteryYear: 2024,
    insuranceExpiry: "2026-11-12",
    inspectionExpiry: "2026-09-05",
    lastServiceDate: "2026-04-15",
    nextMaintenance: {
      type: "Yağ Değişimi",
      dueDate: "2026-05-15",
      remainingKm: 1200,
    },
    image: "",
  },
  {
    id: "v2",
    plate: "06 DEF 456",
    brand: "Volkswagen",
    model: "Tiguan",
    year: 2021,
    mileage: 62300,
    engineType: "1.5 TSI",
    fuelType: "Benzin",
    transmission: "DSG",
    chassisNo: "WVGZZZ5NZMW987654",
    healthScore: 78,
    tireStatus: "Kışlık" as const,
    tireBrand: "Continental WinterContact",
    tireInstallDate: "2025-11-10",
    tireMileage: 5200,
    batteryBrand: "Bosch S5 74Ah",
    batteryYear: 2023,
    insuranceExpiry: "2026-07-20",
    inspectionExpiry: "2026-12-18",
    lastServiceDate: "2026-03-02",
    nextMaintenance: {
      type: "Fren Balatası",
      dueDate: "2026-06-01",
      remainingKm: 400,
    },
    image: "",
  },
];

export const addVehicle = (vehicle: any) => {
  mockVehicles.push({
    ...vehicle,
    id: `v${mockVehicles.length + 1}`,
    year: vehicle.year ? parseInt(vehicle.year) : new Date().getFullYear(),
    mileage: vehicle.mileage ? parseInt(vehicle.mileage) : 0,
    engineType: vehicle.engineType || "Bilinmiyor",
    fuelType: vehicle.fuelType || "Belirtilmedi",
    transmission: vehicle.transmission || "Belirtilmedi",
    chassisNo: vehicle.chassisNo || "-",
    insuranceExpiry: vehicle.insuranceExpiry || new Date().toISOString().split('T')[0],
    inspectionExpiry: vehicle.inspectionExpiry || new Date().toISOString().split('T')[0],
    healthScore: 100, // default
    tireStatus: vehicle.tireType || "Yazlık",
    tireBrand: "Bilinmiyor",
    tireInstallDate: new Date().toISOString().split('T')[0],
    tireMileage: 0,
    batteryBrand: "Bilinmiyor",
    batteryYear: vehicle.batteryDate ? parseInt(vehicle.batteryDate.split("-")[0]) : new Date().getFullYear(),
    lastServiceDate: new Date().toISOString().split('T')[0],
    nextMaintenance: {
      type: "Genel Kontrol",
      dueDate: "Belirsiz",
      remainingKm: 10000,
    },
    image: vehicle.image || "",
  });
};

export const updateVehicle = (id: string, updates: any) => {
  const index = mockVehicles.findIndex(v => v.id === id);
  if (index !== -1) {
    mockVehicles[index] = { ...mockVehicles[index], ...updates };
  }
};

export const deleteVehicles = (ids: string[]) => {
  for (const id of ids) {
    const index = mockVehicles.findIndex(v => v.id === id);
    if (index !== -1) {
      mockVehicles.splice(index, 1);
    }
  }
};

export const mockAlerts = [
  {
    id: "a1",
    title: "Muayene Yaklaşıyor",
    description: "34 ABC 123 plakalı aracınızın muayenesine 15 gün kaldı.",
    type: "warning" as const,
    icon: "calendar",
  },
  {
    id: "a2",
    title: "Kış Lastiği Uyarısı",
    description: "06 DEF 456 aracınızda kış lastikleri takılı. Havalar ısınıyor.",
    type: "info" as const,
    icon: "tire",
  },
  {
    id: "a3",
    title: "Sigorta Yenileme",
    description: "06 DEF 456 aracınızın sigortasının bitmesine 3 ay kaldı.",
    type: "warning" as const,
    icon: "shield",
  },
];

export const mockExpenses = [
  { name: "Oca", total: 1200 },
  { name: "Şub", total: 4500 },
  { name: "Mar", total: 800 },
  { name: "Nis", total: 2100 },
  { name: "May", total: 3200 },
  { name: "Haz", total: 1800 },
];

export const mockTimeline = [
  {
    id: "t1",
    date: "15 Nisan 2026",
    title: "Periyodik Bakım",
    vehicle: "34 ABC 123",
    service: "Borusan Oto",
    km: "45,200 km",
    cost: 8500,
    costLabel: "₺8.500",
    type: "routine" as const,
    notes: "Yağ, yağ filtresi, hava filtresi ve polen filtresi değiştirildi. Genel kontrol yapıldı.",
  },
  {
    id: "t2",
    date: "02 Mart 2026",
    title: "Ön Fren Balataları",
    vehicle: "34 ABC 123",
    service: "Bosch Car Service",
    km: "43,200 km",
    cost: 4200,
    costLabel: "₺4.200",
    type: "repair" as const,
    notes: "Ön diskler tornalandı, balatalar değiştirildi. Arka frenler kontrol edildi.",
  },
  {
    id: "t3",
    date: "10 Kasım 2025",
    title: "Kış Lastiği Montajı",
    vehicle: "06 DEF 456",
    service: "Michelin Bayi",
    km: "57,100 km",
    cost: 1200,
    costLabel: "₺1.200",
    type: "tire" as const,
    notes: "Continental WinterContact kış lastikleri takıldı, balans ayarı yapıldı.",
  },
  {
    id: "t4",
    date: "22 Ekim 2025",
    title: "Akü Değişimi",
    vehicle: "06 DEF 456",
    service: "Bosch Car Service",
    km: "55,800 km",
    cost: 3800,
    costLabel: "₺3.800",
    type: "repair" as const,
    notes: "Bosch S5 74Ah akü takıldı. Şarj sistemi kontrol edildi.",
  },
  {
    id: "t5",
    date: "15 Ağustos 2025",
    title: "Periyodik Bakım",
    vehicle: "06 DEF 456",
    service: "Volkswagen Yetkili",
    km: "52,000 km",
    cost: 9200,
    costLabel: "₺9.200",
    type: "routine" as const,
    notes: "60.000 km bakımı: Yağ, tüm filtreler, bujiler ve fren hidroliği değiştirildi.",
  },
];
