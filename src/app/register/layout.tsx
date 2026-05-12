import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ücretsiz Kayıt Ol — CarsTrack Araç Takip",
  description: "CarsTrack'e ücretsiz kaydolun. Araçlarınızın bakım, sigorta, muayene ve servis geçmişini tek platformdan yönetin.",
  alternates: { canonical: "/register" },
  openGraph: {
    title: "Ücretsiz Kayıt Ol — CarsTrack",
    description: "CarsTrack'e ücretsiz kaydolun. Araç bakım takibi için Türkiye'nin en kolay filo yönetim sistemi.",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
