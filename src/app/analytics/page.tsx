"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockExpenses } from "@/lib/mock-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const categories = [
  {
    name: "Periyodik Bakım",
    amount: "₺12.500",
    percent: 42,
    color: "bg-blue-500",
    lightColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    name: "Onarım & Parça",
    amount: "₺8.000",
    percent: 27,
    color: "bg-orange-500",
    lightColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    name: "Lastik & Akü",
    amount: "₺5.000",
    percent: 17,
    color: "bg-teal-500",
    lightColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    name: "Sigorta & Vergi",
    amount: "₺4.100",
    percent: 14,
    color: "bg-purple-500",
    lightColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-2xl font-outfit font-bold tracking-tight">
          Analiz & Giderler
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          2026 yılı araç sahip olma maliyetleri
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {/* Total Cost Hero */}
        <motion.div variants={item}>
          <Card className="rounded-3xl border-none shadow-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-6 -bottom-6 h-24 w-24 bg-white/5 rounded-full blur-xl" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-2 mb-1 text-primary-foreground/70">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Toplam Sahip Olma Maliyeti
                </span>
              </div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <h2 className="text-4xl font-outfit font-black text-primary-foreground tracking-tight">
                    ₺29.600
                  </h2>
                  <p className="text-[11px] text-primary-foreground/50 mt-1">
                    2 araç • 2026 yılı
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-xl text-xs font-bold text-primary-foreground">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>%12</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <ArrowDownRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">
                  En Az Harcama
                </p>
                <p className="text-sm font-bold font-outfit">₺800</p>
                <p className="text-[9px] text-muted-foreground">Mart 2026</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">
                  En Çok Harcama
                </p>
                <p className="text-sm font-bold font-outfit">₺4.500</p>
                <p className="text-[9px] text-muted-foreground">Şubat 2026</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Area Chart */}
        <motion.div variants={item}>
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Aylık Masraf Trendi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={mockExpenses}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorTotal"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
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
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow:
                          "0 4px 12px -2px rgb(0 0 0 / 0.12)",
                        fontSize: "12px",
                        padding: "8px 14px",
                        background: "hsl(var(--card))",
                      }}
                      formatter={(value: unknown) => [
                        `₺${Number(value).toLocaleString("tr-TR")}`,
                        "Gider",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#colorTotal)"
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        fill: "hsl(var(--background))",
                        stroke: "hsl(var(--primary))",
                      }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 0,
                        fill: "hsl(var(--primary))",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div variants={item} className="space-y-2.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
            Gider Dağılımı
          </h3>

          {/* Visual bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                className={`${cat.color} first:rounded-l-full last:rounded-r-full`}
                initial={{ width: 0 }}
                animate={{ width: `${cat.percent}%` }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
              />
            ))}
          </div>

          <div className="space-y-2 mt-3">
            {categories.map((category, i) => (
              <motion.div
                key={i}
                variants={item}
                className="bg-card p-3.5 rounded-2xl border border-border/40 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${category.color}`} />
                  <span className="text-xs font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-outfit">
                    {category.amount}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] font-bold border-none ${category.lightColor}`}
                  >
                    %{category.percent}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Prediction */}
        <motion.div variants={item}>
          <Card className="rounded-2xl border-dashed border-primary/30 bg-primary/5 shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold">Tahmini Yıllık Maliyet</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mevcut harcama hızınızla yıl sonu toplam maliyetiniz{" "}
                  <span className="font-bold text-foreground">~₺42.000</span>{" "}
                  olarak tahmin ediliyor.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
