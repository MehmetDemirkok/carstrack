import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  faqJsonLd,
  LANDING_FAQS,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Sıkça Sorulan Sorular (SSS) — CarsTrack Araç Bakım Takip",
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
    <main className="min-h-[100dvh] bg-background text-foreground">
      <JsonLd data={faqJsonLd(LANDING_FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "SSS", path: "/sss" },
        ])}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            Yardım · SSS
          </p>
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold tracking-tight">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            CarsTrack araç bakım takip ve filo yönetim sistemi hakkında en çok sorulan
            soruların yanıtları.
          </p>
        </header>

        <div className="space-y-4">
          {LANDING_FAQS.map((faq) => (
            <article
              key={faq.q}
              className="rounded-[20px] bg-card p-5 sm:p-6 ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm"
            >
              <h2 className="font-outfit text-lg font-semibold tracking-tight">{faq.q}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/register"
            className="inline-flex items-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Ücretsiz başla
          </Link>
          <Link
            href="/ozellikler"
            className="inline-flex items-center rounded-2xl bg-muted px-5 py-2.5 text-sm font-semibold"
          >
            Özellikleri incele
          </Link>
          <Link href="/" className="inline-flex items-center text-sm font-semibold text-primary px-2">
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
