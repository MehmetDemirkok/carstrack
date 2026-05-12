"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  ChevronDown,
  Car,
  Wrench,
  ClipboardList,
  UserCircle,
  LayoutGrid,
  Mail,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CategoryId = "all" | "vehicles" | "maintenance" | "tasks" | "account";

interface FaqItem {
  category: Exclude<CategoryId, "all">;
  qKey: TranslationKey;
  aKey: TranslationKey;
}

const FAQS: FaqItem[] = [
  { category: "vehicles",    qKey: "help_q1",  aKey: "help_a1" },
  { category: "vehicles",    qKey: "help_q2",  aKey: "help_a2" },
  { category: "vehicles",    qKey: "help_q3",  aKey: "help_a3" },
  { category: "vehicles",    qKey: "help_q4",  aKey: "help_a4" },
  { category: "maintenance", qKey: "help_q5",  aKey: "help_a5" },
  { category: "maintenance", qKey: "help_q6",  aKey: "help_a6" },
  { category: "maintenance", qKey: "help_q7",  aKey: "help_a7" },
  { category: "maintenance", qKey: "help_q8",  aKey: "help_a8" },
  { category: "tasks",       qKey: "help_q9",  aKey: "help_a9" },
  { category: "tasks",       qKey: "help_q10", aKey: "help_a10" },
  { category: "account",     qKey: "help_q11", aKey: "help_a11" },
  { category: "account",     qKey: "help_q12", aKey: "help_a12" },
  { category: "account",     qKey: "help_q13", aKey: "help_a13" },
  { category: "account",     qKey: "help_q14", aKey: "help_a14" },
];

const CATEGORIES: { id: CategoryId; labelKey: TranslationKey; Icon: React.ElementType }[] = [
  { id: "all",         labelKey: "help_cat_all",         Icon: LayoutGrid },
  { id: "vehicles",    labelKey: "help_cat_vehicles",    Icon: Car },
  { id: "maintenance", labelKey: "help_cat_maintenance", Icon: Wrench },
  { id: "tasks",       labelKey: "help_cat_tasks",       Icon: ClipboardList },
  { id: "account",     labelKey: "help_cat_account",     Icon: UserCircle },
];

const CATEGORY_COLORS: Record<Exclude<CategoryId, "all">, string> = {
  vehicles:    "text-violet-500",
  maintenance: "text-orange-500",
  tasks:       "text-violet-500",
  account:     "text-teal-500",
};

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filtered = FAQS.filter(
    (f) => activeCategory === "all" || f.category === activeCategory
  );

  function toggle(idx: number) {
    setExpandedIndex((prev) => (prev === idx ? null : idx));
  }

  function handleCategoryChange(id: CategoryId) {
    setActiveCategory(id);
    setExpandedIndex(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-3xl sm:max-w-[500px] w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(90svh,680px)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 shrink-0">
              <HelpCircle className="h-4.5 w-4.5 text-amber-500" />
            </span>
            <span className="font-outfit font-semibold text-base leading-tight">
              {t("help_title")}
            </span>
          </div>
          <DialogClose render={
            <button className="flex items-center justify-center w-7 h-7 rounded-full bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" />
          }>
            <span className="text-sm leading-none">✕</span>
          </DialogClose>
        </div>

        {/* Category Tabs */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(({ id, labelKey, Icon }) => {
              const active = activeCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => handleCategoryChange(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5 shrink-0" />

        {/* FAQ Label */}
        <div className="px-5 pt-3 shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            {t("help_faq_title")}
          </p>
        </div>

        {/* FAQ List — scrollable, takes all available space */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 space-y-1.5 no-scrollbar">
          {filtered.map((faq, idx) => {
            const isOpen = expandedIndex === idx;
            const colorClass = CATEGORY_COLORS[faq.category];
            const CategoryIcon = CATEGORIES.find((c) => c.id === faq.category)?.Icon ?? HelpCircle;

            return (
              <div
                key={faq.qKey}
                className={cn(
                  "rounded-2xl border transition-colors overflow-hidden",
                  isOpen
                    ? "bg-muted/60 border-border"
                    : "bg-muted/30 border-transparent hover:bg-muted/50"
                )}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <span className={cn("shrink-0", colorClass)}>
                    <CategoryIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-sm font-semibold leading-snug">
                    {t(faq.qKey)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-3.5">
                    <div className="ml-[26px] pl-3 text-[13px] text-muted-foreground leading-relaxed border-l-2 border-muted">
                      {t(faq.aKey)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="mx-5 mt-2 mb-3 rounded-2xl bg-muted/40 border border-border px-4 py-3 flex items-center gap-3 shrink-0">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
            <Mail className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">{t("help_contact")}</p>
            <a
              href="mailto:mehmetdemirkok@gmail.com"
              className="text-sm font-semibold text-primary hover:underline break-all"
            >
              mehmetdemirkok@gmail.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 shrink-0">
          <DialogClose render={<Button variant="outline" className="w-full rounded-xl" />}>
            {t("help_close")}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
