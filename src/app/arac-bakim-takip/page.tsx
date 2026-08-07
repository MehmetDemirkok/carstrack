import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  faqJsonLd,
  LANDING_FAQS,
  softwareJsonLd,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Araç Bakım Takip Programı — Ücretsiz Filo Yönetim Sistemi | CarsTrack",
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

export default function AracBakimTakipPage() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <JsonLd data={softwareJsonLd()} />
      <JsonLd data={faqJsonLd(LANDING_FAQS.slice(0, 5))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "Araç Bakım Takip", path: "/arac-bakim-takip" },
        ])}
      />

      <article className="max-w-3xl mx-auto px-4 py-12 sm:py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            Rehber · Araç bakım takip
          </p>
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Araç bakım takip programı ile filonuzu kontrol altında tutun
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            CarsTrack; Türkiye’de araç bakım takibi, sigorta/muayene hatırlatıcı ve filo
            yönetimi ihtiyaçlarını tek ücretsiz platformda toplar. Aşağıda sistemin nasıl
            çalıştığını ve kimler için uygun olduğunu özetledik.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ücretsiz kayıt ol
            </Link>
            <Link
              href="/ozellikler"
              className="inline-flex items-center rounded-2xl bg-muted px-5 py-2.5 text-sm font-semibold"
            >
              Özellikler
            </Link>
          </div>
        </header>

        {sections.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="font-outfit text-xl font-semibold tracking-tight">{s.h}</h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{s.p}</p>
          </section>
        ))}

        <section className="rounded-[20px] bg-card p-6 ring-1 ring-border/40 space-y-3">
          <h2 className="font-outfit text-xl font-semibold">Hemen başlamak için</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Ücretsiz hesap oluşturun.</li>
            <li>Araçlarınızı plaka ve km bilgisiyle ekleyin.</li>
            <li>Bakım aralıkları ile sigorta/muayene tarihlerini girin.</li>
            <li>CarsTrack hatırlatmaları ve sağlık skorunu otomatik üretsin.</li>
          </ol>
          <Link href="/register" className="inline-flex text-sm font-semibold text-primary pt-2">
            CarsTrack’e ücretsiz başla →
          </Link>
        </section>
      </article>
    </main>
  );
}
