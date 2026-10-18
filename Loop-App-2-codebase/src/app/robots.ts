import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://loop-app.runs-on.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms", "/privacy"],
        disallow: ["/api/", "/screenshots-preview"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
