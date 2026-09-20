"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import {
  Car, Wrench, Shield, BarChart3, Bell, AlertTriangle, Clock,
  CheckCircle2, Users, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE, CountUp } from "./motion-primitives";

/* ─────────────────────────────────────────────────────────────
   Ürün önizlemesi — ekran görüntüsü DEĞİL, gerçek bileşenlerle
   kurulmuş canlı bir kopya. PNG bakımı gerektirmez, temayla
   birlikte değişir ve mobilde bozulmaz.
   ───────────────────────────────────────────────────────────── */

const HEALTH = 87;

/** Filo sağlık skoru halkası. */
export function HealthRing({ size = 132 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const mv = useMotionValue(0);
  const [score, setScore] = useState(0);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setScore(HEALTH);
      setOffset(circumference - (HEALTH / 100) * circumference);
      return;
    }
    const controls = animate(mv, HEALTH, { duration: 1.8, ease: EASE, delay: 0.3 });
    const unsub = mv.on("change", (v) => {
      setScore(Math.round(v));
      setOffset(circumference - (v / 100) * circumference);
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, mv, circumference, reduce]);

  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="url(#ctRingGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ctRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand-2)" />
            <stop offset="100%" stopColor="var(--brand-1)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-outfit text-3xl font-black text-foreground">{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filo Skoru
        </span>
      </div>
    </div>
  );
}

const ALERTS = [
  { icon: AlertTriangle, label: "34 ABC 12", detail: "Muayene 4 gün kaldı", tone: "destructive" },
  { icon: Clock, label: "06 XYZ 88", detail: "Yağ değişimi yaklaşıyor", tone: "warning" },
  { icon: CheckCircle2, label: "35 DEF 45", detail: "Tüm bakımlar güncel", tone: "mint" },
] as const;

const TONE: Record<string, { text: string; bg: string; border: string }> = {
  destructive: { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  warning: { text: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  mint: { text: "text-mint-strong", bg: "bg-mint/10", border: "border-mint/20" },
};

/** Uyarı akışı — hem büyük önizlemede hem fayda bölümlerinde kullanılır. */
export function AlertFeed({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("space-y-2", className)}>
      {ALERTS.map((a, i) => {
        const t = TONE[a.tone];
        return (
          <motion.div
            key={a.label}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE }}
            className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", t.bg, t.border)}
          >
            <a.icon className={cn("h-4 w-4 shrink-0", t.text)} />
            <span className="font-mono text-xs font-semibold text-foreground">{a.label}</span>
            <span className="truncate text-xs text-muted-foreground">{a.detail}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

const KPIS = [
  { label: "Toplam Araç", value: 12, icon: Car },
  { label: "Aktif Uyarı", value: 3, icon: Bell },
  { label: "Bu Ay Servis", value: 5, icon: Wrench },
  { label: "Geçerli Poliçe", value: 11, icon: Shield },
];

const ROWS = [
  { plate: "34 ABC 12", model: "Ford Transit", km: "148.320", status: "Muayene yakın", tone: "destructive" },
  { plate: "06 XYZ 88", model: "Renault Kangoo", km: "96.540", status: "Bakım yaklaşıyor", tone: "warning" },
  { plate: "35 DEF 45", model: "Fiat Doblo", km: "72.110", status: "Güncel", tone: "mint" },
  { plate: "16 GHJ 07", model: "VW Caddy", km: "51.905", status: "Güncel", tone: "mint" },
];

const NAV = [
  { icon: LayoutDashboard, label: "Panel", active: true },
  { icon: Car, label: "Araçlar" },
  { icon: Wrench, label: "Bakım" },
  { icon: BarChart3, label: "Analitik" },
  { icon: Users, label: "Ekip" },
];

/**
 * Tarayıcı çerçevesi içinde tam panel önizlemesi.
 * Hero'nun ve "ürün ekranı" bölümünün ana görseli.
 */
export function ProductPreview({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Panel scroll ile yerine oturur: hafif yatık ve küçük başlar, ekranın
  // ortasına geldiğinde düzleşir. Hareket azaltma tercihinde hiç uygulanmaz.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [9, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.93, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0.4, 1]);

  return (
    <motion.div
      ref={ref}
      style={
        reduce
          ? undefined
          : { rotateX, scale, opacity, transformPerspective: 1400, transformOrigin: "50% 100%" }
      }
      className={cn("relative", className)}
    >
      {/* arkadaki marka parıltısı */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[2.5rem] opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--brand-1) 22%, transparent), transparent 65%)",
        }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        {/* tarayıcı çubuğu */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-surface-1 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint/50" />
          </div>
          <div className="mx-auto flex max-w-xs flex-1 items-center justify-center rounded-md bg-background/70 px-3 py-1">
            <span className="font-mono text-[10px] text-muted-foreground">
              carstrack.app/dashboard
            </span>
          </div>
        </div>

        <div className="flex">
          {/* kenar çubuğu */}
          <aside className="hidden w-40 shrink-0 border-r border-border/60 bg-surface-1/60 p-3 sm:block">
            <div className="space-y-1">
              {NAV.map((n) => (
                <div
                  key={n.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium",
                    n.active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <n.icon className="h-3.5 w-3.5" />
                  {n.label}
                </div>
              ))}
            </div>
          </aside>

          {/* ana alan */}
          <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {KPIS.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: EASE }}
                  className="rounded-xl border border-border/60 bg-background/60 p-3"
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <k.icon className="h-3 w-3" />
                    <span className="truncate text-[10px] font-medium">{k.label}</span>
                  </div>
                  <p className="font-outfit mt-1 text-xl font-black text-foreground">
                    <CountUp to={k.value} />
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
              <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background/60 p-4">
                <HealthRing size={124} />
              </div>
              <AlertFeed />
            </div>

            {/* araç tablosu */}
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-border/60 bg-surface-1/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Plaka</span>
                <span className="hidden sm:block">Model</span>
                <span>Durum</span>
              </div>
              {ROWS.map((r) => (
                <div
                  key={r.plate}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 border-b border-border/40 px-3 py-2 last:border-0"
                >
                  <span className="font-mono text-xs font-semibold text-foreground">{r.plate}</span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">
                    {r.model}
                  </span>
                  <span
                    className={cn(
                      "justify-self-end rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      TONE[r.tone].bg,
                      TONE[r.tone].border,
                      TONE[r.tone].text
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const BARS = [
  { label: "Bakım maliyeti", value: "₺48.200", w: "72%" },
  { label: "Yakıt", value: "₺61.450", w: "88%" },
  { label: "Sigorta & vergi", value: "₺22.900", w: "41%" },
];

/** Fayda bölümü görseli — sağlık skoru + maliyet dağılımı. */
export function HealthPanel() {
  const reduce = useReducedMotion();
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-5">
        <HealthRing size={116} />
        <div className="min-w-0 flex-1 space-y-3">
          {BARS.map((b, i) => (
            <div key={b.label} className="space-y-1.5">
              <div className="flex justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">{b.label}</span>
                <span className="font-semibold text-foreground">{b.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--brand-gradient)" }}
                  initial={reduce ? false : { width: 0 }}
                  whileInView={{ width: b.w }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.12, duration: 0.9, ease: EASE }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TEAM = [
  { name: "Ayşe K.", role: "Yönetici", initials: "AK" },
  { name: "Mehmet D.", role: "Operatör", initials: "MD" },
  { name: "Can Y.", role: "Sürücü · 34 ABC 12", initials: "CY" },
];

/** Fayda bölümü görseli — roller ve bildirim. */
export function TeamPanel() {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-2.5 rounded-2xl border border-border/60 bg-card p-5">
      {TEAM.map((m, i) => (
        <motion.div
          key={m.name}
          initial={reduce ? false : { opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: EASE }}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {m.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{m.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{m.role}</p>
          </div>
        </motion.div>
      ))}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
        <Bell className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Muayene uyarısı</span> — 3 yöneticiye
          bildirim ve e-posta gönderildi.
        </span>
      </div>
    </div>
  );
}
