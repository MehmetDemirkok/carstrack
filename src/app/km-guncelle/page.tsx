import type { Metadata } from "next";
import { Suspense } from "react";
import { KmUpdateClient } from "./km-update-client";

export const metadata: Metadata = {
  title: "Kilometre Güncelle — CarsTrack",
  description: "Haftalık araç kilometre bilginizi girin.",
  robots: { index: false, follow: false },
};

export default function KmUpdatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
          Yükleniyor…
        </div>
      }
    >
      <KmUpdateClient />
    </Suspense>
  );
}
