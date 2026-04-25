"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Car, History, Activity, Settings, Plus,
  Search, ChevronRight, Loader2,
} from "lucide-react";
import { useCommandPalette } from "@/context/command-palette-context";
import { getVehicles } from "@/lib/db";
import { calculateHealthScore } from "@/lib/store";
import type { Vehicle } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  Icon: React.ElementType;
  keywords: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Ana Sayfa", href: "/", Icon: LayoutDashboard, keywords: ["dashboard", "ana sayfa", "anasayfa"] },
  { label: "Araçlarım", href: "/vehicles", Icon: Car, keywords: ["araçlar", "vehicles", "filo"] },
  { label: "Servis Geçmişi", href: "/history", Icon: History, keywords: ["servis", "geçmiş", "history", "bakım"] },
  { label: "Filo Durumu", href: "/analytics", Icon: Activity, keywords: ["analiz", "filo", "analytics", "durum"] },
  { label: "Ayarlar", href: "/settings", Icon: Settings, keywords: ["ayarlar", "settings", "profil"] },
  { label: "Yeni Araç Ekle", href: "/vehicles/new", Icon: Plus, keywords: ["yeni", "ekle", "add", "araç ekle"] },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadedVehicles, setLoadedVehicles] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadVehicles = useCallback(async () => {
    if (loadedVehicles) return;
    try {
      const v = await getVehicles();
      setVehicles(v);
      setLoadedVehicles(true);
    } catch {}
  }, [loadedVehicles]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      loadVehicles();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, loadVehicles]);

  const q = query.toLowerCase();

  const filteredNav = q.length === 0
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
      );

  const filteredVehicles = q.length > 0
    ? vehicles.filter((v) =>
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      )
    : [];

  type ResultItem = { type: "nav"; item: NavItem } | { type: "vehicle"; vehicle: Vehicle };
  const allResults: ResultItem[] = [
    ...filteredNav.map((item): ResultItem => ({ type: "nav", item })),
    ...filteredVehicles.map((v): ResultItem => ({ type: "vehicle", vehicle: v })),
  ];

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults.length > 0) {
      e.preventDefault();
      const res = allResults[activeIndex];
      if (res) {
        navigate(res.type === "nav" ? res.item.href : `/vehicles/${res.vehicle.id}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-[12%] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-50"
            onKeyDown={handleKeyDown}
          >
            <div className="glass rounded-3xl border border-border/50 shadow-2xl shadow-primary/20 overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ara... araç plakası, marka, sayfa"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 font-medium"
                />
                {!loadedVehicles && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50 shrink-0" />}
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto no-scrollbar py-2">
                {allResults.length === 0 && query.length > 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Sonuç bulunamadı</p>
                )}

                {filteredNav.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-5 py-2">Sayfalar</p>
                    {filteredNav.map((item, i) => {
                      const globalIdx = i;
                      return (
                        <button
                          key={item.href}
                          onClick={() => navigate(item.href)}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${activeIndex === globalIdx ? "bg-primary/10" : "hover:bg-muted/50"}`}
                        >
                          <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
                            <item.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredVehicles.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-5 py-2 mt-1">Araçlar</p>
                    {filteredVehicles.map((v, i) => {
                      const globalIdx = filteredNav.length + i;
                      const score = calculateHealthScore(v);
                      return (
                        <button
                          key={v.id}
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${activeIndex === globalIdx ? "bg-primary/10" : "hover:bg-muted/50"}`}
                        >
                          <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold">{v.plate}</span>
                            <span className="text-xs text-muted-foreground ml-1.5">{v.brand} {v.model} {v.year}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${score >= 85 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : score >= 65 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                            {score}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hint bar */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border/30 bg-muted/20">
                {[
                  { keys: ["↑", "↓"], label: "gez" },
                  { keys: ["↵"], label: "aç" },
                  { keys: ["Esc"], label: "kapat" },
                ].map(({ keys, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="text-[9px] font-bold bg-muted/80 border border-border/50 px-1.5 py-0.5 rounded-md text-muted-foreground">{k}</kbd>
                    ))}
                    <span className="text-[10px] text-muted-foreground/60 ml-0.5">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
