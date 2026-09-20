import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  faqJsonLd,
  softwareJsonLd,
  type FaqItem,
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

export const metadata = buildPageMetadata({
  title: "Araç Bakım Takip Programı — Periyodik Bakım ve Muayene Rehberi",
  description:
    "Periyodik bakım kilometre tablosu, TÜVTÜRK muayene periyotları, sigorta yenileme takvimi ve araç bakım takip programı ile filonuzu yönetme rehberi. Ücretsiz başlayın.",
  path: "/arac-bakim-takip",
  keywords: [
    "araç bakım takip",
    "araç bakım takip programı",
    "periyodik bakım kilometre tablosu",
    "araç muayene ne zaman yapılır",
    "muayene takip programı",
    "filo yönetim sistemi",
    "araç sigorta takip",
    "araç servis takip yazılımı",
    "bakım periyotları",
  ],
});

/* ─────────────────────────── içindekiler ─────────────────────────── */

const TOC = [
  { id: "nedir", label: "Araç bakım takibi nedir?" },
  { id: "bakim-tablosu", label: "Periyodik bakım kilometre tablosu" },
  { id: "muayene", label: "Muayene ve sigorta takvimi" },
  { id: "neler-takip", label: "Neler takip edilmeli?" },
  { id: "excel", label: "Excel mi, sistem mi?" },
  { id: "nasil", label: "CarsTrack ile nasıl işler?" },
  { id: "kimler", label: "Kimler için uygun?" },
  { id: "sss", label: "Sık sorulan sorular" },
];

/* ──────────────────────── periyodik bakım verisi ──────────────────────── */

type MaintenanceRow = {
  item: string;
  km: string;
  time: string;
  note: string;
};

const MAINTENANCE_ROWS: MaintenanceRow[] = [
  {
    item: "Motor yağı + yağ filtresi",
    km: "10.000 – 15.000 km",
    time: "1 yıl",
    note: "Long-life yağ kullanan araçlarda 20.000 km’ye çıkabilir. Şehir içi kısa mesafede alt sınırı esas alın.",
  },
  {
    item: "Polen (kabin) filtresi",
    km: "15.000 – 20.000 km",
    time: "1 yıl",
    note: "Tozlu güzergâhta daha erken. Klimadan gelen kokunun en sık sebebi budur.",
  },
  {
    item: "Hava filtresi",
    km: "20.000 – 30.000 km",
    time: "2 yıl",
    note: "Şantiye, toprak yol ve tarım kullanımında yarıya düşürün.",
  },
  {
    item: "Yakıt filtresi (dizel)",
    km: "30.000 – 40.000 km",
    time: "2 yıl",
    note: "Benzinli araçların çoğunda depo içindedir, ayrı değişim gerektirmez.",
  },
  {
    item: "Buji",
    km: "30.000 – 100.000 km",
    time: "—",
    note: "Bakır 30.000, platin 60.000, iridyum 100.000 km civarı. Yalnızca benzinli araçlarda.",
  },
  {
    item: "Fren balatası (ön)",
    km: "30.000 – 50.000 km",
    time: "—",
    note: "Tamamen sürüş tarzına bağlıdır. Arka balatalar genelde iki kat daha uzun ömürlüdür.",
  },
  {
    item: "Fren hidroliği",
    km: "40.000 km",
    time: "2 yıl",
    note: "Kilometre değil, süre esastır — nem çektiği için kullanılmayan araçta da bozulur.",
  },
  {
    item: "Fren diski",
    km: "60.000 – 80.000 km",
    time: "—",
    note: "Genelde iki balata setinde bir değişir. Titreme başlarsa kilometreyi beklemeyin.",
  },
  {
    item: "Antifriz / soğutma sıvısı",
    km: "60.000 km",
    time: "2 – 5 yıl",
    note: "Üretici tipine göre çok değişir; renk değişimi ve tortu erken değişim işaretidir.",
  },
  {
    item: "Otomatik şanzıman yağı",
    km: "60.000 – 80.000 km",
    time: "4 yıl",
    note: "“Ömürlük” denen şanzımanlarda bile ağır kullanımda değişim ömrü uzatır.",
  },
  {
    item: "Triger kayışı / zinciri",
    km: "60.000 – 120.000 km",
    time: "5 yıl",
    note: "Kaçırılması motoru komple yazdırabilecek tek kalem. Devirdaim ile birlikte değiştirilir.",
  },
  {
    item: "Debriyaj seti",
    km: "80.000 – 150.000 km",
    time: "—",
    note: "Şehir içi dur-kalk ve ağır yük ömrü ciddi kısaltır.",
  },
  {
    item: "Akü",
    km: "—",
    time: "3 – 5 yıl",
    note: "Kışa girerken ölçtürün. Kısa mesafe kullanım ömrü kısaltır.",
  },
  {
    item: "Lastik",
    km: "40.000 – 60.000 km",
    time: "5 – 6 yıl",
    note: "Diş derinliği yasal sınırı 1,6 mm. Kilometre dolmasa da üretim tarihinden 6 yıl sonra sertleşir.",
  },
  {
    item: "Silecek lastiği",
    km: "—",
    time: "1 yıl",
    note: "İz bırakmaya başladığında değiştirin; cam çizilmesi çok daha pahalıya gelir.",
  },
];

/* ──────────────────────────── muayene verisi ──────────────────────────── */

type InspectionRow = { type: string; first: string; period: string };

const INSPECTION_ROWS: InspectionRow[] = [
  {
    type: "Otomobil (hususi)",
    first: "İlk 3 yıl sonunda",
    period: "Sonrasında 2 yılda bir",
  },
  {
    type: "Ticari araç, taksi, minibüs",
    first: "İlk 1 yıl sonunda",
    period: "Sonrasında yılda bir",
  },
  {
    type: "Otobüs",
    first: "İlk 1 yıl sonunda",
    period: "Sonrasında yılda bir",
  },
  {
    type: "Kamyon, çekici (3,5 tonun üzeri)",
    first: "İlk 2 yıl sonunda",
    period: "Sonrasında yılda bir",
  },
  {
    type: "Motosiklet, motorlu bisiklet",
    first: "İlk 3 yıl sonunda",
    period: "Sonrasında 2 yılda bir",
  },
  {
    type: "Lastik tekerlekli traktör",
    first: "İlk 3 yıl sonunda",
    period: "Sonrasında 3 yılda bir",
  },
];

/* ──────────────────────── takip kalemleri ──────────────────────── */

const TRACK_GROUPS = [
  {
    title: "Yasal belgeler",
    items: [
      "Zorunlu trafik sigortası (ZMSS) bitiş tarihi",
      "Kasko poliçesi bitiş tarihi",
      "TÜVTÜRK muayene geçerlilik tarihi",
      "Egzoz emisyon ölçümü",
      "Yeşil kart (yurt dışı çıkışlarda)",
      "Araç ruhsat ve plaka bilgileri",
    ],
  },
  {
    title: "Mekanik bakım",
    items: [
      "Son bakım kilometresi ve tarihi",
      "Bir sonraki bakıma kalan kilometre",
      "Yapılan işlem kalemleri ve maliyeti",
      "Servis adı, fatura ve garanti bilgisi",
      "Değişen parçaların ömür takibi",
      "Arıza bildirimleri ve çözüm durumu",
    ],
  },
  {
    title: "Operasyon ve maliyet",
    items: [
      "Güncel kilometre bilgisi",
      "Yakıt alımları ve tüketim ortalaması",
      "Trafik cezaları ve ödeme durumu",
      "Sürücü ataması ve görev geçmişi",
      "Lastik ve akü değişim tarihleri",
      "Araç başına toplam sahip olma maliyeti",
    ],
  },
];

/* ──────────────────────── excel karşılaştırma ──────────────────────── */

type CompareRow = { subject: string; excel: string; system: string };

const COMPARE_ROWS: CompareRow[] = [
  {
    subject: "Yaklaşan bakım uyarısı",
    excel: "Yok — tabloyu açıp bakmanız gerekir",
    system: "Otomatik hesaplanır, süresi dolmadan bildirim gider",
  },
  {
    subject: "Belge süresi takibi",
    excel: "Elle girilen tarih, hatırlatma yok",
    system: "Sigorta ve muayene için e-posta + uygulama bildirimi",
  },
  {
    subject: "Ekip erişimi",
    excel: "Dosya paylaşımı, sürüm karmaşası",
    system: "Rol bazlı erişim; yönetici, operatör ve sürücü ayrı yetkilerde",
  },
  {
    subject: "Mobil kullanım",
    excel: "Telefonda düzenlemesi zor",
    system: "PWA olarak ana ekrana eklenir, uygulama gibi çalışır",
  },
  {
    subject: "Geçmiş kayıt",
    excel: "Satır silindiğinde geri dönüş yok",
    system: "Servis geçmişi araç bazında saklanır, rapora dönüştürülür",
  },
  {
    subject: "Raporlama",
    excel: "Formül kurmanız gerekir",
    system: "PDF ve Excel dışa aktarım hazır gelir",
  },
];

/* ──────────────────────── sayfaya özel SSS ──────────────────────── */

const PAGE_FAQS: FaqItem[] = [
  {
    q: "Araç bakımı kaç kilometrede bir yapılır?",
    a: "Çoğu binek araçta motor yağı ve yağ filtresi 10.000–15.000 kilometrede bir veya yılda bir değişir; hangisi önce dolarsa o esas alınır. Long-life yağ kullanan araçlarda bu aralık 20.000 kilometreye çıkabilir. Şehir içi kısa mesafe kullanımda motor tam ısınmadığı için alt sınırı tercih etmek daha doğrudur. Kesin değer aracınızın kullanım kılavuzunda yazar.",
  },
  {
    q: "Araç muayenesi ne zaman yapılır?",
    a: "Hususi otomobiller ilk muayenesini trafiğe çıkışından 3 yıl sonra yaptırır, sonrasında 2 yılda bir tekrarlanır. Ticari araçlar, taksiler, minibüsler ve otobüsler ilk yılın sonunda başlayıp her yıl muayeneye girer. Motosikletlerde periyot 3 yıl sonra 2 yılda bir, lastik tekerlekli traktörlerde 3 yıl sonra 3 yılda birdir.",
  },
  {
    q: "Muayene tarihi geçerse ne olur?",
    a: "Muayenesi geçmiş araçla trafiğe çıkmak idari para cezası gerektirir ve gecikilen her ay için muayene ücretine gecikme zammı işler. Ayrıca kaza durumunda sigorta şirketi eksik belgeyi gerekçe göstererek ödemede kesintiye gidebilir. Bu yüzden muayene tarihini, bitiminden en az bir ay önce hatırlatan bir sisteme bağlamak mantıklıdır.",
  },
  {
    q: "Periyodik bakım kaydını neden tutmak gerekir?",
    a: "Üç sebeple: garanti kapsamındaki bir araçta bakımların zamanında yapıldığını belgeleyemezseniz garanti talebiniz reddedilebilir; ikinci el satışta düzenli servis geçmişi aracın değerini gözle görülür şekilde artırır; ve filo yönetiminde araç başına maliyeti ancak geçmiş kayıtlar üzerinden görebilirsiniz.",
  },
  {
    q: "Bakım takibi için ayrı bir programa gerek var mı?",
    a: "Tek aracı olan biri için takvim hatırlatması yeterli olabilir. Ancak araç sayısı üçü geçtiğinde, her araç için farklı kilometre, farklı bakım aralığı ve farklı belge tarihi takip etmek gerekir — bu noktada elle tutulan tablo kaçınılmaz olarak eskir. Bakım takip programı bu hesabı sizin yerinize yapar ve süresi dolmadan uyarır.",
  },
  {
    q: "CarsTrack’te bakım aralıklarını kendim belirleyebilir miyim?",
    a: "Evet. Her araç için kilometre ve zaman bazlı aralıkları ayrı ayrı tanımlayabilirsiniz. Aracın son bakım kilometresini ve tarihini girdiğinizde sistem bir sonraki bakımı hesaplar, yaklaşan ve geciken kalemleri filo sağlık skoruna yansıtır.",
  },
  {
    q: "CarsTrack ücretsiz mi?",
    a: "Evet, temel özellikleriyle ücretsiz kullanılabilir ve kayıt için kredi kartı gerekmez. Araç ve kullanıcı sayısında sınır yoktur.",
  },
];

/* ──────────────────────────── yardımcı bileşen ──────────────────────────── */

/** Rehber tabloları için ortak kap — mobilde yatay kaydırılır. */
function DataTable({
  headers,
  children,
  caption,
}: {
  headers: string[];
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border/60 bg-surface-1/60">
              {headers.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3.5 font-outfit text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function AracBakimTakipPage() {
  return (
    <MarketingPage>
      <JsonLd data={softwareJsonLd()} />
      <JsonLd data={faqJsonLd(PAGE_FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "Araç Bakım Takip", path: "/arac-bakim-takip" },
        ])}
      />

      <PageHero
        eyebrow="Rehber · Araç bakım takip"
        title="Araç bakım takip programı ve periyodik bakım rehberi"
        description="Hangi bakım kaç kilometrede yapılır, muayene ne zaman gelir, hangi belgenin süresi ne zaman dolar? Aşağıda bunların tablosunu, takip edilmesi gereken kalemlerin listesini ve bütün bunları tek panelden yönetmenin yolunu bulacaksınız."
        actions={
          <>
            <PrimaryAction href="/register">Ücretsiz kayıt ol</PrimaryAction>
            <SecondaryAction href="/ozellikler">Özellikleri incele</SecondaryAction>
          </>
        }
      />

      {/* ── İçindekiler ── */}
      <Section tight>
        <Reveal className="mx-auto max-w-3xl">
          <nav aria-label="Sayfa içeriği" className="rounded-2xl border border-border/60 bg-card/40 p-6">
            <h2 className="font-outfit text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              İçindekiler
            </h2>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {TOC.map((t, i) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="inline-flex items-baseline gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span className="font-mono text-xs text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Reveal>
      </Section>

      {/* ── 1. Nedir ── */}
      <Section id="nedir" tight>
        <article className="mx-auto max-w-3xl space-y-5">
          <Reveal>
            <h2 className="font-outfit text-section font-black text-balance">
              Araç bakım takibi nedir?
            </h2>
          </Reveal>
          <Reveal className="space-y-5 leading-relaxed text-muted-foreground">
            <p className="text-pretty">
              Araç bakım takibi; yağ değişimi, fren, filtre, lastik ve triger
              gibi periyodik işlemlerin kilometre veya zamana göre planlanması,
              zamanı geldiğinde hatırlatılması ve yapıldığında kayıt altına
              alınmasıdır. Buna sigorta, muayene ve emisyon gibi yasal belgelerin
              geçerlilik süresi de dahildir — çünkü pratikte bir aracı yolda
              bırakan şey çoğu zaman mekanik bir arıza değil, süresi dolmuş bir
              belgedir.
            </p>
            <p className="text-pretty">
              Tek araçta bu iş akılda tutulabilir. Araç sayısı üçü geçtiğinde ise
              her araç için ayrı kilometre, ayrı bakım aralığı ve ayrı belge
              tarihi takip etmek gerekir. Elle tutulan bir tablo bu noktada
              kaçınılmaz olarak eskir: kimse tabloyu her gün açıp “bu hafta
              hangi aracın bakımı geldi” diye kontrol etmez. Bakım takip
              programının çözdüğü asıl problem budur — hesabı sizin yerinize
              yapar ve süre dolmadan önce uyarır.
            </p>
            <p className="text-pretty">
              Aşağıdaki tablolar hem bu aralıkların ne olduğunu gösteriyor hem de
              kendi takip sisteminizi kurarken referans olarak kullanabileceğiniz
              bir başlangıç noktası sunuyor.
            </p>
          </Reveal>
        </article>
      </Section>

      {/* ── 2. Bakım tablosu ── */}
      <Section id="bakim-tablosu" tone="muted">
        <SectionHeading
          eyebrow="Referans tablo"
          title="Periyodik bakım kilometre tablosu"
          description="Aşağıdaki aralıklar binek araçlar için yaygın değerlerdir. Kilometre ve süreden hangisi önce dolarsa o esas alınır."
        />

        <Reveal className="mt-12">
          <DataTable
            headers={["Bakım kalemi", "Kilometre", "Süre", "Not"]}
            caption="Periyodik bakım kalemlerinin kilometre ve süre aralıkları"
          >
            {MAINTENANCE_ROWS.map((r) => (
              <tr
                key={r.item}
                className="border-b border-border/40 last:border-0 transition-colors hover:bg-surface-1/40"
              >
                <th scope="row" className="px-4 py-4 align-top font-semibold text-foreground">
                  {r.item}
                </th>
                <td className="px-4 py-4 align-top whitespace-nowrap font-mono text-xs text-primary">
                  {r.km}
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {r.time}
                </td>
                <td className="px-4 py-4 align-top leading-relaxed text-muted-foreground">
                  {r.note}
                </td>
              </tr>
            ))}
          </DataTable>
        </Reveal>

        <Reveal className="mx-auto mt-8 max-w-3xl">
          <p className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">Önemli:</strong>{" "}
            Bu değerler genel bir referanstır, üreticinin belirlediği aralığın
            yerine geçmez. Aracınızın kullanım kılavuzundaki periyot her zaman
            önceliklidir — özellikle triger ve şanzıman gibi kalemlerde markalar
            arasındaki fark çok büyüktür. Garanti kapsamındaki araçlarda üretici
            aralığının dışına çıkmak garanti kaybına yol açabilir.
          </p>
        </Reveal>
      </Section>

      {/* ── 3. Muayene ── */}
      <Section id="muayene">
        <SectionHeading
          eyebrow="Yasal takvim"
          title="Muayene ve sigorta takvimi"
          description="Türkiye’de araç muayenesi TÜVTÜRK istasyonlarında yapılır ve periyot araç sınıfına göre değişir."
        />

        <Reveal className="mt-12">
          <DataTable
            headers={["Araç sınıfı", "İlk muayene", "Tekrar periyodu"]}
            caption="Araç sınıflarına göre muayene periyotları"
          >
            {INSPECTION_ROWS.map((r) => (
              <tr
                key={r.type}
                className="border-b border-border/40 last:border-0 transition-colors hover:bg-surface-1/40"
              >
                <th scope="row" className="px-4 py-4 align-top font-semibold text-foreground">
                  {r.type}
                </th>
                <td className="px-4 py-4 align-top text-muted-foreground">{r.first}</td>
                <td className="px-4 py-4 align-top text-muted-foreground">{r.period}</td>
              </tr>
            ))}
          </DataTable>
        </Reveal>

        <article className="mx-auto mt-10 max-w-3xl space-y-5 leading-relaxed text-muted-foreground">
          <Reveal className="space-y-5">
            <p className="text-pretty">
              Muayene randevusuna giderken zorunlu trafik sigortasının geçerli
              olması gerekir; sigortası biten araç muayeneye alınmaz. Bu iki
              tarihi ayrı ayrı takip etmek yerine birbirine bağlı düşünmek işi
              kolaylaştırır — sigortayı yenilerken muayene tarihine de bakın.
            </p>
            <p className="text-pretty">
              Muayenesi geçmiş araçla trafiğe çıkmak idari para cezası
              gerektirir ve gecikilen her ay için muayene ücretine gecikme zammı
              işler. Daha maliyetlisi ise bir kaza durumunda sigorta şirketinin
              eksik belgeyi gerekçe göstererek ödemede kesintiye gitmesidir. Bu
              yüzden hatırlatmayı son güne değil, en az bir ay öncesine kurmak
              gerekir.
            </p>
            <p className="text-pretty">
              Zorunlu trafik sigortası ve kasko poliçeleri yıllıktır. Kasko
              isteğe bağlı olduğu için çoğu zaman gözden kaçan da odur; poliçe
              bittiğinde kimse sizi aramaz.
            </p>
          </Reveal>
        </article>
      </Section>

      {/* ── 4. Neler takip edilmeli ── */}
      <Section id="neler-takip" tone="muted">
        <SectionHeading
          eyebrow="Kontrol listesi"
          title="Bir araç için neler takip edilmeli?"
          description="Kendi sisteminizi kurarken de, hazır bir program kullanırken de bu üç başlığın tamamı kapsanmalıdır."
        />

        <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
          {TRACK_GROUPS.map((g) => (
            <div
              key={g.title}
              className="rounded-2xl border border-border/60 bg-card/40 p-6"
            >
              <h3 className="font-outfit text-lg font-bold">{g.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {g.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </RevealGroup>
      </Section>

      {/* ── 5. Excel karşılaştırma ── */}
      <Section id="excel">
        <SectionHeading
          eyebrow="Karşılaştırma"
          title="Excel tablosu mu, bakım takip programı mı?"
          description="Excel kayıt tutar ama hatırlatmaz. Aradaki fark pratikte şuraya düşer:"
        />

        <Reveal className="mt-12">
          <DataTable
            headers={["Konu", "Excel tablosu", "Bakım takip programı"]}
            caption="Excel ile bakım takip programının karşılaştırması"
          >
            {COMPARE_ROWS.map((r) => (
              <tr
                key={r.subject}
                className="border-b border-border/40 last:border-0 transition-colors hover:bg-surface-1/40"
              >
                <th scope="row" className="px-4 py-4 align-top font-semibold text-foreground">
                  {r.subject}
                </th>
                <td className="px-4 py-4 align-top leading-relaxed text-muted-foreground">
                  {r.excel}
                </td>
                <td className="px-4 py-4 align-top leading-relaxed text-foreground">
                  {r.system}
                </td>
              </tr>
            ))}
          </DataTable>
        </Reveal>

        <Reveal className="mx-auto mt-8 max-w-3xl">
          <p className="leading-relaxed text-muted-foreground text-pretty">
            Excel’in tek gerçek avantajı esnekliğidir: istediğiniz sütunu
            eklersiniz. Buna karşılık hiçbir şeyi kendiliğinden hatırlatmaz ve
            ekip büyüdükçe hangi dosyanın güncel olduğu tartışma konusu olur.
            Tek araçlı bir kullanıcı için tablo yeterlidir; araç sayısı arttıkça
            işin ağırlığı hatırlatma tarafına kayar.
          </p>
        </Reveal>
      </Section>

      {/* ── 6. Nasıl işler ── */}
      <Section id="nasil" tone="muted">
        <SectionHeading
          eyebrow="Uygulamada"
          title="CarsTrack ile nasıl işler?"
          description="Kurulum yok, kredi kartı yok. Dört adımda takip başlar."
        />

        <RevealGroup className="mx-auto mt-12 max-w-3xl space-y-6">
          {[
            {
              t: "Ücretsiz hesap oluşturun",
              d: "E-posta ile kayıt olun, şirketinizi tanımlayın. Kurulum veya sunucu gerekmez; tarayıcıdan çalışır.",
            },
            {
              t: "Araçlarınızı ekleyin",
              d: "Plaka, marka-model ve güncel kilometre yeterlidir. Ruhsat görselinden bilgileri otomatik okutabilirsiniz.",
            },
            {
              t: "Tarihleri ve aralıkları girin",
              d: "Sigorta, muayene ve son bakım tarihleri ile araca özel bakım aralıklarını tanımlayın.",
            },
            {
              t: "Takibi sisteme bırakın",
              d: "CarsTrack bir sonraki bakımı hesaplar, yaklaşan belge sürelerini izler ve e-posta ile uygulama bildirimi gönderir. Filo sağlık skoru hangi aracın geride kaldığını tek bakışta gösterir.",
            },
          ].map((step, i) => (
            <div key={step.t} className="flex items-start gap-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-outfit text-sm font-black text-primary">
                {i + 1}
              </span>
              <div className="space-y-1.5">
                <h3 className="font-outfit text-lg font-bold">{step.t}</h3>
                <p className="leading-relaxed text-muted-foreground text-pretty">
                  {step.d}
                </p>
              </div>
            </div>
          ))}
        </RevealGroup>
      </Section>

      {/* ── 7. Kimler için ── */}
      <Section id="kimler">
        <article className="mx-auto max-w-3xl space-y-5">
          <Reveal>
            <h2 className="font-outfit text-section font-black text-balance">
              Kimler için uygun?
            </h2>
          </Reveal>
          <Reveal className="space-y-5 leading-relaxed text-muted-foreground">
            <p className="text-pretty">
              <strong className="font-semibold text-foreground">
                Bireysel araç sahipleri:
              </strong>{" "}
              Tek aracın bakım geçmişini düzenli tutmak, ikinci el satışta
              aracın değerini korumanın en ucuz yoludur. Servis faturalarını ve
              değişen parçaları kayıt altında tutan bir alıcıya güven vermek çok
              daha kolaydır.
            </p>
            <p className="text-pretty">
              <strong className="font-semibold text-foreground">
                Araç kiralama ve lojistik filoları:
              </strong>{" "}
              Onlarca aracın kilometresi farklı hızda artar. Hangi aracın ne
              zaman servise gireceğini elle hesaplamak mümkün değildir; sağlık
              skoru ve gecikme listesi bu işi görünür kılar.
            </p>
            <p className="text-pretty">
              <strong className="font-semibold text-foreground">
                Saha ekibi olan şirketler:
              </strong>{" "}
              Satış, servis veya montaj ekiplerine zimmetli araçlarda sürücü
              ataması, görev geçmişi ve arıza bildirimi takibi gerekir. Sürücü
              kendi telefonundan kilometre girip arıza bildirebilir, yönetici
              tek panelden görür.
            </p>
            <p className="text-pretty">
              <strong className="font-semibold text-foreground">
                Birden fazla aracı olan KOBİ’ler:
              </strong>{" "}
              Beş-on araçlık bir filoda yıllık bakım ve belge maliyetinin nereye
              gittiğini görmek, bütçe planlamasının başlangıç noktasıdır.
            </p>
          </Reveal>
        </article>
      </Section>

      {/* ── 8. SSS ── */}
      <Section id="sss" tone="muted">
        <SectionHeading
          eyebrow="SSS"
          title="Sık sorulan sorular"
          description={
            <>
              Ürünle ilgili daha fazla soru için{" "}
              <Link href="/sss" className="text-primary underline-offset-4 hover:underline">
                SSS sayfasına
              </Link>{" "}
              göz atabilirsiniz.
            </>
          }
        />

        <RevealGroup className="mx-auto mt-12 max-w-3xl space-y-4">
          {PAGE_FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-border/60 bg-card/40 px-6 py-5 transition-colors hover:border-border"
            >
              <summary className="cursor-pointer list-none font-outfit font-bold marker:content-none">
                <span className="flex items-start justify-between gap-4">
                  {faq.q}
                  <span
                    aria-hidden
                    className="mt-1 shrink-0 text-primary transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">
                {faq.a}
              </p>
            </details>
          ))}
        </RevealGroup>
      </Section>

      <Section tight>
        <MarketingCta
          title="Bakım takibini sisteme bırakın"
          description="Araçlarınızı ekleyin, tarihleri girin, gerisini CarsTrack hatırlatsın. Ücretsiz, kredi kartı gerekmez."
        />
      </Section>
    </MarketingPage>
  );
}
