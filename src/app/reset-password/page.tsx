import type { Metadata } from "next";
import ResetPasswordClient from "./reset-password-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export const metadata: Metadata = {
  title: "Şifre Sıfırlama | CarsTrack",
  description: "CarsTrack hesabınızın şifresini sıfırlayın. Güvenli yeni şifre oluşturma sayfası.",
  alternates: {
    canonical: "/reset-password",
  },
  openGraph: {
    title: "Şifre Sıfırlama | CarsTrack",
    description: "CarsTrack hesabınızın şifresini sıfırlayın.",
    url: `${APP_URL}/reset-password`,
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack Şifre Sıfırlama" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Şifre Sıfırlama | CarsTrack",
    description: "CarsTrack hesabınızın şifresini sıfırlayın.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
