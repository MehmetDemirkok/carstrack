import {
  Wrench, Shield, FileText, BarChart3, Users, Bell, CheckCircle2,
} from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  softwareJsonLd,
} from "@/lib/seo";
import {
  MarketingPage,
  PageHero,
  PrimaryAction,
  SecondaryAction,
  MarketingCta,
} from "@/components/marketing/marketing-page";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Reveal, RevealGroup } from "@/components/marketing/motion-primitives";
import { ProductPreview } from "@/components/marketing/product-preview";

export const metadata = buildPageMetadata({
  title: "Özellikler — Bakım Takibi ve Sigorta Hatırlatıcı",
  description:
    "CarsTrack özellikleri: periyodik bakım takibi, sigorta ve muayene hatırlatıcı, servis geçmişi, filo analitiği, sürücü yönetimi ve akıllı bildirimler.",
  path: "/ozellikler",
  keywords: [
    "araç bakım takip özellikleri",
    "filo analitiği yazılımı",
    "sigorta muayene hatırlatıcı",
    "sürücü yönetimi uygulaması",
    "periyodik bakım yazılımı",
  ],
});

const features = [
  {
    icon: Wrench,
    title: "Periyodik bakım takibi",
    desc: "Yağ, fren, filtre ve daha fazlası için km ve zaman aralığı tanımlayın. Yaklaşan bakımları otomatik görün.",
  },
  {
    icon: Shield,
    title: "Sigorta & muayene hatırlatıcı",
    desc: "Trafik sigortası, kasko, yeşil kart ve TÜVTÜRK muayene tarihlerini takip edin; süre dolmadan uyarı alın.",
  },
  {
    icon: FileText,
    title: "Servis geçmişi arşivi",
    desc: "Tüm servis ve onarım kayıtlarını tek yerde tutun. PDF ve Excel ile dışa aktarın.",
  },
  {
    icon: BarChart3,
    title: "Filo analitiği",
    desc: "Sağlık skoru, harcama trendi, araç bazlı maliyet ve belge yenileme takvimi ile filonuzu yönetin.",
  },
  {
    icon: Users,
    title: "Ekip & sürücü yönetimi",
    desc: "Yönetici ve sürücü rolleri, araç atama, görev ve arıza bildirimleri ile ekibi koordine edin.",
  },
  {
    icon: Bell,
    title: "Akıllı bildirimler",
    desc: "Kritik belge ve bakım uyarılarını uygulama ve e-posta ile zamanında alın.",
  },
];

const reasons = [
  "Ücretsiz başlangıç — kredi kartı gerekmez",
  "Türkçe arayüz, Türkiye mevzuatına uygun belge takibi",
  "PWA ile mobil kullanım",
  "PDF / Excel raporlama",
  "Çok araçlı filo desteği",
  "Rol bazlı ekip erişimi",
];

export default function OzelliklerPage() {
  return (
    <MarketingPage>
      <JsonLd data={softwareJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "Özellikler", path: "/ozellikler" },
        ])}
      />

      <PageHero
        eyebrow="Ürün · Özellikler"
        title="Filo yönetimini kolaylaştıran araç bakım takip özellikleri"
        description="CarsTrack; bakım planı, belge takibi, maliyet görünürlüğü ve ekip koordinasyonunu tek Türkçe platformda birleştirir. Küçük filolardan kurumsal ekiplere kadar ölçeklenir."
        actions={
          <>
            <PrimaryAction href="/register">Ücretsiz dene</PrimaryAction>
            <SecondaryAction href="/sss">SSS</SecondaryAction>
          </>
        }
      />

      <Section>
        <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="space-y-3 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-outfit text-lg font-bold tracking-tight">{title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </article>
          ))}
        </RevealGroup>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Panel"
          title="Hepsi tek ekranda"
          description="Araç listesi, filo sağlık skoru, aktif uyarılar ve masraf dağılımı — açtığınız anda gördüğünüz ekran."
        />
        <div className="mx-auto mt-14 max-w-5xl">
          <ProductPreview />
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-outfit text-section font-black text-balance">
              Neden CarsTrack?
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Excel tablosu hatırlatmaz, rol bazlı erişim sunmaz ve mobil bildirim
              göndermez. CarsTrack bunların hepsini ücretsiz yapar.
            </p>
          </Reveal>
          <Reveal>
            <ul className="space-y-3">
              {reasons.map((r) => (
                <li key={r} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint-strong" />
                  <span className="text-sm leading-relaxed text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      <Section tight>
        <MarketingCta />
      </Section>
    </MarketingPage>
  );
}
