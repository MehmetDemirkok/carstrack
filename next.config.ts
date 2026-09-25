import type { NextConfig } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

// Araç fotoğrafları Supabase Storage'da tutuluyor; next/image için proje
// hostname'ini env'den türetiyoruz (ortam değişince config elle güncellenmesin).
const SUPABASE_HOSTNAME = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname || null;
  } catch {
    return null;
  }
})();

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
      ...(SUPABASE_HOSTNAME
        ? [
            {
              protocol: "https" as const,
              hostname: SUPABASE_HOSTNAME,
              pathname: "/storage/v1/object/**",
            },
          ]
        : []),
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
      // Uygulama (giriş gerektiren) sayfaları asla cache'lenmez — kullanıcı her
      // zaman en son deploy'u alır. Ayrıca `X-Robots-Tag` ile noindex: bu
      // rotaların çoğu client component olduğu için `metadata` export edemiyor,
      // header tek merkezden hepsini kapsar.
      {
        source:
          "/:path(dashboard|vehicles|history|analytics|settings|users|tasks|reports|activity|notifications|traffic-fines|yakit|admin|reset-password|auth)/:rest*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      // Giriş/kayıt: cache yok ama indekslenebilir kalsın (robots.txt allow).
      {
        source: "/:path(login|register)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      // Pazarlama sayfaları CDN'de tutulur. Önceden bunlar da `no-store` idi;
      // her Googlebot isteği soğuk SSR'a gidiyor, TTFB ve tarama bütçesi
      // gereksiz yanıyordu. Vercel yeni deploy'da cache'i zaten temizler.
      {
        source: "/:path(|ozellikler|sss|arac-bakim-takip|privacy)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      // Herkese açık ama indekslenmesini istemediğimiz statik dosya.
      {
        source: "/sunum.html",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
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
