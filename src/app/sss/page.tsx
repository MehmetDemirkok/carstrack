import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  faqJsonLd,
  LANDING_FAQS,
} from "@/lib/seo";
import {
  MarketingPage,
  PageHero,
  PrimaryAction,
  SecondaryAction,
  MarketingCta,
} from "@/components/marketing/marketing-page";
import { Section } from "@/components/marketing/section";
import { RevealGroup } from "@/components/marketing/motion-primitives";

export const metadata = buildPageMetadata({
  title: "Sıkça Sorulan Sorular — Araç Bakım Takibi",
  description:
    "CarsTrack hakkında merak edilenler: ücretsiz kullanım, araç limiti, sigorta/muayene hatırlatıcı, mobil PWA, PDF dışa aktarma ve filo yönetimi SSS.",
  path: "/sss",
  keywords: [
    "carstrack sss",
    "araç bakım takip sorular",
    "filo yönetim sistemi ücretsiz mi",
    "araç bakım hatırlatıcı nasıl çalışır",
  ],
});

export default function SssPage() {
  return (
    <MarketingPage>
      <JsonLd data={faqJsonLd(LANDING_FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "SSS", path: "/sss" },
        ])}
      />

      <PageHero
        eyebrow="Yardım · SSS"
        title="Sıkça sorulan sorular"
        description="CarsTrack araç bakım takip ve filo yönetim sistemi hakkında en çok sorulan soruların yanıtları."
        actions={
          <>
            <PrimaryAction href="/register">Ücretsiz başla</PrimaryAction>
            <SecondaryAction href="/ozellikler">Özellikleri incele</SecondaryAction>
          </>
        }
      />

      <Section>
        {/* Yanıtlar bilerek açık duruyor: arama motoru ve ekran okuyucu için
            katlanan bir panelin arkasına saklamak yerine doğrudan okunur. */}
        <RevealGroup className="mx-auto max-w-3xl space-y-4">
          {LANDING_FAQS.map((faq) => (
            <article
              key={faq.q}
              className="rounded-2xl border border-border/60 bg-card p-6"
            >
              <h2 className="font-outfit text-lg font-bold tracking-tight">{faq.q}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
            </article>
          ))}
        </RevealGroup>
      </Section>

      <Section tight>
        <MarketingCta
          title="Sorunuzun yanıtı burada yoksa"
          description="Ücretsiz hesap oluşturup ürünü kendiniz deneyin; kurulum dakikalar sürer, kredi kartı gerekmez."
        />
      </Section>
    </MarketingPage>
  );
}
