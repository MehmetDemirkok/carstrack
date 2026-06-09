"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, X } from "lucide-react";
import { getReportPhotoSignedUrls } from "@/lib/db";

/**
 * Bir arıza bildirimine ait fotoğrafları imzalı URL'lerle yükleyip küçük
 * önizleme olarak gösterir. Bir fotoğrafa tıklanınca tam ekran lightbox açar.
 * Hem sürücü hem yönetici görünümünde kullanılır.
 */
export function ReportPhotoGallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!paths || paths.length === 0) {
      setLoading(false);
      return;
    }
    getReportPhotoSignedUrls(paths)
      .then((u) => {
        if (!cancelled) setUrls(u);
      })
      .catch(() => {
        if (!cancelled) setUrls([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (!paths || paths.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <ImageIcon className="h-3 w-3" />
        Fotoğraflar ({paths.length})
      </p>

      {loading ? (
        <div className="flex gap-2">
          {paths.map((_, i) => (
            <div key={i} className="h-20 w-20 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {urls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(url)}
              className="h-20 w-20 rounded-xl overflow-hidden border border-border/40 bg-muted/30 hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Arıza fotoğrafı ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              src={active}
              alt="Arıza fotoğrafı"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-full rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
