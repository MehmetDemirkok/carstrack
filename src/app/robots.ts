import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/privacy", "/pricing"],
        disallow: [
          "/dashboard",
          "/vehicles",
          "/history",
          "/analytics",
          "/settings",
          "/users",
          "/tasks",
          "/api/",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
