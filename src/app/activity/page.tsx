"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Activity, UserCog, Car, Route, Mail, RefreshCw, MailX } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getAuditLogs } from "@/lib/db";
import type { AuditLog } from "@/lib/types";
import { toast } from "sonner";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; iconBg: string; iconColor: string }> = {
  role_changed: { label: "Rol değiştirildi", icon: UserCog, iconBg: "bg-primary/10", iconColor: "text-primary" },
  vehicle_deleted: { label: "Araç silindi", icon: Car, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
  task_deleted: { label: "Görev silindi", icon: Route, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
  invite_sent: { label: "Davet gönderildi", icon: Mail, iconBg: "bg-sky-500/10", iconColor: "text-sky-500" },
  invite_revoked: { label: "Davet iptal edildi", icon: MailX, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
  invite_code_regenerated: { label: "Davet kodu yenilendi", icon: RefreshCw, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
};

export default function ActivityPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== "manager") router.replace("/dashboard");
  }, [profile, router]);

  useEffect(() => {
    if (!user || profile?.role !== "manager") return;
    getAuditLogs(100)
      .then(setLogs)
      .catch(() => toast.error("Aktivite geçmişi yüklenemedi"))
      .finally(() => setLoading(false));
  }, [user, profile?.role]);

  if (profile && profile.role !== "manager") return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="bg-mesh p-2.5 rounded-2xl shadow-lg shadow-primary/30">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Aktivite Geçmişi</h1>
          <p className="text-sm text-muted-foreground">Ekip aksiyonlarının kaydı</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-3xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Henüz aktivite yok</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2"
        >
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] ?? { label: log.action, icon: Activity, iconBg: "bg-muted", iconColor: "text-muted-foreground" };
            const Icon = config.icon;
            return (
              <motion.div
                key={log.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className="glass rounded-2xl p-4 border border-border/40 flex items-center gap-3"
              >
                <div className={`p-2 ${config.iconBg} rounded-xl shrink-0`}>
                  <Icon className={`h-4 w-4 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{config.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {log.actorName}
                    {log.entityLabel && ` — ${log.entityLabel}`}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
