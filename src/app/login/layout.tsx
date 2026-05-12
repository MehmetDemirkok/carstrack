import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap — CarsTrack Araç Takip",
  description: "CarsTrack hesabınıza giriş yapın. Araç bakım takibi, sigorta ve muayene yönetimini hemen başlatın.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Giriş Yap — CarsTrack",
    description: "CarsTrack hesabınıza giriş yaparak araç filonuzu yönetmeye devam edin.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
