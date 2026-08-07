"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  size?: number;
  stroke?: number;
  className?: string;
}

function tone(score: number) {
  if (score >= 85) return { stroke: "var(--success)", label: "Mükemmel", glow: "oklch(0.55 0.12 162 / 0.35)" };
  if (score >= 65) return { stroke: "oklch(0.72 0.16 75)", label: "İyi", glow: "oklch(0.72 0.16 75 / 0.3)" };
  return { stroke: "var(--destructive)", label: "Kritik", glow: "oklch(0.55 0.2 28 / 0.35)" };
}

export function HealthRing({ score, size = 168, stroke = 12, className }: Props) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const t = tone(clamped);
  const offset = c * (1 - clamped / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Filo sağlık skoru ${clamped} — ${t.label}`}
    >
      <div
        className="absolute inset-3 rounded-full opacity-60 blur-2xl"
        style={{ background: t.glow }}
        aria-hidden
      />
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/60"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={t.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          className="font-outfit text-[44px] font-bold leading-none tracking-tighter tabular-nums"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0 : 0.5, delay: 0.3 }}
        >
          {clamped}
        </motion.span>
        <span className="mt-1 text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          Sağlık
        </span>
      </div>
    </div>
  );
}
