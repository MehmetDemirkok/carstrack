import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingNav } from "./marketing-nav";
import { MarketingFooter } from "./marketing-footer";
import { Reveal } from "./motion-primitives";

/**
 * Giriş öncesi alt sayfaların ortak kabı.
 * Daha önce /ozellikler, /sss ve /arac-bakim-takip sayfalarının hiç nav'ı ve
 * footer'ı yoktu; aramadan gelen ziyaretçi ne siteye dönebiliyor ne de bir
 * eylem çağrısı görüyordu.
 */
export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-background text-foreground">
      <MarketingNav />
      <main id="icerik" className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

/** Alt sayfaların üst bloğu — landing hero'suyla aynı zemin diline sahip. */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="bg-hero relative overflow-hidden">
      <div
        aria-hidden
        className="bg-hero-grid pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden
        className="orb -top-40 left-1/3 h-96 w-96"
        style={{ background: "color-mix(in oklab, var(--brand-1) 14%, transparent)" }}
      />
      <div className="container-marketing relative py-section-tight">
        <div className="max-w-3xl space-y-5">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </span>
          <h1 className="font-outfit text-hero font-black text-balance">{title}</h1>
          {description && (
            <p className="text-lead text-muted-foreground text-pretty">{description}</p>
          )}
          {actions && <div className="flex flex-wrap gap-3 pt-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

/** Birincil eylem düğmesi — landing ile aynı görünüm. */
export function PrimaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
      style={{ boxShadow: "var(--brand-glow)" }}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/** İkincil eylem düğmesi. */
export function SecondaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl border border-border/70 bg-card/60 px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted/60"
    >
      {children}
    </Link>
  );
}

/** Alt sayfaların kapanış eylem çağrısı. */
export function MarketingCta({
  title = "Araçlarınızı hemen takibe alın",
  description = "Ücretsiz hesap oluşturun, dakikalar içinde ilk aracınızı ekleyin. Kredi kartı gerekmez.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Reveal>
      <div
        className="relative overflow-hidden rounded-3xl border border-primary/20 p-10 text-center sm:p-12"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--brand-1) 12%, transparent) 0%, color-mix(in oklab, var(--brand-2) 8%, transparent) 100%)",
        }}
      >
        <div className="mx-auto max-w-xl space-y-5">
          <h2 className="font-outfit text-section font-black text-balance">{title}</h2>
          <p className="text-muted-foreground text-pretty">{description}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <PrimaryAction href="/register">Ücretsiz Başla</PrimaryAction>
            <SecondaryAction href="/login">Giriş Yap</SecondaryAction>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
