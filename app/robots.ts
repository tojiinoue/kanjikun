import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/signup", "/mypage", "/events/new", "/e/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
