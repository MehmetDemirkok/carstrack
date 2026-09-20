import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";

const URUN = [
  { href: "/ozellikler", label: "Özellikler" },
  { href: "/arac-bakim-takip", label: "Araç Bakım Takip Rehberi" },
  { href: "/sss", label: "Sık Sorulan Sorular" },
];

const HESAP = [
  { href: "/register", label: "Ücretsiz Kayıt" },
  { href: "/login", label: "Giriş Yap" },
  { href: "/privacy", label: "Gizlilik" },
];

/** Giriş öncesi tüm sayfaların ortak alt bilgisi. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border/50 bg-surface-1/50">
      <div className="container-marketing py-section-tight">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <span className="font-outfit text-base font-extrabold tracking-tight">
                Cars<span className="text-gradient">Track</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Araç bakım takibi, sigorta ve muayene hatırlatmaları, servis geçmişi ve
              filo analitiği — tek Türkçe platformda.
            </p>
          </div>

          <nav className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Ürün
            </h3>
            <ul className="space-y-2">
              {URUN.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Hesap
            </h3>
            <ul className="space-y-2">
              {HESAP.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} CarsTrack. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
