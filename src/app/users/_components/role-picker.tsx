"use client";

import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ROLE_OPTIONS } from "./team-utils";

/** Rol seçimi için 2×2 kart ızgarası; seçili rolün tam açıklaması altta gösterilir. */
export function RolePicker({
  value,
  onChange,
  isDisabled,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  /** Belirli bir rol seçeneğinin devre dışı olup olmadığını döndürür. */
  isDisabled?: (role: UserRole) => boolean;
}) {
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Rol" className="grid grid-cols-2 gap-2">
        {ROLE_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const disabled = isDisabled?.(opt.value) ?? false;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selected ? opt.activeClass : "bg-background border-border text-foreground hover:border-primary/40",
              )}
            >
              <span className="block text-xs font-semibold">{opt.label}</span>
              <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{opt.short}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {ROLE_OPTIONS.find((r) => r.value === value)?.description}
      </p>
    </div>
  );
}
