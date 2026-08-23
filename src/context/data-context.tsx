"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getMyVehicles, getRecords, getTrafficFines } from "@/lib/db";
import type { Vehicle, ServiceRecord, TrafficFine } from "@/lib/types";
import { useAuth } from "./auth-context";

interface DataContextType {
  vehicles: Vehicle[];
  records: ServiceRecord[];
  fines: TrafficFine[];
  loading: boolean;
  refresh: () => Promise<void>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setRecords: React.Dispatch<React.SetStateAction<ServiceRecord[]>>;
}

const DataContext = createContext<DataContextType>({
  vehicles: [],
  records: [],
  fines: [],
  loading: true,
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
  const loadingRef = useRef(false);

  // getTrafficFines() RLS'e göre otomatik daraltılır: yönetici/operatör tüm
  // şirketi, sürücü yalnızca kendine yansıtılanları görür — rol dallanması
  // gerekmez. Cezalar isteğe bağlı bir modül olduğu için hata olursa akışı
  // etkilemez.
  const fetchFines = () => getTrafficFines().catch((err) => {
    console.error("[DataProvider] fines fetch failed:", err);
    return [] as TrafficFine[];
  });

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [v, r, f] = await Promise.all([getMyVehicles(), getRecords(), fetchFines()]);
      setVehicles(v);
      setRecords(r);
      setFines(f);
    } catch (err) {
      console.error("[DataProvider] load failed:", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Refresh: re-fetches without showing loading skeleton
  const refresh = useCallback(async () => {
    try {
      const [v, r, f] = await Promise.all([getMyVehicles(), getRecords(), fetchFines()]);
      setVehicles(v);
      setRecords(r);
      setFines(f);
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
      return;
    }
    load();
  }, [user?.id, load]);

  return (
    <DataContext.Provider value={{ vehicles, records, fines, loading, refresh, setVehicles, setRecords }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
