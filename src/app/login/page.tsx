import type { Metadata } from "next";
import LoginClient from "./login-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "Panele Giriş | CarsTrack",
  description: "CarsTrack filo yönetim paneline giriş yapın. Bireysel araçların veya şirket filolarının bakım takvimlerine, sigorta ve muayene tarihlerine erişin.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Panele Giriş | CarsTrack",
    description: "CarsTrack filo yönetim paneline giriş yapın.",
    url: `${APP_URL}/login`,
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Giriş" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panele Giriş | CarsTrack",
    description: "CarsTrack filo yönetim paneline giriş yapın.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
