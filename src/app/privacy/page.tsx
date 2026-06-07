import type { Metadata } from "next";
import PrivacyClient from "./privacy-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | CarsTrack",
  description: "CarsTrack gizlilik politikası. Kullanıcı verilerinin güvenliği, saklanması ve üçüncü taraflarla paylaşılmaması konusundaki taahhütlerimiz hakkında bilgi edinin.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Gizlilik Politikası | CarsTrack",
    description: "CarsTrack kullanıcı verilerinin güvenliği ve gizliliği politikası.",
    url: `${APP_URL}/privacy`,
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Gizlilik Politikası" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gizlilik Politikası | CarsTrack",
    description: "CarsTrack kullanıcı verilerinin güvenliği ve gizliliği politikası.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
