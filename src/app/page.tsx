import LandingClient from "@/components/landing/landing-client";
import { JsonLd } from "@/components/seo/json-ld";
import {
  APP_URL,
  LANDING_FAQS,
  buildPageMetadata,
  faqJsonLd,
  softwareJsonLd,
  organizationJsonLd,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "CarsTrack — Araç Bakım Takip ve Filo Yönetim Sistemi",
  description:
    "Araçlarınızın bakım takvimi, sigorta ve muayene tarihleri, servis geçmişi ve filo sağlık analizi. Türkiye'nin ücretsiz araç bakım takip uygulaması ile periyodik bakımları asla kaçırmayın.",
  path: "/",
});

export default function LandingPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(LANDING_FAQS)} />
      <JsonLd data={softwareJsonLd()} />
      <JsonLd data={organizationJsonLd()} />
      <LandingClient />
      {/* Server-rendered SEO content — visible, crawlable without client JS */}
      <section className="border-t border-border/40 bg-background px-4 py-14">
        <div className="max-w-3xl mx-auto space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-outfit text-xl font-bold tracking-tight text-foreground">
            CarsTrack ile araç bakım takibi ve filo yönetimi
          </h2>
          <p>
            CarsTrack; araç bakım takip programı, sigorta ve muayene hatırlatıcı, servis
            geçmişi arşivi ve filo analitiğini tek Türkçe platformda birleştirir. Bireysel
            araç sahipleri ve şirket filoları için ücretsiz başlayabilirsiniz — kredi kartı
            gerekmez.
          </p>
          <p>
            Periyodik bakımları kilometre ve zamana göre planlayın, belge sürelerini kaçırmayın,
            masrafları raporlayın. Detaylı bilgi için{" "}
            <a href="/arac-bakim-takip" className="text-primary font-semibold underline-offset-2 hover:underline">
              araç bakım takip rehberi
            </a>
            ,{" "}
            <a href="/ozellikler" className="text-primary font-semibold underline-offset-2 hover:underline">
              özellikler
            </a>{" "}
            ve{" "}
            <a href="/sss" className="text-primary font-semibold underline-offset-2 hover:underline">
              SSS
            </a>{" "}
            sayfalarına göz atın. Hemen denemek için{" "}
            <a href={`${APP_URL}/register`} className="text-primary font-semibold underline-offset-2 hover:underline">
              ücretsiz kayıt olun
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
