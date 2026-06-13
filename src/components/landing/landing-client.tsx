"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  animate,
  type Variants,
} from "framer-motion";
import {
  Car, Wrench, Shield, BarChart3, Users, Bell,
  CheckCircle2, ArrowRight, FileText, ChevronRight,
  CalendarDays, Gauge, Disc3, AlertTriangle, Clock, Sparkles, Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LogoMark } from "@/components/brand/logo-mark";

/* ───────────────────────── data ───────────────────────── */

/* ── design.md palette (Material 3) ── */
const PRIMARY = "#d0bcff"; // pastel purple
const SECONDARY = "#4cd7f6"; // cyan
const ON_PRIMARY = "#23005c"; // dark text on gradient/primary surfaces
const GRAD = "linear-gradient(90deg, #d0bcff 0%, #4cd7f6 100%)";
const GLOW = "0 0 24px rgba(109,59,215,0.55)";
const PRIMARY_BG = "rgba(208,188,255,0.10)";
const SECONDARY_BG = "rgba(76,215,246,0.10)";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderTop: "1px solid rgba(255,255,255,0.2)",
  borderLeft: "1px solid rgba(255,255,255,0.2)",
};

const textGradient: React.CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

const features = [
  {
    icon: Wrench,
    title: "Bakım Takibi",
    desc: "Yağ değişimi, fren, filtre gibi periyodik bakımları otomatik takip edin. Kilometre ve zaman bazlı hatırlatmalarla asla kaçırmayın.",
    color: PRIMARY,
    bg: PRIMARY_BG,
  },
  {
    icon: Shield,
    title: "Sigorta & Muayene",
    desc: "Kasko, trafik sigortası ve TÜVTÜRK muayene sürelerini takip edin. Vade dolmadan önce otomatik uyarı alın.",
    color: SECONDARY,
    bg: SECONDARY_BG,
  },
  {
    icon: FileText,
    title: "Servis Geçmişi",
    desc: "Tüm servis ve onarım kayıtlarını dijital arşivde tutun. PDF ve Excel formatında dışa aktarın, paylaşın.",
    color: PRIMARY,
    bg: PRIMARY_BG,
  },
  {
    icon: BarChart3,
    title: "Filo Analitiği",
    desc: "Araç sağlık skoru, maliyet dağılımı ve bakım trendi raporları ile filonuzun gerçek durumunu görün.",
    color: SECONDARY,
    bg: SECONDARY_BG,
  },
  {
    icon: Users,
    title: "Ekip Yönetimi",
    desc: "Şirket yetkilisi ve sürücü rolleri ile araç atama, seyahat takibi ve koordinasyonu kolayca yönetin.",
    color: PRIMARY,
    bg: PRIMARY_BG,
  },
  {
    icon: Bell,
    title: "Akıllı Bildirimler",
    desc: "Kritik bakım ve belge uyarıları anında bildirim olarak ulaşır. E-posta ile de otomatik hatırlatma alın.",
    color: SECONDARY,
    bg: SECONDARY_BG,
  },
];

const steps = [
  {
    num: "01",
    title: "Araçlarınızı Ekleyin",
    desc: "Plaka, marka, model ve kilometre bilgilerini girin. Araç başına bakım kalıplarını tanımlayın.",
    icon: Car,
  },
  {
    num: "02",
    title: "Bakım Verilerini Girin",
    desc: "Son servis tarihi ve km bilgilerini kaydedin. Sigorta ve muayene bitiş tarihlerini ekleyin.",
    icon: CalendarDays,
  },
  {
    num: "03",
    title: "Sisteme Bırakın",
    desc: "CarsTrack otomatik olarak takip eder, hesaplar ve zamanı geldiğinde sizi uyarır.",
    icon: CheckCircle2,
  },
];

const faqs = [
  {
    q: "CarsTrack nedir?",
    a: "CarsTrack, araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini, servis kayıtlarını ve filo durumunu dijital ortamda yönetmenizi sağlayan Türkçe bir araç takip uygulamasıdır. Bireysel araç sahiplerinden şirket filolarına kadar her ölçekte kullanılabilir.",
  },
  {
    q: "CarsTrack ücretsiz mi kullanılabilir?",
    a: "Evet, CarsTrack temel özellikleriyle tamamen ücretsiz kullanılabilir. Kayıt olmak için kredi kartı gerekmez.",
  },
  {
    q: "Kaç araç ekleyebilirim?",
    a: "İstediğiniz kadar araç ekleyebilir ve tüm araçlarınızı tek panelden yönetebilirsiniz. Araç sayısında herhangi bir kısıtlama yoktur.",
  },
  {
    q: "Mobil cihazlarda kullanılabilir mi?",
    a: "Evet, CarsTrack Progressive Web App (PWA) teknolojisiyle geliştirilmiştir. Telefon ve tabletlerde uygulama gibi çalışır, ana ekrana ekleyerek hızlıca erişebilirsiniz.",
  },
  {
    q: "Araç bakım hatırlatıcısı nasıl çalışır?",
    a: "Her araç için kilometre ve zaman bazlı bakım aralıkları tanımlayabilirsiniz. Son bakım tarihini ve kilometresini girdiğinizde CarsTrack otomatik olarak bir sonraki bakım zamanını hesaplar, yaklaşan ve geciken bakımlar için uyarı verir.",
  },
  {
    q: "Verilerimi dışa aktarabilir miyim?",
    a: "Evet, araç raporlarını ve servis geçmişini PDF ve Excel (XLSX) formatında dışa aktarabilirsiniz. Dilediğiniz zaman verilerinizin tam sahibi sizsiniz.",
  },
];

type Stat = {
  to: number;
  suffix?: string;
  decimals?: number;
  text?: string;
  label: string;
  icon: typeof Car;
  color: string;
};

const stats: Stat[] = [
  { to: 247, suffix: "+", label: "Aktif Araç", icon: Car, color: PRIMARY },
  { to: 99.2, suffix: "%", decimals: 1, label: "Kesintisiz Çalışma", icon: Gauge, color: SECONDARY },
  { to: 0, text: "7/24", label: "Gerçek Zamanlı Takip", icon: CheckCircle2, color: PRIMARY },
  { to: 6, label: "Bakım Kategorisi", icon: Disc3, color: SECONDARY },
];

/* ───────────────────────── motion helpers ───────────────────────── */

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/* Animated number that counts up when scrolled into view */
function CountUp({
  to,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.6, ease: EASE });
    const unsub = mv.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, decimals, mv]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ───────────────────────── hero dashboard mockup ───────────────────────── */

const HEALTH = 87;

function HealthRing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const mv = useMotionValue(0);
  const [score, setScore] = useState(0);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, HEALTH, { duration: 1.8, ease: EASE, delay: 0.4 });
    const unsub = mv.on("change", (v) => {
      setScore(Math.round(v));
      setOffset(circumference - (v / 100) * circumference);
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, mv, circumference]);

  return (
    <div ref={ref} className="relative w-[136px] h-[136px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SECONDARY} />
            <stop offset="100%" stopColor={PRIMARY} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Skor</span>
      </div>
    </div>
  );
}

const mockAlerts = [
  { icon: AlertTriangle, label: "34 ABC 12 — Muayene 4 gün", tone: "#f87171", bg: "rgba(248,113,113,0.12)" },
  { icon: Clock, label: "06 XYZ 88 — Yağ değişimi yaklaşıyor", tone: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  { icon: CheckCircle2, label: "35 DEF 45 — Tüm bakımlar güncel", tone: "#34d399", bg: "rgba(52,211,153,0.12)" },
];

function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
      style={{ perspective: 1000 }}
      className="relative mx-auto w-full max-w-md"
    >
      {/* glow behind the card */}
      <div
        className="absolute -inset-6 rounded-[2rem] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(208,188,255,0.30), rgba(76,215,246,0.12) 40%, transparent 70%)" }}
      />
      <div
        className="relative rounded-3xl p-5"
        style={{ ...glassCard, boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)" }}
      >
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full" style={{ background: PRIMARY_BG }}>
              <Car className="h-3.5 w-3.5" style={{ color: PRIMARY }} />
            </div>
            <span className="text-sm font-bold text-white">Filo Paneli</span>
          </div>
          {/* insurance status pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">Sigorta OK</span>
          </div>
        </div>

        {/* score + mini stats */}
        <div className="flex items-center gap-4 mb-4">
          <HealthRing />
          <div className="flex-1 space-y-2">
            {[
              { label: "Toplam Araç", value: "12", w: "100%" },
              { label: "Aktif Uyarı", value: "3", w: "60%" },
              { label: "Bu Ay Servis", value: "5", w: "78%" },
            ].map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.12, duration: 0.5, ease: EASE }}
                className="space-y-1"
              >
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/45">{row.label}</span>
                  <span className="text-white font-semibold">{row.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: GRAD }}
                    initial={{ width: 0 }}
                    animate={{ width: row.w }}
                    transition={{ delay: 0.9 + i * 0.12, duration: 0.9, ease: EASE }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* alert feed */}
        <div className="space-y-2">
          {mockAlerts.map((a, i) => (
            <motion.div
              key={a.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.15, duration: 0.5, ease: EASE }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: a.bg, border: `1px solid ${a.tone}22` }}
            >
              <a.icon className="h-3.5 w-3.5 shrink-0" style={{ color: a.tone }} />
              <span className="text-[11px] text-white/80 font-medium truncate">{a.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* floating chip */}
      <motion.div
        className="absolute -left-4 -bottom-5 rounded-2xl px-4 py-3 hidden sm:flex items-center gap-3 shadow-2xl"
        style={glassCard}
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <span className="grid place-items-center w-8 h-8 rounded-full shrink-0" style={{ background: PRIMARY }}>
          <Bell className="h-4 w-4" style={{ color: ON_PRIMARY }} />
        </span>
        <span className="text-[11px] font-semibold text-white whitespace-nowrap">Bakım hatırlatması</span>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function LandingClient() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl"
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="shrink-0"
            >
              <LogoMark size={36} />
            </motion.div>
            <span
              className="font-extrabold text-lg tracking-tight"
              style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif" }}
            >
              Cars<span style={textGradient}>Track</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={mounted ? (theme === "dark" ? "Açık tema" : "Koyu tema") : undefined}
              aria-label="Tema değiştir"
              suppressHydrationWarning
              className="relative grid place-items-center h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/50"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 text-sm font-bold rounded-full transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: GRAD, color: ON_PRIMARY, boxShadow: GLOW }}
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden pt-20 pb-24 px-4"
        style={{ background: "linear-gradient(160deg, #161a2e 0%, #0f131d 60%, #0a0e18 100%)" }}
      >
        {/* parallax square grid */}
        <motion.div
          style={{
            y: gridY,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          className="absolute inset-0 pointer-events-none opacity-40"
        />
        {/* animated orbs */}
        <motion.div
          className="orb w-[420px] h-[420px] -top-32 left-1/2 -translate-x-1/2"
          style={{ background: "rgba(208,188,255,0.18)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="orb w-72 h-72 top-40 -right-20"
          style={{ background: "rgba(76,215,246,0.16)" }}
          animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          style={{ opacity: heroFade }}
          className="relative max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* left: copy */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="text-center lg:text-left space-y-6"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.75)" }}
            >
              <Sparkles className="h-3 w-3" style={{ color: PRIMARY }} />
              Ücretsiz kullanmaya başlayın · Kredi kartı gerekmez
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Araç Filonuzu{" "}
              <span style={textGradient}>Akıllıca</span>{" "}
              Yönetin
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base md:text-lg text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Bakım takvimi, sigorta ve muayene süreleri, servis geçmişi ve filo sağlık
              analizi — araçlarınızla ilgili her şey tek platformda, otomatik takip altında.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-[1.03] active:scale-95"
                style={{ background: GRAD, color: ON_PRIMARY, boxShadow: GLOW }}
              >
                Hemen Ücretsiz Dene
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
              >
                Giriş Yap
              </Link>
            </motion.div>
          </motion.div>

          {/* right: animated mockup */}
          <HeroMockup />
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border/40 py-10 px-4">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="text-center">
              <p
                className="text-2xl md:text-3xl font-black"
                style={{ fontFamily: "var(--font-outfit), sans-serif", color: stat.color }}
              >
                {stat.text ? stat.text : <CountUp to={stat.to} suffix={stat.suffix} decimals={stat.decimals} />}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
            Her Şey Tek Yerde
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Araç yönetiminde ihtiyaç duyacağınız tüm araçlar, tek bir platformda ve ücretsiz.
          </p>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => (
            <motion.article
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-2xl p-5 border border-border/40 bg-card space-y-3 hover:border-border/80"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: f.bg }}>
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section
        className="py-16 px-4"
        style={{ background: "rgba(208,188,255,0.03)", borderTop: "1px solid rgba(208,188,255,0.08)", borderBottom: "1px solid rgba(208,188,255,0.08)" }}
      >
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
              3 Adımda Başlayın
            </h2>
            <p className="text-sm text-muted-foreground">Dakikalar içinde araçlarınızı sisteme ekleyin.</p>
          </Reveal>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {steps.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} className="relative">
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-5 left-[calc(100%-8px)] w-full h-px z-0"
                    style={{ background: "linear-gradient(90deg, rgba(208,188,255,0.35), transparent)" }}
                  />
                )}
                <div className="relative z-10 text-center space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 4 }}
                    className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                    style={{ background: PRIMARY_BG, border: "1px solid rgba(208,188,255,0.2)" }}
                  >
                    <step.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                  </motion.div>
                  <span className="block text-xs font-black" style={{ color: PRIMARY, fontFamily: "var(--font-ibm-mono), monospace" }}>
                    {step.num}
                  </span>
                  <h3 className="font-bold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
            Sık Sorulan Sorular
          </h2>
          <p className="text-sm text-muted-foreground">CarsTrack hakkında merak ettikleriniz.</p>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-3"
        >
          {faqs.map((faq) => (
            <motion.details
              key={faq.q}
              variants={fadeUp}
              className="group rounded-2xl border border-border/40 bg-card overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none font-semibold text-sm hover:bg-muted/30 transition-colors">
                <span>{faq.q}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
                {faq.a}
              </div>
            </motion.details>
          ))}
        </motion.div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 px-4">
        <Reveal>
          <div
            className="max-w-2xl mx-auto text-center rounded-3xl p-10 space-y-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(208,188,255,0.12) 0%, rgba(76,215,246,0.08) 100%)",
              border: "1px solid rgba(208,188,255,0.2)",
            }}
          >
            <motion.div
              className="orb w-64 h-64 -top-20 left-1/2 -translate-x-1/2"
              style={{ background: "rgba(208,188,255,0.2)" }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              whileHover={{ rotate: -6, scale: 1.05 }}
              className="relative w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: PRIMARY_BG, border: "1px solid rgba(208,188,255,0.28)" }}
            >
              <Car className="h-7 w-7" style={{ color: PRIMARY }} />
            </motion.div>
            <h2 className="relative text-2xl md:text-3xl font-black tracking-tight" style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
              Araçlarınızı Hemen Takibe Alın
            </h2>
            <p className="relative text-sm text-muted-foreground">
              Ücretsiz hesap oluşturun, dakikalar içinde ilk aracınızı ekleyin. Kredi kartı gerekmez.
            </p>
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-transform hover:scale-[1.03] active:scale-95"
              style={{ background: GRAD, color: ON_PRIMARY, boxShadow: GLOW }}
            >
              Ücretsiz Başla
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" style={{ color: PRIMARY }} />
            <span className="font-bold text-sm">
              Cars<span style={textGradient}>Track</span>
            </span>
            <span className="text-muted-foreground text-xs ml-2">
              © {new Date().getFullYear()} Tüm hakları saklıdır.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Gizlilik Politikası</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Giriş Yap</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Kayıt Ol</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
