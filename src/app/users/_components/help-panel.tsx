"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, ChevronDown, HelpCircle, Mail, Pencil, Route, Search, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const HELP_KEY = "users-help-dismissed";

const HELP_STEPS: { Icon: React.ElementType; title: string; desc: string }[] = [
  {
    Icon: Users,
    title: "Ekip üyeleri",
    desc: "Şirketinize bağlı herkes burada; önce yönetim, ardından sürücüler listelenir. Sürücüler, ilgilenmeniz gereken durumlar (ehliyet, araçsız) üstte olacak şekilde sıralanır.",
  },
  {
    Icon: Search,
    title: "Arama ve filtre",
    desc: "İsim, departman veya plakayla arayabilir; üstteki sayılara ya da filtre çiplerine tıklayarak listeyi daraltabilirsiniz.",
  },
  {
    Icon: ShieldCheck,
    title: "Roller ve yetkiler",
    desc: "Kullanıcı ve Şoför yalnızca kendine atanan araçları görüp kilometre/görev günceller. Operatör tüm araç, görev ve cezaları yönetir ama ekip davet edemez. Şirket Yetkilisi tam yetkilidir.",
  },
  {
    Icon: Mail,
    title: "Ekibe davet",
    desc: "Yalnızca Şirket Yetkilisi e-posta ile davet gönderir. Davet kabul edilince kişi otomatik olarak listeye eklenir; bekleyen davetler üstte görünür.",
  },
  {
    Icon: Car,
    title: "Araç atama",
    desc: "Sürücü kartındaki araç ikonuyla ona araç atayabilir veya atamayı kaldırabilirsiniz. Bir araç birden fazla sürücüye atanabilir.",
  },
  {
    Icon: Route,
    title: "Durum ve ehliyet",
    desc: "“Aktif seyahat” etiketi canlı süre ile birlikte gösterilir. Ehliyet geçerliliği de kartta renkli olarak işaretlenir.",
  },
  {
    Icon: Pencil,
    title: "Düzenleme",
    desc: "Kalem ikonuyla ad ve departman bilgisini; yetkiniz varsa kullanıcının rolünü değiştirebilirsiniz.",
  },
];

function safeGet(): string | null {
  try { return localStorage.getItem(HELP_KEY); } catch { return null; }
}
function safeSet(v: string) {
  try { localStorage.setItem(HELP_KEY, v); } catch { /* yoksay */ }
}

/** "Bu sayfa nasıl çalışır?" kartı — ilk girişte açık, kapatılınca hatırlanır. */
export function HelpPanel() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (safeGet() === "1") setOpen(false);
  }, []);

  function toggle() {
    setOpen((v) => {
      safeSet(v ? "1" : "0");
      return !v;
    });
  }

  function dismiss() {
    setOpen(false);
    safeSet("1");
  }

  return (
    <div className="glass rounded-3xl border border-border/40 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-3xl"
      >
        <span className="p-2 rounded-xl bg-primary/10 shrink-0">
          <HelpCircle className="h-5 w-5 text-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Bu sayfa nasıl çalışır?</p>
          <p className="text-xs text-muted-foreground">Ekip, roller ve araç atamaları hakkında kısa bilgi</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-2.5">
                {HELP_STEPS.map(({ Icon, title, desc }) => (
                  <div key={title} className="flex gap-3 rounded-2xl bg-muted/30 border border-border/30 p-3">
                    <span className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                >
                  Bir daha gösterme
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
