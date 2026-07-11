import type { Metadata, Viewport } from "next";
import { Inter, Hanken_Grotesk, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ShellWrapper } from "@/components/layout/shell-wrapper";
import { LanguageProvider } from "@/context/language-context";
import { AuthProvider } from "@/context/auth-context";
import { DataProvider } from "@/context/data-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPaletteProvider } from "@/context/command-palette-context";
import { CommandPalette } from "@/components/command-palette";
import { ProfileCompletionNotice } from "@/components/profile-completion-notice";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Hanken Grotesk drives all heading/display text (exposed as --font-outfit so every
// existing `font-outfit` usage picks it up automatically).
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700", "800", "900"],
});
// JetBrains Mono for label-caps / mono accents (exposed as --font-ibm-mono).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-mono",
  weight: ["400", "500", "600"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

// Paste your Google Search Console verification code here after adding the property
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";

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
    "fleet management",
    "araç yönetim sistemi",
    "carstrack",
  ],
  authors: [{ name: "CarsTrack", url: APP_URL }],
  creator: "CarsTrack",
  publisher: "CarsTrack",
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  ...(GOOGLE_SITE_VERIFICATION && {
    verification: { google: GOOGLE_SITE_VERIFICATION },
  }),
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CarsTrack",
  url: APP_URL,
  description:
    "Araçlarınızın bakım geçmişini, sigorta ve muayene tarihlerini ve masraflarını tek yerden takip edin.",
  inLanguage: "tr-TR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${APP_URL}/vehicles?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${hankenGrotesk.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground min-h-[100dvh] flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <DataProvider>
              <TooltipProvider delay={300}>
              <CommandPaletteProvider>
                <div className="flex w-full min-h-[100dvh] relative">
                  <ShellWrapper>{children}</ShellWrapper>
                </div>
                <CommandPalette />
                <ProfileCompletionNotice />
                <ServiceWorkerRegister />
              </CommandPaletteProvider>
              </TooltipProvider>
              </DataProvider>
            </AuthProvider>
          </LanguageProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
