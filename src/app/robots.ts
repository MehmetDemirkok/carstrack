import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
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
    "/api/",
    "/reset-password",
    "/auth/",
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
    host: APP_URL.replace(/^https?:\/\//, ""),
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
