import { cn } from "@/lib/utils";
import { Reveal } from "./motion-primitives";

/**
 * Giriş öncesi sayfaların ortak bölüm kabı.
 * Dikey ritim `--spacing-section`, genişlik `--container-marketing` token'ından
 * gelir; hiçbir sayfa kendi py/max-w değerini uydurmaz.
 */
export function Section({
  children,
  className,
  tight = false,
  tone = "plain",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** Daha dar dikey ritim (ara bölümler için). */
  tight?: boolean;
  /** `muted`: hafif marka tonlu zemin + üst/alt çizgi. */
  tone?: "plain" | "muted";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        tight ? "py-section-tight" : "py-section",
        tone === "muted" && "border-y border-border/50 bg-surface-1/60",
        className
      )}
    >
      <div className="container-marketing">{children}</div>
    </section>
  );
}

/** Bölüm başlığı — üstte küçük etiket, altında başlık ve açıklama. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl space-y-4",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="font-outfit text-section font-black text-balance">{title}</h2>
      {description && (
        <p className="text-lead text-muted-foreground text-pretty">{description}</p>
      )}
    </Reveal>
  );
}
