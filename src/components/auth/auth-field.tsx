"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Auth formlarının tek alan bileşeni.
 * Etiketler artık büyük harf/monospace "terminal" dilinde değil; giriş
 * öncesi yüzeylerde yalnızca Inter + Hanken Grotesk kullanılır.
 */
export function AuthField({
  label,
  hint,
  action,
  icon: Icon,
  className,
  inputClassName,
  ...props
}: React.ComponentProps<"input"> & {
  label: string;
  /** Alanın altındaki açıklama. */
  hint?: React.ReactNode;
  /** Etiketin sağındaki bağlantı/düğme (ör. "Şifremi unuttum?"). */
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  inputClassName?: string;
}) {
  const autoId = useId();
  const id = props.id ?? autoId;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          {...props}
          id={id}
          className={cn(
            "h-11 rounded-xl bg-background/60 text-sm",
            Icon ? "pl-10" : "pl-3.5",
            inputClassName
          )}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Şifre alanı — göster/gizle düğmesiyle. */
export function AuthPasswordField({
  label,
  action,
  icon,
  ...props
}: Omit<React.ComponentProps<typeof AuthField>, "type"> & {
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <AuthField
        {...props}
        label={label}
        action={action}
        icon={icon}
        type={visible ? "text" : "password"}
        inputClassName="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        className="absolute right-3 top-[2.4rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Form hatası — kırmızı şeritli uyarı. */
export function AuthError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-3"
    >
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
      <p className="text-sm text-destructive">{children}</p>
    </div>
  );
}

/** Gönder düğmesi — yükleniyor durumu dahil. */
export function AuthSubmit({
  loading,
  loadingLabel,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  loading?: boolean;
  loadingLabel: string;
}) {
  return (
    <button
      {...props}
      type="submit"
      disabled={loading || props.disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      style={{ boxShadow: "var(--brand-glow)" }}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
