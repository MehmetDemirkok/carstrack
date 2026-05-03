import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { LanguageProvider } from "@/context/language-context";
import { AuthProvider } from "@/context/auth-context";
import { CommandPaletteProvider } from "@/context/command-palette-context";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "CarsTrack — Araç Bakım Takip",
    template: "%s | CarsTrack",
  },
  description:
    "Araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini ve masraflarını tek yerden takip edin. Vehicle maintenance tracking, service history and car expense management.",
  applicationName: "CarsTrack",
  keywords: [
    "araç bakım takip",
    "vehicle maintenance tracking",
    "service history tracking",
    "car expense tracking",
    "araç masraf takip",
    "sigorta takip",
    "muayene takip",
  ],
  authors: [{ name: "CarsTrack" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "CarsTrack",
    title: "CarsTrack — Araç Bakım Takip",
    description:
      "Araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini ve masraflarını tek yerden takip edin.",
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "CarsTrack" }],
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "CarsTrack — Araç Bakım Takip",
    description:
      "Araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini ve masraflarını tek yerden takip edin.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground min-h-[100dvh] flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <CommandPaletteProvider>
                <div className="flex w-full min-h-[100dvh] relative">
                  <Sidebar />
                  <div className="flex-1 flex flex-col md:ml-64 w-full relative">
                    <TopBar />
                    <main className="flex-1 overflow-x-hidden pb-20 md:pb-6 max-w-5xl mx-auto w-full">
                      {children}
                    </main>
                    <BottomNav />
                  </div>
                </div>
                <CommandPalette />
              </CommandPaletteProvider>
            </AuthProvider>
          </LanguageProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
