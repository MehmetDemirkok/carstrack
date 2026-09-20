"use client";

import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef } from "react";
import {
  Car,
  Wrench,
  Shield,
  BarChart3,
  Users,
  Bell,
  FileText,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { LANDING_FAQS } from "@/lib/seo";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  Reveal,
  RevealGroup,
  fadeUp,
} from "@/components/marketing/motion-primitives";
import {
  ProductPreview,
  AlertFeed,
  HealthPanel,
  TeamPanel,
} from "@/components/marketing/product-preview";

/* ───────────────────────── içerik ─────────────────────────
   Buradaki her ifade ürünün gerçekten yaptığı bir şeyi anlatır.
   Doğrulanamayan sosyal kanıt ("500+ şirket güveniyor") ve rakam
   vaadi eden sahte istatistik bandı bilinçli olarak kaldırıldı. */

const HERO_POINTS = [
  "Sınırsız araç ve kullanıcı",
  "PDF & Excel dışa aktarım",
  "Telefonda uygulama gibi çalışır",
];

type Benefit = {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: { icon: typeof Car; text: string }[];
  visual: React.ReactNode;
};

const benefits: Benefit[] = [
  {
    eyebrow: "Hatırlatmalar",
    title: "Hiçbir bakımı ve belgeyi kaçırmayın",
    desc: "Periyodik bakımları kilometre ve zamana göre planlayın; sigorta ile muayene süreleri dolmadan önce uyarı alın.",
    bullets: [
      {
        icon: Wrench,
        text: "Yağ, fren, filtre gibi bakımlar için km ve zaman bazlı takip",
      },
      {
        icon: Shield,
        text: "Kasko, trafik sigortası ve TÜVTÜRK muayene süreleri",
      },
    ],
    visual: (
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <AlertFeed />
      </div>
    ),
  },
  {
    eyebrow: "Görünürlük",
    title: "Filonuzun gerçek durumunu görün",
    desc: "Araç sağlık skoru, maliyet dağılımı ve bakım trendi ile filonun nerede olduğunu tahmin etmeyi bırakın.",
    bullets: [
      {
        icon: BarChart3,
        text: "Sağlık skoru, maliyet dağılımı ve bakım trendi raporları",
      },
      {
        icon: FileText,
        text: "Servis geçmişi arşivi — PDF ve Excel olarak dışa aktarın",
      },
    ],
    visual: <HealthPanel />,
  },
  {
    eyebrow: "Ekip",
    title: "Ekibinizle birlikte yönetin",
    desc: "Yönetici, operatör ve sürücü rolleriyle araç atayın; kritik uyarılar doğru kişiye kendiliğinden ulaşsın.",
    bullets: [
      {
        icon: Users,
        text: "Yönetici, operatör ve sürücü rolleri ile araç atama",
      },
      {
        icon: Bell,
        text: "Kritik uyarılar anlık bildirim ve e-posta olarak iletilir",
      },
    ],
    visual: <TeamPanel />,
  },
];

const steps = [
  {
    num: "01",
    title: "Araçlarınızı ekleyin",
    desc: "Plaka, marka, model ve kilometre bilgilerini girin. Ruhsat fotoğrafından otomatik de ekleyebilirsiniz.",
    icon: Car,
  },
  {
    num: "02",
    title: "Bakım verilerini girin",
    desc: "Son servis tarihi ve km bilgilerini kaydedin. Sigorta ve muayene bitiş tarihlerini ekleyin.",
    icon: CalendarDays,
  },
  {
    num: "03",
    title: "Sisteme bırakın",
    desc: "CarsTrack otomatik olarak takip eder, hesaplar ve zamanı geldiğinde sizi uyarır.",
    icon: CheckCircle2,
  },
];


/* ───────────────────────── sayfa ───────────────────────── */

export default function LandingClient() {
  const heroRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 110]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <MarketingNav />

      <main id="icerik">
        {/* ── Hero ───────────────────────────────────────────────
          Zemin artık sabit lacivert değil, --hero-bg token'ı: açık
          temada açık, koyu temada koyu. Hero ile gövde arasındaki
          sert renk dikişi bu sayede yok. */}
        <section ref={heroRef} className="relative overflow-hidden bg-hero">
          <motion.div
            aria-hidden
            style={reduce ? undefined : { y: gridY }}
            className="bg-hero-grid pointer-events-none absolute inset-0 opacity-70"
          />
          <div
            aria-hidden
            className="orb -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2"
            style={{
              background:
                "color-mix(in oklab, var(--brand-1) 16%, transparent)",
            }}
          />
          <div
            aria-hidden
            className="orb -right-32 top-32 h-80 w-80"
            style={{
              background:
                "color-mix(in oklab, var(--brand-2) 14%, transparent)",
            }}
          />

          <div className="container-marketing relative pt-20 pb-section-tight sm:pt-28">
            <motion.div
              variants={
                reduce
                  ? undefined
                  : {
                      hidden: {},
                      show: { transition: { staggerChildren: 0.09 } },
                    }
              }
              initial={reduce ? undefined : "hidden"}
              animate={reduce ? undefined : "show"}
              className="mx-auto max-w-3xl space-y-7 text-center"
            >
              <motion.div
                variants={reduce ? undefined : fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Ücretsiz kullanmaya başlayın · Kredi kartı gerekmez
              </motion.div>

              <motion.h1
                variants={reduce ? undefined : fadeUp}
                className="font-outfit text-display font-black text-balance"
              >
                Filonuzun <span className="text-gradient">tam kontrolü</span>,
                tek ekranda
              </motion.h1>

              <motion.p
                variants={reduce ? undefined : fadeUp}
                className="mx-auto max-w-2xl text-lead text-muted-foreground text-pretty"
              >
                Araç bakım takibi, sigorta ve muayene hatırlatmaları, servis
                geçmişi ve filo analitiği — hepsi tek Türkçe platformda,
                otomatik takip altında.
              </motion.p>

              <motion.div
                variants={reduce ? undefined : fadeUp}
                className="flex flex-col justify-center gap-3 sm:flex-row"
              >
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
                  style={{ boxShadow: "var(--brand-glow)" }}
                >
                  Ücretsiz Başla
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/60 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                >
                  Giriş Yap
                </Link>
              </motion.div>

              <motion.ul
                variants={reduce ? undefined : fadeUp}
                className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
              >
                {HERO_POINTS.map((p) => (
                  <li key={p} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-mint-strong" />
                    {p}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Ürün önizlemesi — ekran görüntüsü değil, canlı bileşen kopyası */}
            <div className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* ── Faydalar ── */}
        <Section>
          <SectionHeading
            eyebrow="Neden CarsTrack?"
            title="Takip etmeyi bırakın, takip edilsin"
            description="Araç yönetiminde ihtiyaç duyduğunuz üç şey — hatırlatma, görünürlük ve ekip koordinasyonu — tek platformda."
          />

          <div className="mt-16 space-y-20 sm:space-y-24">
            {benefits.map((b, i) => (
              <Reveal key={b.title}>
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {b.eyebrow}
                    </span>
                    <h3 className="font-outfit mt-3 text-2xl font-black tracking-tight sm:text-3xl text-balance">
                      {b.title}
                    </h3>
                    <p className="mt-4 leading-relaxed text-muted-foreground">
                      {b.desc}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {b.bullets.map((bl) => (
                        <li key={bl.text} className="flex items-start gap-3">
                          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10">
                            <bl.icon className="h-3.5 w-3.5 text-primary" />
                          </span>
                          <span className="text-sm leading-relaxed text-muted-foreground">
                            {bl.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={i % 2 === 1 ? "lg:order-1" : undefined}>
                    {b.visual}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* ── Nasıl çalışır ── */}
        <Section tone="muted">
          <SectionHeading
            eyebrow="Kurulum"
            title="3 adımda başlayın"
            description="Dakikalar içinde araçlarınızı sisteme ekleyin."
          />

          <RevealGroup className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} className="relative">
                {i < steps.length - 1 && (
                  <div
                    aria-hidden
                    className="absolute left-[calc(100%-1rem)] top-7 z-0 hidden h-px w-full md:block"
                    style={{
                      background:
                        "linear-gradient(90deg, color-mix(in oklab, var(--brand-1) 35%, transparent), transparent)",
                    }}
                  />
                )}
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </span>
                    <span className="font-mono text-sm font-bold text-primary">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="font-outfit text-lg font-bold">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </Section>

        {/* ── SSS ── */}
        <Section>
          <SectionHeading
            eyebrow="SSS"
            title="Sık sorulan sorular"
            description="CarsTrack hakkında merak ettikleriniz."
          />

          <RevealGroup className="mx-auto mt-12 max-w-3xl space-y-3">
            {LANDING_FAQS.map((faq) => (
              <motion.details
                key={faq.q}
                variants={fadeUp}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card"
              >
                <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-4 px-5 py-4 font-semibold transition-colors hover:bg-muted/40">
                  <span>{faq.q}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-border/50 px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </RevealGroup>
        </Section>

        {/* ── Kapanış CTA ── */}
        <Section tight>
          <Reveal>
            <div
              className="relative overflow-hidden rounded-3xl border border-primary/20 p-10 text-center sm:p-14"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--brand-1) 12%, transparent) 0%, color-mix(in oklab, var(--brand-2) 8%, transparent) 100%)",
              }}
            >
              <div
                aria-hidden
                className="orb -top-24 left-1/2 h-72 w-72 -translate-x-1/2"
                style={{
                  background:
                    "color-mix(in oklab, var(--brand-1) 18%, transparent)",
                }}
              />
              <div className="relative mx-auto max-w-2xl space-y-5">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Car className="h-7 w-7 text-primary" />
                </span>
                <h2 className="font-outfit text-section font-black text-balance">
                  Araçlarınızı hemen takibe alın
                </h2>
                <p className="text-muted-foreground text-pretty">
                  Ücretsiz hesap oluşturun, dakikalar içinde ilk aracınızı
                  ekleyin. Kredi kartı gerekmez.
                </p>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
                  style={{ boxShadow: "var(--brand-glow)" }}
                >
                  Ücretsiz Başla
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </Section>
      </main>

      <MarketingFooter />
    </div>
  );
}
