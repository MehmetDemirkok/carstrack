import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  faqJsonLd,
  LANDING_FAQS,
  softwareJsonLd,
} from "@/lib/seo";
import {
  MarketingPage,
  PageHero,
  PrimaryAction,
  SecondaryAction,
  MarketingCta,
} from "@/components/marketing/marketing-page";
import { Section } from "@/components/marketing/section";
import { Reveal, RevealGroup } from "@/components/marketing/motion-primitives";

export const metadata = buildPageMetadata({
  title: "Araç Bakım Takip Programı — Ücretsiz Filo Yönetimi",
  description:
    "Araç bakım takip programı ile periyodik bakımları, sigorta ve muayene tarihlerini, servis masraflarını ve filo sağlık skorunu tek yerden yönetin. Ücretsiz başlayın.",
  path: "/arac-bakim-takip",
  keywords: [
    "araç bakım takip",
    "araç bakım takip programı",
    "araç bakım takip uygulaması",
    "filo yönetim sistemi",
    "periyodik bakım takip",
    "araç sigorta takip",
    "muayene takip programı",
    "araç servis takip yazılımı",
  ],
});

const sections = [
  {
    h: "Araç bakım takibi nedir?",
    p: "Araç bakım takibi; yağ değişimi, fren, filtre, lastik ve diğer periyodik işlemlerin kilometre veya zamana göre planlanması, hatırlatılması ve kayıt altına alınmasıdır. Excel tabloları yerine dijital bir sistem kullanmak, kaçırılan bakımları ve belge sürelerini azaltır.",
  },
  {
    h: "CarsTrack ile neler takip edilir?",
    p: "Bakım kalemleri, servis geçmişi, trafik sigortası, kasko, yeşil kart, TÜVTÜRK muayene, lastik ve akü bilgileri, araç masrafları ve filo sağlık skoru. Şirketler için sürücü atama, görev ve arıza bildirimleri de dahildir.",
  },
  {
    h: "Kimler için uygundur?",
    p: "Tek araçlı bireysel kullanıcılar, kiralık araç filoları, lojistik ekipleri, saha satış ekipleri ve birden fazla aracı olan KOBİ’ler. Türkçe arayüz ve ücretsiz başlangıç sayesinde kurulum dakikalar sürer.",
  },
  {
    h: "Neden Excel yerine filo yönetim sistemi?",
    p: "Excel hatırlatmaz, rol bazlı erişim sunmaz ve mobil bildirim göndermez. CarsTrack yaklaşan bakımları hesaplar, belge sürelerini izler ve ekibinizi aynı panelde tutar.",
  },
];

const startSteps = [
  "Ücretsiz hesap oluşturun.",
  "Araçlarınızı plaka ve km bilgisiyle ekleyin.",
  "Bakım aralıkları ile sigorta/muayene tarihlerini girin.",
  "CarsTrack hatırlatmaları ve sağlık skorunu otomatik üretsin.",
];

export default function AracBakimTakipPage() {
  return (
    <MarketingPage>
      <JsonLd data={softwareJsonLd()} />
      <JsonLd data={faqJsonLd(LANDING_FAQS.slice(0, 5))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "Araç Bakım Takip", path: "/arac-bakim-takip" },
        ])}
      />

      <PageHero
        eyebrow="Rehber · Araç bakım takip"
        title="Araç bakım takip programı ile filonuzu kontrol altında tutun"
        description="CarsTrack; Türkiye’de araç bakım takibi, sigorta/muayene hatırlatıcı ve filo yönetimi ihtiyaçlarını tek ücretsiz platformda toplar. Aşağıda sistemin nasıl çalıştığını ve kimler için uygun olduğunu özetledik."
        actions={
          <>
            <PrimaryAction href="/register">Ücretsiz kayıt ol</PrimaryAction>
            <SecondaryAction href="/ozellikler">Özellikler</SecondaryAction>
          </>
        }
      />

      <Section>
        <article className="mx-auto max-w-3xl space-y-12">
          {sections.map((s) => (
            <Reveal key={s.h} className="space-y-3">
              <h2 className="font-outfit text-2xl font-black tracking-tight text-balance">
                {s.h}
              </h2>
              <p className="leading-relaxed text-muted-foreground text-pretty">{s.p}</p>
            </Reveal>
          ))}
        </article>
      </Section>

      <Section tone="muted">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="font-outfit text-section font-black text-balance">
              Hemen başlamak için
            </h2>
          </Reveal>
          <RevealGroup className="mt-8 space-y-4">
            {startSteps.map((step, i) => (
              <div key={step} className="flex items-start gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <p className="pt-1 leading-relaxed text-muted-foreground">{step}</p>
              </div>
            ))}
          </RevealGroup>
        </div>
      </Section>

      <Section tight>
        <MarketingCta />
      </Section>
    </MarketingPage>
  );
}
