import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Giriş gerektiren her rota + Google'ın görmesi gereken hiçbir şey içermeyen
  // statik dosyalar. Buraya bir rota eklemeyi unutmak, Search Console'da
  // "taranan ancak dizine eklenmedi" satırı olarak geri döner.
  const privatePaths = [
    "/dashboard",
    "/vehicles",
    "/history",
    "/analytics",
    "/settings",
    "/users",
    "/tasks",
    "/reports",
    "/activity",
    "/notifications",
    "/traffic-fines",
    "/yakit",
    "/km-guncelle",
    "/admin",
    "/api/",
    "/reset-password",
    "/auth/",
    "/sunum.html",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/register",
          "/privacy",
          "/sss",
          "/ozellikler",
          "/arac-bakim-takip",
        ],
        disallow: privatePaths,
      },
    ],
    // `host` direktifi bilerek yok: Google hiç desteklemedi, Yandex de 2018'de
    // bıraktı. Search Console robots.txt raporunda "kural yok sayıldı"
    // uyarısı üretmekten başka bir işe yaramıyordu.
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
