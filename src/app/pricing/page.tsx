import type { Metadata } from "next";
import PricingClient from "./pricing-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "Fiyatlandırma | Araç Bakım Takip ve Filo Yönetimi",
  description: "Filonuza uygun CarsTrack planını seçin. Bireysel araç sahiplerinden şirket filolarına kadar her ölçekte bütçe dostu, sözleşmesiz ve esnek araç takip paketleri.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Fiyatlandırma | CarsTrack",
    description: "Filonuza uygun CarsTrack planını seçin. Her ölçekte bütçe dostu, sözleşmesiz araç takip paketleri.",
    url: `${APP_URL}/pricing`,
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Fiyatlandırma" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fiyatlandırma | CarsTrack",
    description: "Filonuza uygun CarsTrack planını seçin.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
