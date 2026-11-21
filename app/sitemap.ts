import type { MetadataRoute } from "next";
import { SITE_URL, sitemapPosts } from "@/lib/blog";

export const dynamic = "force-dynamic"; // posts come from Sanity at request time

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await sitemapPosts().catch(() => []);
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
