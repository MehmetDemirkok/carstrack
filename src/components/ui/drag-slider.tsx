"use client";

import { useRef } from "react";

interface DragSliderProps {
  value: number;          // 0–100
  onChange: (v: number) => void;
  label?: string;
  labelEnd?: string;
  className?: string;
  trackClassName?: string;
}

export function DragSlider({ value, onChange, label, labelEnd, className, trackClassName }: DragSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const valueFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return value;
    const { left, width } = track.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((clientX - left) / width) * 100)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(valueFromClientX(e.clientX));

    const onMove = (ev: MouseEvent) => {
      ev.preventDefault();
      onChange(valueFromClientX(ev.clientX));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    onChange(valueFromClientX(e.touches[0].clientX));

    const onMove = (ev: TouchEvent) => {
      if (ev.touches[0]) onChange(valueFromClientX(ev.touches[0].clientX));
    };
    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {label && <span className="text-[10px] text-muted-foreground shrink-0 select-none">{label}</span>}
      <div
        ref={trackRef}
        className={`relative h-2 rounded-full cursor-pointer select-none ${trackClassName ?? "bg-white/20"}`}
        style={{ flex: 1 }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Filled track */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white"
          style={{ width: `${value}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-md ring-2 ring-white/30 transition-transform active:scale-110"
          style={{ left: `${value}%` }}
        />
      </div>
      {labelEnd && <span className="text-[10px] text-muted-foreground shrink-0 select-none">{labelEnd}</span>}
    </div>
  );
}
