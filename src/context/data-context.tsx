"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getMyVehicles, getRecords, getTrafficFines } from "@/lib/db";
import type { Vehicle, ServiceRecord, TrafficFine } from "@/lib/types";
import { useAuth } from "./auth-context";

interface DataContextType {
  vehicles: Vehicle[];
  records: ServiceRecord[];
  fines: TrafficFine[];
  /** Üç kaynak da (araç + servis kaydı + ceza) yüklendiğinde false olur. */
  loading: boolean;
  /** Yalnızca araçları bekler — araç listesi servis kayıtlarına takılmasın. */
  vehiclesLoading: boolean;
  refresh: () => Promise<void>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setRecords: React.Dispatch<React.SetStateAction<ServiceRecord[]>>;
}

const DataContext = createContext<DataContextType>({
  vehicles: [],
  records: [],
  fines: [],
  loading: true,
  vehiclesLoading: true,
  refresh: async () => {},
  setVehicles: () => {},
  setRecords: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const loadingRef = useRef(false);

  // getTrafficFines() RLS'e göre otomatik daraltılır: yönetici/operatör tüm
  // şirketi, sürücü yalnızca kendine yansıtılanları görür — rol dallanması
  // gerekmez. Cezalar isteğe bağlı bir modül olduğu için hata olursa akışı
  // etkilemez.
  const fetchFines = async (): Promise<TrafficFine[]> => {
    try {
      return await getTrafficFines();
    } catch (err) {
      // PGRST303 ("JWT issued at future") Supabase Auth/PostgREST arasındaki
      // geçici saat sapmasından kaynaklanır — birkaç yüz ms içinde kendiliğinden
      // düzelir, bu yüzden tek seferlik bir yeniden deneme neredeyse her zaman yeterli.
      if ((err as { code?: string })?.code === "PGRST303") {
        await new Promise((r) => setTimeout(r, 400));
        try {
          return await getTrafficFines();
        } catch (retryErr) {
          console.error("[DataProvider] fines fetch failed after retry:", retryErr);
          return [];
        }
      }
      console.error("[DataProvider] fines fetch failed:", err);
      return [];
    }
  };

  // Üç kaynak paralel çalışır ama her biri kendi state'ini hemen yazar: araç
  // listesi, /api/records'ın (çoğu zaman en yavaş istek) bitmesini beklemez.
  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setVehiclesLoading(true);

    const vehiclesTask = getMyVehicles()
      .then((v) => setVehicles(v))
      .catch((err) => console.error("[DataProvider] vehicles load failed:", err))
      .finally(() => setVehiclesLoading(false));

    const recordsTask = getRecords()
      .then((r) => setRecords(r))
      .catch((err) => console.error("[DataProvider] records load failed:", err));

    const finesTask = fetchFines().then((f) => setFines(f));

    try {
      await Promise.all([vehiclesTask, recordsTask, finesTask]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Refresh: re-fetches without showing loading skeleton
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        getMyVehicles().then(setVehicles),
        getRecords().then(setRecords),
        fetchFines().then(setFines),
      ]);
    } catch (err) {
      console.error("[DataProvider] refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setRecords([]);
      setFines([]);
      setLoading(true);
      setVehiclesLoading(true);
      return;
    }
    load();
  }, [user?.id, load]);

  return (
    <DataContext.Provider value={{ vehicles, records, fines, loading, vehiclesLoading, refresh, setVehicles, setRecords }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
