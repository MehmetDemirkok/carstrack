import type { NextConfig } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "loremflickr.com" },
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
  async headers() {
    // Uzun ömürlü "immutable" cache yalnızca production'da uygulanır.
    // Dev modda Next.js chunk adlarını tekrar kullandığı için bu header tarayıcıda
    // eski kodun servis edilmesine (HMR'ın görünmemesine) yol açar.
    const isProd = process.env.NODE_ENV === "production";
    return [
      // Security headers on all routes
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Never cache HTML pages — ensures users always get the latest deploy
      // Static assets below override this with long-lived immutable headers
      {
        source: "/((?!_next\\/static|_next\\/image|fonts\\/|favicon\\.ico|apple-touch-icon\\.png|icon\\.png|icon-192\\.png|icon-512\\.png|logo\\.svg|og-image\\.png|manifest\\.json|robots\\.txt|sitemap\\.xml).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      // Long-lived cache for versioned static assets (production only)
      ...(isProd
        ? [
            {
              source: "/_next/static/(.*)",
              headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
              ],
            },
            // Cache fonts from /public/fonts
            {
              source: "/fonts/(.*)",
              headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
              ],
            },
          ]
        : []),
      // Cache icons and images
      {
        source: "/(favicon\\.ico|apple-touch-icon\\.png|icon\\.png|icon-192\\.png|icon-512\\.png|logo\\.svg|og-image\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      // Manifest & robots — short cache to allow quick updates
      {
        source: "/(manifest\\.json|robots\\.txt|sitemap\\.xml)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/app",  destination: "/dashboard", permanent: true },
      { source: "/panel", destination: "/dashboard", permanent: true },
    ];
  },
};

export default nextConfig;
