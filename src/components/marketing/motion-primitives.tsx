"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  animate,
  useReducedMotion,
  type Variants,
} from "framer-motion";

/** Giriş öncesi sayfaların ortak hareket dili — tek kaynak. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

/**
 * Görünür alana girince yukarı doğru beliren sarmalayıcı.
 * `prefers-reduced-motion` açıksa hiç animasyon yapmaz — içerik anında görünür.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Aynı davranışın liste hâli — çocukları sırayla belirir. */
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

/** Görünür alana girince hedefe kadar sayan rakam. */
export function CountUp({
  to,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(to.toFixed(decimals));
      return;
    }
    const controls = animate(mv, to, { duration: 1.6, ease: EASE });
    const unsub = mv.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, decimals, mv, reduce]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
