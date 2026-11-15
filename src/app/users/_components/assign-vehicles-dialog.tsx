"use client";

import { useMemo, useState } from "react";
import { Car, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { assignVehicle, unassignVehicle } from "@/lib/db";
import type { Profile, Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DriverWithAssignment } from "./team-utils";

export function AssignVehiclesDialog({
  driver,
  drivers,
  vehicles,
  onClose,
  onChanged,
}: {
  driver: Profile;
  drivers: DriverWithAssignment[];
  vehicles: Vehicle[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [addVehicleId, setAddVehicleId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { currentVehicles, freeVehicles, takenVehicles } = useMemo(() => {
    const currentIds = new Set(drivers.find((d) => d.id === driver.id)?.assignedVehicleIds ?? []);
    // Araç → atanmış olduğu diğer sürücülerin adları
    const othersByVehicle = new Map<string, string[]>();
    for (const d of drivers) {
      if (d.id === driver.id) continue;
      for (const vid of d.assignedVehicleIds) {
        othersByVehicle.set(vid, [...(othersByVehicle.get(vid) ?? []), d.fullName]);
      }
    }
    const current: Vehicle[] = [];
    const free: Vehicle[] = [];
    const taken: { vehicle: Vehicle; owners: string[] }[] = [];
    for (const v of vehicles) {
      if (currentIds.has(v.id)) current.push(v);
      else if (othersByVehicle.has(v.id)) taken.push({ vehicle: v, owners: othersByVehicle.get(v.id)! });
      else free.push(v);
    }
    return { currentVehicles: current, freeVehicles: free, takenVehicles: taken };
  }, [driver.id, drivers, vehicles]);

  const hasAvailable = freeVehicles.length + takenVehicles.length > 0;

  function close() {
    if (!submitting) onClose();
  }

  async function handleAdd() {
    if (!addVehicleId) return;
    setSubmitting(true);
    try {
      await assignVehicle(addVehicleId, driver.id);
      setAddVehicleId("");
      toast.success("Araç atandı");
      await onChanged();
    } catch {
      toast.error("Araç atanamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(vehicleId: string) {
    setSubmitting(true);
    try {
      await unassignVehicle(vehicleId, driver.id);
      toast.success("Atama kaldırıldı");
      await onChanged();
    } catch {
      toast.error("Atama kaldırılamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="rounded-3xl p-6 gap-5 sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader className="flex-row items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl shrink-0">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="font-bold">Araç Yönet</DialogTitle>
            <DialogDescription className="text-xs truncate">{driver.fullName}</DialogDescription>
          </div>
        </DialogHeader>

        {/* Mevcut araçlar */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Atanmış Araçlar{currentVehicles.length > 0 && ` (${currentVehicles.length})`}
          </p>
          {currentVehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-2xl px-4 py-3">Henüz araç atanmamış</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {currentVehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between bg-muted/40 rounded-2xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{v.plate}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.brand} {v.model}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => handleRemove(v.id)}
                          disabled={submitting}
                          aria-label={`${v.plate} atamasını kaldır`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        />
                      }
                    >
                      <X className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Atamayı Kaldır</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Araç ekle */}
        {hasAvailable ? (
          <div className="space-y-2">
            <label htmlFor="assign-vehicle" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Araç Ekle</label>
            <div className="flex gap-2">
              <select
                id="assign-vehicle"
                value={addVehicleId}
                onChange={(e) => setAddVehicleId(e.target.value)}
                className="flex-1 min-w-0 h-11 rounded-2xl border border-border bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Araç seçin...</option>
                {freeVehicles.length > 0 && (
                  <optgroup label="Boştaki araçlar">
                    {freeVehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
                    ))}
                  </optgroup>
                )}
                {takenVehicles.length > 0 && (
                  <optgroup label="Başka sürücüye atanmış">
                    {takenVehicles.map(({ vehicle: v, owners }) => (
                      <option key={v.id} value={v.id}>{v.plate} — {owners.join(", ")}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <Button
                type="button"
                onClick={handleAdd}
                disabled={!addVehicleId || submitting}
                aria-label="Seçili aracı ata"
                className="h-11 px-4 rounded-2xl bg-mesh hover:opacity-95 text-white border-none shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {takenVehicles.some((t) => t.vehicle.id === addVehicleId) && (
              <p className="text-[11px] text-muted-foreground">
                Bu araç diğer sürücüde de kalır; araç birden fazla sürücüye atanabilir.
              </p>
            )}
          </div>
        ) : (
          currentVehicles.length > 0 && (
            <p className="text-xs text-muted-foreground text-center bg-muted/30 rounded-2xl px-4 py-3">
              Tüm araçlar bu kullanıcıya atanmış
            </p>
          )
        )}

        <Button type="button" variant="outline" className="w-full rounded-xl" onClick={close} disabled={submitting}>
          Kapat
        </Button>
      </DialogContent>
    </Dialog>
  );
}
