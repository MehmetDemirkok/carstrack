import type { Metadata } from "next";
import Link from "next/link";
import {
  Car, Wrench, Shield, BarChart3, Users, Bell,
  CheckCircle2, ArrowRight, FileText, ChevronRight,
  CalendarDays, Gauge, Disc3,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
  description:
    "Araçlarınızın bakım takvimi, sigorta ve muayene tarihleri, servis geçmişi ve filo sağlık analizi. Türkiye'nin akıllı araç takip uygulaması ile periyodik bakımları asla kaçırmayın.",
  keywords: [
    "araç bakım takip",
    "araç servis takip",
    "filo yönetim sistemi",
    "araç sigorta muayene takip",
    "periyodik bakım hatırlatıcı",
    "araç masraf yönetimi",
    "servis geçmişi takip",
    "araç bakım programı",
    "filo takip uygulaması",
    "fleet management türkiye",
    "araç bakım uygulaması",
    "carstrack",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "CarsTrack",
    title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
    description:
      "Araçlarınızın bakım takvimi, sigorta ve muayene tarihleri, servis geçmişi ve filo sağlık analizi.",
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Araç Bakım Takip" }],
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
    description: "Araçlarınızın bakım takvimi, sigorta ve muayene tarihlerini tek yerden yönetin.",
    images: [`${APP_URL}/og-image.png`],
  },
};

const features = [
  {
    icon: Wrench,
    title: "Bakım Takibi",
    desc: "Yağ değişimi, fren, filtre gibi periyodik bakımları otomatik takip edin. Kilometre ve zaman bazlı hatırlatmalarla asla kaçırmayın.",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
  },
  {
    icon: Shield,
    title: "Sigorta & Muayene",
    desc: "Kasko, trafik sigortası ve TÜVTÜRK muayene sürelerini takip edin. Vade dolmadan önce otomatik uyarı alın.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
  },
  {
    icon: FileText,
    title: "Servis Geçmişi",
    desc: "Tüm servis ve onarım kayıtlarını dijital arşivde tutun. PDF ve Excel formatında dışa aktarın, paylaşın.",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
  },
  {
    icon: BarChart3,
    title: "Filo Analitiği",
    desc: "Araç sağlık skoru, maliyet dağılımı ve bakım trendi raporları ile filonuzun gerçek durumunu görün.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
  {
    icon: Users,
    title: "Ekip Yönetimi",
    desc: "Şirket yetkilisi ve sürücü rolleri ile araç atama, seyahat takibi ve koordinasyonu kolayca yönetin.",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
  },
  {
    icon: Bell,
    title: "Akıllı Bildirimler",
    desc: "Kritik bakım ve belge uyarıları anında bildirim olarak ulaşır. E-posta ile de otomatik hatırlatma alın.",
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
  },
];

const steps = [
  {
    num: "01",
    title: "Araçlarınızı Ekleyin",
    desc: "Plaka, marka, model ve kilometre bilgilerini girin. Araç başına bakım kaliplerini tanımlayın.",
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

const stats = [
  { value: "247+", label: "Aktif Araç", icon: Car },
  { value: "99.2%", label: "Kesintisiz Çalışma", icon: Gauge },
  { value: "7/24", label: "Gerçek Zamanlı Takip", icon: CheckCircle2 },
  { value: "6", label: "Bakım Kategorisi", icon: Disc3 },
];

export default function LandingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CarsTrack",
    url: APP_URL,
    description:
      "Araç bakım takibi, sigorta ve muayene yönetimi, servis geçmişi ve filo analizi.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
    inLanguage: "tr-TR",
    screenshot: `${APP_URL}/og-image.png`,
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CarsTrack",
    url: APP_URL,
    logo: `${APP_URL}/logo.svg`,
    description: "Araç bakım takip ve filo yönetim sistemi",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <div className="min-h-screen bg-background text-foreground">

        {/* ── Navbar ── */}
        <nav
          className="sticky top-0 z-50 border-b border-border/40"
          style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(20px)" }}
        >
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.28)" }}
              >
                <Car className="h-4 w-4" style={{ color: "#6366f1" }} />
              </div>
              <span
                className="font-extrabold text-lg tracking-tight"
                style={{ fontFamily: "var(--font-barlow), var(--font-outfit), sans-serif" }}
              >
                Cars<span style={{ color: "#6366f1" }}>Track</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/50"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-bold rounded-xl transition-all"
                style={{
                  background: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                  color: "#fff",
                }}
              >
                Ücretsiz Başla
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section
          className="relative overflow-hidden py-20 px-4 text-center"
          style={{ background: "linear-gradient(160deg, #12122e 0%, #0d0d21 60%, #09090b 100%)" }}
        >
          {/* Hex grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpath d='M30 0 L60 17.3 L60 34.7 L30 52 L0 34.7 L0 17.3Z' fill='none' stroke='rgba(99,102,241,0.07)' stroke-width='0.8'/%3E%3C/svg%3E")`,
              backgroundSize: "60px 52px",
            }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
          />

          <div className="relative max-w-3xl mx-auto space-y-6">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Ücretsiz kullanmaya başlayın
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Araç Filonuzu{" "}
              <span style={{ color: "#6366f1" }}>Akıllıca</span>{" "}
              Yönetin
            </h1>

            <p className="text-base md:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
              Bakım takvimi, sigorta ve muayene süreleri, servis geçmişi ve filo sağlık analizi —
              araçlarınızla ilgili her şey tek platformda.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                  color: "#fff",
                  boxShadow: "0 0 24px rgba(99,102,241,0.35)",
                }}
              >
                Hemen Ücretsiz Dene <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="border-y border-border/40 py-8 px-4">
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="text-2xl font-black"
                  style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#6366f1" }}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-2xl md:text-3xl font-black tracking-tight mb-3"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Her Şey Tek Yerde
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Araç yönetiminde ihtiyaç duyacağınız tüm araçlar, tek bir platformda ve ücretsiz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl p-5 border border-border/40 bg-card space-y-3 hover:border-border/80 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: f.bg }}
                >
                  <f.icon className="h-5 w-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          className="py-16 px-4"
          style={{ background: "rgba(99,102,241,0.03)", borderTop: "1px solid rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.08)" }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2
                className="text-2xl md:text-3xl font-black tracking-tight mb-3"
                style={{ fontFamily: "var(--font-outfit), sans-serif" }}
              >
                3 Adımda Başlayın
              </h2>
              <p className="text-sm text-muted-foreground">Dakikalar içinde araçlarınızı sisteme ekleyin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div key={step.num} className="relative">
                  {i < steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-5 left-[calc(100%-8px)] w-full h-px z-0"
                      style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.3), transparent)" }}
                    />
                  )}
                  <div className="relative z-10 text-center space-y-3">
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      <step.icon className="h-5 w-5" style={{ color: "#6366f1" }} />
                    </div>
                    <span
                      className="block text-xs font-black"
                      style={{ color: "#6366f1", fontFamily: "var(--font-ibm-mono), monospace" }}
                    >
                      {step.num}
                    </span>
                    <h3 className="font-bold text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 px-4 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-2xl md:text-3xl font-black tracking-tight mb-3"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Sık Sorulan Sorular
            </h2>
            <p className="text-sm text-muted-foreground">CarsTrack hakkında merak ettikleriniz.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-border/40 bg-card overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none font-semibold text-sm hover:bg-muted/30 transition-colors">
                  <span>{faq.q}</span>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3 transition-transform group-open:rotate-90"
                  />
                </summary>
                <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-16 px-4">
          <div
            className="max-w-2xl mx-auto text-center rounded-3xl p-10 space-y-5"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(79,70,229,0.08) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.28)" }}
            >
              <Car className="h-7 w-7" style={{ color: "#6366f1" }} />
            </div>
            <h2
              className="text-2xl md:text-3xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Araçlarınızı Hemen Takibe Alın
            </h2>
            <p className="text-sm text-muted-foreground">
              Ücretsiz hesap oluşturun, dakikalar içinde ilk aracınızı ekleyin.
              Kredi kartı gerekmez.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
              style={{
                background: "linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)",
                color: "#fff",
                boxShadow: "0 0 32px rgba(99,102,241,0.3)",
              }}
            >
              Ücretsiz Başla <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border/40 py-8 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4" style={{ color: "#6366f1" }} />
              <span className="font-bold text-sm">
                Cars<span style={{ color: "#6366f1" }}>Track</span>
              </span>
              <span className="text-muted-foreground text-xs ml-2">
                © {new Date().getFullYear()} Tüm hakları saklıdır.
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Gizlilik Politikası
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Giriş Yap
              </Link>
              <Link href="/register" className="hover:text-foreground transition-colors">
                Kayıt Ol
              </Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
