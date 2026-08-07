import Link from "next/link";
import {
  Wrench, Shield, FileText, BarChart3, Users, Bell, CheckCircle2,
} from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  softwareJsonLd,
} from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Özellikler — Araç Bakım Takip, Sigorta Hatırlatıcı ve Filo Analitiği",
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

export default function OzelliklerPage() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <JsonLd data={softwareJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ana Sayfa", path: "/" },
          { name: "Özellikler", path: "/ozellikler" },
        ])}
      />

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        <header className="max-w-3xl space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            Ürün · Özellikler
          </p>
          <h1 className="font-outfit text-3xl sm:text-4xl font-bold tracking-tight">
            Filo yönetimini kolaylaştıran araç bakım takip özellikleri
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            CarsTrack; bakım planı, belge takibi, maliyet görünürlüğü ve ekip koordinasyonunu
            tek Türkçe platformda birleştirir. Küçük filolardan kurumsal ekiplere kadar
            ölçeklenir.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="rounded-[20px] bg-card p-6 ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-sm space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-outfit text-lg font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>

        <section className="rounded-[24px] bg-mesh-soft p-8 ring-1 ring-border/40 space-y-4">
          <h2 className="font-outfit text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Neden CarsTrack?
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li>• Ücretsiz başlangıç — kredi kartı gerekmez</li>
            <li>• Türkçe arayüz, Türkiye mevzuatına uygun belge takibi</li>
            <li>• PWA ile mobil kullanım</li>
            <li>• PDF / Excel raporlama</li>
            <li>• Çok araçlı filo desteği</li>
            <li>• Rol bazlı ekip erişimi</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ücretsiz dene
            </Link>
            <Link href="/sss" className="inline-flex items-center rounded-2xl bg-card px-5 py-2.5 text-sm font-semibold ring-1 ring-border/50">
              SSS
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
