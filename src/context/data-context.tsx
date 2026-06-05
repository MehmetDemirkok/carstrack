"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getMyVehicles, getRecords } from "@/lib/db";
import type { Vehicle, ServiceRecord } from "@/lib/types";
import { useAuth } from "./auth-context";

interface DataContextType {
  vehicles: Vehicle[];
  records: ServiceRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setRecords: React.Dispatch<React.SetStateAction<ServiceRecord[]>>;
}

const DataContext = createContext<DataContextType>({
  vehicles: [],
  records: [],
  loading: true,
  refresh: async () => {},
  setVehicles: () => {},
  setRecords: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [v, r] = await Promise.all([getMyVehicles(), getRecords()]);
      setVehicles(v);
      setRecords(r);
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
      const [v, r] = await Promise.all([getMyVehicles(), getRecords()]);
      setVehicles(v);
      setRecords(r);
    } catch (err) {
      console.error("[DataProvider] refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setRecords([]);
      setLoading(true);
      return;
    }
    load();
  }, [user?.id, load]);

  return (
    <DataContext.Provider value={{ vehicles, records, loading, refresh, setVehicles, setRecords }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
