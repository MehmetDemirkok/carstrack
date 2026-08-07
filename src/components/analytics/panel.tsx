"use client";

import { cn } from "@/lib/utils";

interface PanelProps extends React.ComponentProps<"section"> {
  padded?: boolean;
}

/** Soft elevated surface — shadow over border, 20px radius. */
export function Panel({ className, padded = true, children, ...props }: PanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-card",
        "shadow-[0_1px_2px_oklch(0_0_0/0.04),0_8px_24px_-12px_oklch(0_0_0/0.08)]",
        "ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
        "dark:shadow-[0_1px_2px_oklch(0_0_0/0.3),0_12px_32px_-12px_oklch(0_0_0/0.45)]",
        padded && "p-6",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ eyebrow, title, titleId, description, action, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 id={titleId} className="font-outfit text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
