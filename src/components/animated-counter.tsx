"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
}

/** Sayının 0'dan değil, önceki değerden hedefe doğru ease-out ile saydığı küçük sayaç. */
export function AnimatedCounter({ value, duration = 900 }: Props) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(0);
  const firstRun = useRef(true);

  useEffect(() => {
    const from = firstRun.current ? 0 : prevValue.current;
    firstRun.current = false;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevValue.current = to;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}
