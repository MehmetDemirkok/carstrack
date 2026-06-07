import type { Metadata } from "next";
import RegisterClient from "./register-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "Kayıt Ol | CarsTrack",
  description: "CarsTrack'e ücretsiz kayıt olun. Araçlarınızın periyodik bakım takibine, masraf yönetimine, sigorta ve muayene hatırlatmalarına hemen başlayın.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: "Kayıt Ol | CarsTrack",
    description: "CarsTrack'e ücretsiz kayıt olun ve araç takibine başlayın.",
    url: `${APP_URL}/register`,
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Kayıt" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kayıt Ol | CarsTrack",
    description: "CarsTrack'e ücretsiz kayıt olun ve araç takibine başlayın.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
