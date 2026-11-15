"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Car, IdCard, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { avatarColor, formatDuration, getInitials, licenseBadge, roleBadge, type MemberView } from "./team-utils";

/** Aktif seyahat süresi — yalnızca bu küçük bileşen 30 sn'de bir yeniden çizilir. */
function ActiveDuration({ start }: { start: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  return <>{formatDuration(start)}</>;
}

export function MemberCard({
  view,
  onEdit,
  onAssign,
}: {
  view: MemberView;
  onEdit: () => void;
  onAssign: () => void;
}) {
  const { member, isDriver, assignedVehicles, activeTask, taskVehicle } = view;
  const badge = roleBadge(member.role);
  const license = isDriver ? licenseBadge(member.licenses) : null;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass rounded-3xl p-4 border border-border/40"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`h-12 w-12 rounded-2xl ${avatarColor(member.fullName)} flex items-center justify-center shrink-0 shadow-md`} aria-hidden>
          <span className="text-white font-bold text-sm">{getInitials(member.fullName)}</span>
        </div>

        {/* Bilgiler */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base leading-none">{member.fullName}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>{badge.label}</span>
          </div>

          {member.department && <p className="text-xs text-muted-foreground mt-0.5">{member.department}</p>}

          {license && (
            <span className={`mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${license.cls}`}>
              <IdCard className="h-3 w-3 shrink-0" /> {license.label}
            </span>
          )}

          {isDriver && (
            <div className="mt-2 space-y-1">
              {activeTask && (
                <div className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium bg-green-500/10 px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                  Aktif •{" "}
                  {taskVehicle
                    ? `${taskVehicle.brand} ${taskVehicle.model} (${taskVehicle.plate})`
                    : (activeTask.vehiclePlate ?? "Araç")}
                  {" • "}<ActiveDuration start={activeTask.startTime} />
                </div>
              )}

              {!activeTask && assignedVehicles.length === 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  Müsait •{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Araç atanmamış</span>
                </div>
              )}

              {!activeTask && assignedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {assignedVehicles.map((v) => (
                    <span key={v.id} className="inline-flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-full">
                      <Car className="h-3 w-3 shrink-0" />
                      {v.plate}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aksiyon butonları */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isDriver && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={onAssign}
                    aria-label={`${member.fullName} için araç ata`}
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  />
                }
              >
                <Car className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Araç Ata / Yönet</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label={`${member.fullName} kullanıcısını düzenle`}
                  className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                />
              }
            >
              <Pencil className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>Kullanıcıyı Düzenle</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.li>
  );
}
