"use client";

import { motion } from "framer-motion";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Filter,
  Disc3,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTimeline } from "@/lib/mock-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

const typeConfig = {
  routine: {
    icon: CheckCircle2,
    color: "bg-blue-500",
    label: "Periyodik",
    labelBg: "bg-blue-500/10 text-blue-500",
  },
  repair: {
    icon: AlertTriangle,
    color: "bg-orange-500",
    label: "Onarım",
    labelBg: "bg-orange-500/10 text-orange-500",
  },
  tire: {
    icon: Disc3,
    color: "bg-teal-500",
    label: "Lastik",
    labelBg: "bg-teal-500/10 text-teal-500",
  },
};

export default function HistoryPage() {
  const totalCost = mockTimeline.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="p-4 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-outfit font-bold tracking-tight">
            Servis Geçmişi
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mockTimeline.length} işlem • Toplam ₺
            {totalCost.toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9 shadow-sm border-border/50"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="rounded-full h-9 w-9 shadow-md"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {["Tümü", "Periyodik", "Onarım", "Lastik"].map((filter, i) => (
          <button
            key={filter}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors border ${
              i === 0
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative ml-4 pb-12"
      >
        {/* Timeline Line */}
        <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent" />

        <div className="space-y-6">
          {mockTimeline.map((record) => {
            const config = typeConfig[record.type];
            const Icon = config.icon;
            return (
              <motion.div variants={item} key={record.id} className="relative pl-8">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-3 top-4 h-6 w-6 rounded-full border-[3px] border-background flex items-center justify-center shadow-md ${config.color}`}
                >
                  <Icon className="h-3 w-3 text-white" />
                </div>

                <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/40 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm">{record.title}</h3>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] h-4 px-1.5 rounded-md font-bold border-none ${config.labelBg}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {record.date}
                      </p>
                    </div>
                    <span className="font-outfit font-bold text-sm shrink-0">
                      {record.costLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3 font-medium">
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span>{record.vehicle}</span>
                    </div>
                    <span>•</span>
                    <span>{record.service}</span>
                    <span>•</span>
                    <span>{record.km}</span>
                  </div>

                  <div className="bg-muted/40 rounded-xl p-3 text-[11px] text-muted-foreground leading-relaxed border border-border/20">
                    {record.notes}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
