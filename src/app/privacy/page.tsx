"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield, Database, Lock, Eye, Server, Trash2, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function PrivacyPage() {
  const { t } = useLanguage();

  const sections = [
    {
      icon: Eye,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      title: t("privacy_data_title"),
      body: t("privacy_data_desc"),
    },
    {
      icon: Database,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      title: t("privacy_storage_title"),
      body: t("privacy_storage_desc"),
    },
    {
      icon: Lock,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      title: t("privacy_security_title"),
      body: t("privacy_security_desc"),
    },
    {
      icon: Trash2,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      title: t("privacy_delete_title"),
      body: t("privacy_delete_desc"),
    },
    {
      icon: Server,
      iconBg: "bg-gray-500/10",
      iconColor: "text-gray-500",
      title: t("privacy_third_title"),
      body: t("privacy_third_desc"),
    },
  ];

  return (
    <div className="p-4 space-y-5 pb-28 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-outfit font-bold tracking-tight">{t("privacy_title")}</h1>
      </div>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="rounded-3xl border-none shadow-lg overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl shrink-0">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="font-outfit font-bold text-white text-lg leading-tight">
                {t("privacy_title")}
              </p>
              <p className="text-white/75 text-xs mt-1 leading-relaxed">
                CarsTrack · 2025
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sections */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
        {sections.map(({ icon: Icon, iconBg, iconColor, title, body }) => (
          <motion.div key={title} variants={fadeUp}>
            <Card className="rounded-2xl border-border/40 shadow-sm">
              <CardContent className="p-4 flex gap-4">
                <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 h-fit mt-0.5`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[11px] text-muted-foreground px-4"
      >
        © 2025 CarsTrack · Tüm hakları saklıdır.
      </motion.p>
    </div>
  );
}
