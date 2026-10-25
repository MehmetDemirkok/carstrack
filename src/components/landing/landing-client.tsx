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
  Sparkles,
  Fuel,
  Gavel,
  ClipboardList,
  ScanLine,
  ShieldCheck,
  Lock,
  Database,
  Trash2,
} from "lucide-react";
import { track } from "@vercel/analytics";
import { LANDING_FAQS } from "@/lib/seo";
import { useAuth } from "@/context/auth-context";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { StickyCta } from "@/components/landing/sticky-cta";
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

const personas = [
  {
    icon: Car,
    title: "Aracım var",
    desc: "Tek aracını takip eden bireysel kullanıcı için.",
    points: [
      "Muayene, sigorta ve kasko bitişini kaçırma",
      "Servis geçmişini ve masrafları tek yerde tut",
      "Sınırsız araç ekle, kredi kartı verme",
    ],
    cta: "Ücretsiz başla",
  },
  {
    icon: Users,
    title: "Filom var",
    desc: "Şoförlü araçları ve ekibi yöneten şirketler için.",
    points: [
      "Sürücü ve operatör rolleriyle araç ata",
      "Yakıt, ceza ve arıza maliyetlerini tek panelde gör",
      "PDF ve Excel raporlarıyla muhasebeye aktar",
    ],
    cta: "Filoyu kur",
  },
];

const features = [
  {
    icon: Fuel,
    title: "Yakıt takibi",
    desc: "Litre, kilometre ve tutar bazında araç başına tüketim ve maliyet analizi.",
  },
  {
    icon: Gavel,
    title: "Trafik cezaları",
    desc: "Ceza kaydı, ödeme durumu ve hangi aracın hangi cezayı aldığı tek listede.",
  },
  {
    icon: Wrench,
    title: "Arıza bildirimi",
    desc: "Sürücü arızayı fotoğrafla bildirir; durum takibi yöneticide kalır.",
  },
  {
    icon: ClipboardList,
    title: "Görev ve seyahat",
    desc: "Araç atama, başlangıç-bitiş kilometresi ve seyahat kaydı.",
  },
  {
    icon: Bell,
    title: "Uyarı merkezi",
    desc: "Yaklaşan bakım, biten belge ve kritik uyarılar tek ekranda toplanır.",
  },
  {
    icon: ScanLine,
    title: "Ruhsat fotoğrafından ekleme",
    desc: "Ruhsatın fotoğrafını yükleyin; plaka ve tarihler otomatik doldurulsun.",
  },
];

const security = [
  {
    icon: ShieldCheck,
    title: "Rol bazlı erişim",
    desc: "Sürücü yalnızca kendine atanan aracı ve kendi kayıtlarını görür.",
  },
  {
    icon: Lock,
    title: "Şirket izolasyonu",
    desc: "Her şirketin verisi veritabanı seviyesinde ayrılır; başka firmaya görünmez.",
  },
  {
    icon: Database,
    title: "Otomatik yedek",
    desc: "Veritabanı haftalık olarak yedeklenir; yedekler ayrı bir alanda tutulur.",
  },
  {
    icon: Trash2,
    title: "Veriniz sizde",
    desc: "Kayıtlarınızı dilediğiniz an indirebilir, hesabınızı kalıcı olarak silebilirsiniz.",
  },
];


/* ───────────────────────── sayfa ───────────────────────── */

export default function LandingClient() {
  const { user } = useAuth();
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
            {/* Hero girişi framer-motion yerine saf CSS ile animasyonlu:
                `initial="hidden"` sunucudan inline `opacity:0` gönderiyordu ve
                Googlebot'un ham HTML'inde H1 gizli görünüyordu. */}
            <div className="mx-auto max-w-3xl space-y-7 text-center">
              <div className="animate-rise-in inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Tamamen ücretsiz · Kredi kartı gerekmez
              </div>

              <h1 className="animate-rise-in font-outfit text-display font-black text-balance [animation-delay:90ms]">
                Araç bakım takibi ve{" "}
                <span className="text-gradient">filo yönetimi</span>, tek
                ekranda
              </h1>

              <p className="animate-rise-in mx-auto max-w-2xl text-lead text-muted-foreground text-pretty [animation-delay:180ms]">
                Periyodik bakım hatırlatmaları, sigorta ve muayene takibi,
                servis geçmişi ve filo analitiği — hepsi tek Türkçe platformda,
                otomatik takip altında.
              </p>

              <div className="animate-rise-in flex flex-col justify-center gap-3 sm:flex-row [animation-delay:270ms]">
                <Link
                  href={user ? "/dashboard" : "/register"}
                  onClick={() =>
                    track("cta_click", {
                      konum: "hero",
                      hedef: user ? "dashboard" : "register",
                    })
                  }
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
                  style={{ boxShadow: "var(--brand-glow)" }}
                >
                  {user ? "Panele Git" : "Ücretsiz Başla"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href={user ? "/ozellikler" : "/login"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/60 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                >
                  {user ? "Özellikleri İncele" : "Giriş Yap"}
                </Link>
              </div>

              <ul className="animate-rise-in flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground [animation-delay:360ms]">
                {HERO_POINTS.map((p) => (
                  <li key={p} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-mint-strong" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Ürün önizlemesi — ekran görüntüsü değil, canlı bileşen kopyası.
                Mock arayüz ekran okuyucuya okutulmaz; onun yerine tek cümlelik
                bir açıklama verilir. */}
            <div className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
              <p className="sr-only">
                CarsTrack panelinin örnek görünümü: filo sağlık skoru, araç
                listesi ve yaklaşan bakım/muayene uyarıları.
              </p>
              <div aria-hidden>
                <ProductPreview />
              </div>
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
                  <div
                    aria-hidden
                    className={i % 2 === 1 ? "lg:order-1" : undefined}
                  >
                    {b.visual}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* ── Kimler için ── */}
        <Section tone="muted">
          <SectionHeading
            eyebrow="Kimler için?"
            title="Tek araç da, yüz araç da"
            description="Kendi aracını takip eden de, şoförlü filo yöneten de aynı paneli kullanır — sadece gördüğü ekran değişir."
          />

          <RevealGroup className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
            {personas.map((p) => (
              <motion.div
                key={p.title}
                variants={fadeUp}
                className="flex flex-col rounded-2xl border border-border/60 bg-card p-7"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-primary/20 bg-primary/10">
                  <p.icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="font-outfit mt-5 text-xl font-black">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {p.points.map((pt) => (
                    <li
                      key={pt}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-strong" />
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link
                  href={user ? "/dashboard" : "/register"}
                  onClick={() =>
                    track("cta_click", {
                      konum: `kisi_${p.title}`,
                      hedef: user ? "dashboard" : "register",
                    })
                  }
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  {user ? "Panele git" : p.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </RevealGroup>
        </Section>

        {/* ── Özellikler ── */}
        <Section>
          <SectionHeading
            eyebrow="Özellikler"
            title="Bakımın ötesinde, filonun tamamı"
            description="Yakıttan cezaya, arızadan ruhsat girişine kadar günlük işleriniz tek panelde."
          />

          <RevealGroup className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/30"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="font-outfit mt-4 text-base font-bold">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </RevealGroup>

          <Reveal className="mt-10">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-surface-1/60 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
              <p className="text-sm font-semibold text-pretty">
                İlk aracınızı 5 dakikada ekleyin; kurulum için ekibe ihtiyacınız
                yok.
              </p>
              <Link
                href={user ? "/dashboard" : "/register"}
                onClick={() =>
                  track("cta_click", {
                    konum: "ozellikler_alti",
                    hedef: user ? "dashboard" : "register",
                  })
                }
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
              >
                {user ? "Panele Git" : "Ücretsiz Başla"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </Section>

        {/* ── Güvenlik ── */}
        <Section tone="muted">
          <SectionHeading
            eyebrow="Güvenlik"
            title="Filo verisi şirket sınırının içinde kalır"
            description="CarsTrack çok kiracılı bir mimariyle çalışır: her şirketin kaydı ayrı tutulur, erişim rollerle sınırlanır."
          />

          <RevealGroup className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {security.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="rounded-2xl border border-border/60 bg-card p-6"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="font-outfit mt-4 text-base font-bold">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </RevealGroup>

          <p className="mt-10 text-center text-sm">
            <Link
              href="/privacy"
              className="font-semibold text-primary hover:underline"
            >
              Gizlilik politikasını okuyun
            </Link>
          </p>
        </Section>

        {/* ── SSS ── */}
        <Section>
          <SectionHeading
            eyebrow="SSS"
            title="Sık sorulan sorular"
            description="CarsTrack hakkında merak ettikleriniz."
          />

          <RevealGroup className="mx-auto mt-12 max-w-3xl space-y-3">
            {LANDING_FAQS.slice(0, 4).map((faq) => (
              <motion.details
                key={faq.q}
                variants={fadeUp}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card"
              >
                <summary
                  onClick={() =>
                    track("sss_acildi", { soru: faq.q.slice(0, 80) })
                  }
                  className="flex cursor-pointer list-none select-none items-center justify-between gap-4 px-5 py-4 font-semibold transition-colors hover:bg-muted/40"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-border/50 px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              </motion.details>
            ))}
          </RevealGroup>

          <p className="mt-8 text-center text-sm">
            <Link
              href="/sss"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              Tüm soruların yanıtları
              <ArrowRight className="h-4 w-4" />
            </Link>
          </p>
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
                  Dakikalar içinde ilk aracınızı ekleyin; gerisini CarsTrack
                  takip etsin.
                </p>
                <Link
                  href={user ? "/dashboard" : "/register"}
                  onClick={() =>
                    track("cta_click", {
                      konum: "kapanis",
                      hedef: user ? "dashboard" : "register",
                    })
                  }
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
                  style={{ boxShadow: "var(--brand-glow)" }}
                >
                  {user ? "Panele Git" : "Ücretsiz Başla"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </Section>
      </main>

      <MarketingFooter />

      <StickyCta
        href={user ? "/dashboard" : "/register"}
        label={user ? "Panele Git" : "Ücretsiz Başla"}
      />
    </div>
  );
}
