import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const stableDate = new Date("2026-06-07");
  return [
    {
      url: APP_URL,
      lastModified: stableDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/register`,
      lastModified: stableDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: stableDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: stableDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
