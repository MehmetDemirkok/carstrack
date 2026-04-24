"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockAlerts, mockVehicles, mockExpenses } from "@/lib/mock-data";
import {
  AlertTriangle,
  Info,
  Shield,
  Plus,
  Wrench,
  Car,
  TrendingUp,
  Gauge,
  Fuel,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const alertIcons: Record<string, typeof AlertTriangle> = {
  calendar: AlertTriangle,
  tire: Info,
  shield: Shield,
};

const barColors = [
  "hsl(220, 70%, 55%)",
  "hsl(220, 70%, 55%)",
  "hsl(220, 70%, 55%)",
  "hsl(220, 70%, 55%)",
  "hsl(260, 70%, 60%)",
  "hsl(260, 70%, 60%)",
];

export default function Dashboard() {
  return (
    <div className="p-4 md:p-8 space-y-5">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8"
      >
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-5 lg:space-y-8">
          {/* Health Score Hero */}
          <motion.div variants={item}>
            <Card className="rounded-3xl border-none shadow-lg overflow-hidden relative bg-gradient-to-br from-primary via-primary/90 to-primary/70">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <CardContent className="p-5 md:p-8 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-primary-foreground/70 text-xs md:text-sm font-medium">
                      Filo Sağlık Durumu
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl md:text-7xl font-black font-outfit text-primary-foreground tracking-tight">
                        85
                      </span>
                      <span className="text-primary-foreground/60 text-sm md:text-base font-medium">
                        /100
                      </span>
                    </div>
                    <p className="text-primary-foreground/60 text-[11px] md:text-sm">
                      Araçlarınız genel olarak iyi durumda
                    </p>
                  </div>
                  <div className="relative">
                    <svg
                      className="w-20 h-20 md:w-32 md:h-32 -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="8"
                        strokeDasharray={`${85 * 2.64} ${264 - 85 * 2.64}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 md:h-10 md:w-10 text-primary-foreground/80" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Vehicles Overview */}
          <motion.div variants={item} className="space-y-2.5 md:space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                Araç Durumları
              </h2>
              <Link href="/vehicles">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] md:text-xs text-primary h-7 px-2 gap-1 hover:bg-primary/10"
                >
                  Tümünü Gör
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
              {mockVehicles.map((vehicle) => (
                <Link
                  href={`/vehicles/${vehicle.id}`}
                  key={vehicle.id}
                  className="block tap-highlight-transparent"
                >
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Card className="rounded-2xl overflow-hidden shadow-sm border-border/40 hover:shadow-md transition-all">
                      <div className="flex h-[108px] md:h-32">
                        <div className="w-[120px] md:w-[160px] relative shrink-0 bg-muted">
                          {vehicle.image ? (
                            <Image
                              src={vehicle.image}
                              alt={vehicle.plate}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 120px, 160px"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-primary/10 flex items-center justify-center">
                              <Car className="h-10 w-10 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card" />
                        </div>
                        <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="font-outfit font-bold text-sm md:text-base tracking-tight block truncate">
                                  {vehicle.plate}
                                </span>
                                <span className="text-[11px] md:text-xs text-muted-foreground">
                                  {vehicle.brand} {vehicle.model} • {vehicle.year}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] md:text-xs h-5 md:h-6 px-1.5 md:px-2 rounded-lg font-bold shrink-0 border-none ${
                                  vehicle.healthScore >= 85
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {vehicle.healthScore}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-1 md:space-y-2">
                            <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                              <span>{vehicle.nextMaintenance.type}</span>
                              <span className="font-semibold text-foreground">
                                {vehicle.nextMaintenance.remainingKm} km
                              </span>
                            </div>
                            <Progress
                              value={
                                100 -
                                (vehicle.nextMaintenance.remainingKm / 10000) * 100
                              }
                              className="h-1.5 md:h-2"
                              indicatorClassName={
                                vehicle.nextMaintenance.remainingKm < 500
                                  ? "bg-destructive"
                                  : vehicle.nextMaintenance.remainingKm < 2000
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-5 lg:space-y-8">
          {/* Quick Stats Grid */}
          <motion.div variants={item} className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              {
                icon: Car,
                value: "2",
                label: "Araç",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: TrendingUp,
                value: "₺8.4K",
                label: "Bu Ay",
                color: "text-orange-500",
                bg: "bg-orange-500/10",
              },
              {
                icon: Wrench,
                value: "3",
                label: "Yaklaşan",
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              },
            ].map((stat, i) => (
              <Card
                key={i}
                className="rounded-2xl border-border/40 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-1.5 md:gap-2">
                  <div className={`p-2 md:p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                  </div>
                  <span className="text-lg md:text-2xl font-bold font-outfit leading-none">
                    {stat.value}
                  </span>
                  <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Alerts */}
          <motion.div variants={item} className="space-y-2.5 md:space-y-4">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
              Bildirimler
            </h2>
            <div className="space-y-2 md:space-y-3">
              {mockAlerts.map((alert) => {
                const Icon = alertIcons[alert.icon] || Info;
                return (
                  <motion.div
                    key={alert.id}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3.5 md:p-4 rounded-2xl border flex gap-3 md:gap-4 items-start transition-colors ${
                      alert.type === "warning"
                        ? "bg-orange-500/5 border-orange-500/15 dark:bg-orange-500/10"
                        : "bg-blue-500/5 border-blue-500/15 dark:bg-blue-500/10"
                    }`}
                  >
                    <div
                      className={`p-1.5 md:p-2 rounded-lg shrink-0 mt-0.5 ${
                        alert.type === "warning"
                          ? "bg-orange-500/15 text-orange-500"
                          : "bg-blue-500/15 text-blue-500"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xs md:text-sm">{alert.title}</h3>
                      <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Monthly Expense Chart */}
          <motion.div variants={item} className="space-y-2.5 md:space-y-4">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
              Aylık Gider Özeti
            </h2>
            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="p-4 pt-5 md:p-6 md:pt-6">
                <div className="h-[140px] md:h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockExpenses} barCategoryGap="25%">
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        dy={8}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", radius: 8 }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow:
                            "0 4px 12px -2px rgb(0 0 0 / 0.1)",
                          fontSize: "12px",
                          padding: "8px 12px",
                        }}
                        formatter={(value: unknown) => [
                          `₺${Number(value).toLocaleString("tr-TR")}`,
                          "Gider",
                        ]}
                      />
                      <Bar dataKey="total" radius={[6, 6, 2, 2]}>
                        {mockExpenses.map((_, index) => (
                          <Cell key={index} fill={barColors[index % barColors.length]} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="space-y-2.5 md:space-y-4 hidden md:block">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
              Hızlı İşlemler
            </h2>
            <div className="grid grid-cols-4 gap-3 md:gap-4">
              {[
                {
                  icon: Fuel,
                  label: "Yakıt",
                  color: "bg-blue-500/10 text-blue-500",
                },
                {
                  icon: Wrench,
                  label: "Servis",
                  color: "bg-orange-500/10 text-orange-500",
                },
                {
                  icon: Gauge,
                  label: "Muayene",
                  color: "bg-purple-500/10 text-purple-500",
                },
                {
                  icon: Plus,
                  label: "Diğer",
                  color: "bg-emerald-500/10 text-emerald-500",
                },
              ].map((action, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${action.color} shadow-sm transition-shadow hover:shadow-md`}
                  >
                    <action.icon className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-muted-foreground">
                    {action.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
