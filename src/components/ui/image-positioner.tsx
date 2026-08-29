"use client";

import { useRef, useState } from "react";
import { Move, Crosshair } from "lucide-react";

interface ImagePositionerProps {
  imageUrl: string;
  /** 0–100, yatay odak noktası */
  x: number;
  /** 0–100, dikey odak noktası */
  y: number;
  onChange: (pos: { x: number; y: number }) => void;
  className?: string;
}

/**
 * Kapak fotoğrafının kırpma odağını doğrudan görsel üzerinde sürükleyerek
 * ayarlamak için kullanılır (Facebook/Twitter kapak fotoğrafı deneyimine benzer) —
 * tek eksenli "Üst/Alt" kaydırıcının yerini alır, hem X hem Y ekseninde tam kontrol verir.
 */
export function ImagePositioner({ imageUrl, x, y, onChange, className }: ImagePositionerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const posFromPoint = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return { x, y };
    const { left, top, width, height } = el.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(100, ((clientX - left) / width) * 100))),
      y: Math.round(Math.max(0, Math.min(100, ((clientY - top) / height) * 100))),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(posFromPoint(e.clientX, e.clientY));
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onChange(posFromPoint(e.clientX, e.clientY));
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  return (
    <div
      ref={ref}
      className={`touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"} ${className ?? ""}`}
      style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: `${x}% ${y}%` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Sürükle ipucu — henüz hiç dokunulmadıysa ortada belirir */}
      {!dragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="flex items-center gap-1.5 bg-black/45 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">
            <Move className="h-3 w-3" /> Sürükle
          </span>
        </div>
      )}
      {/* Odak noktası göstergesi */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <Crosshair className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" strokeWidth={2.5} />
      </div>
    </div>
  );
}
