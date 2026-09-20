import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo";

/**
 * `lastModified` bilerek sabit tarihlerdir.
 * Önceden her istekte `new Date()` dönüyordu; bu Google'a "tüm sayfalar bugün
 * güncellendi" sinyali veriyor ve lastmod'a olan güveni tamamen düşürüyordu.
 * Bir sayfanın içeriğini gerçekten değiştirdiğinde buradaki tarihi elle güncelle.
 */
const LAST_MODIFIED: Record<string, string> = {
  "/": "2026-09-20",
  "/arac-bakim-takip": "2026-09-20",
  "/ozellikler": "2026-09-19",
  "/sss": "2026-09-19",
  "/register": "2026-09-19",
  "/privacy": "2026-06-01",
};

export default function sitemap(): MetadataRoute.Sitemap {
  // `/login` bilerek yok: giriş formu ince içeriktir, Search Console'da
  // "taranan ancak dizine eklenmedi" satırı üretmekten başka işe yaramaz.
  return [
    {
      url: APP_URL,
      lastModified: LAST_MODIFIED["/"],
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${APP_URL}/arac-bakim-takip`,
      lastModified: LAST_MODIFIED["/arac-bakim-takip"],
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${APP_URL}/ozellikler`,
      lastModified: LAST_MODIFIED["/ozellikler"],
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/sss`,
      lastModified: LAST_MODIFIED["/sss"],
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${APP_URL}/register`,
      lastModified: LAST_MODIFIED["/register"],
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: LAST_MODIFIED["/privacy"],
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
