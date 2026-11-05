import { MarketingPage, PageHero } from "@/components/marketing/marketing-page";
import { LEGAL_INFO } from "@/lib/legal";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <MarketingPage>
      <PageHero eyebrow={`Son güncelleme: ${LEGAL_INFO.lastUpdated}`} title={title} description={description} />
      <div className="container-marketing py-section-tight">
        <div className="max-w-3xl space-y-10">{children}</div>
      </div>
    </MarketingPage>
  );
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 text-sm leading-relaxed text-muted-foreground">
      <h2 className="font-outfit text-xl font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
