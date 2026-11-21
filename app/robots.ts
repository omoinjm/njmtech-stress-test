import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/blog";

// Private, per-user pages stay out of search results; marketing pages and the blog are open.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/blog"], disallow: ["/admin", "/dashboard", "/domains", "/scans", "/api", "/auth", "/payments", "/verify-domain", "/verified", "/login"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
