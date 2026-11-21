import { authorOf, publishedPosts, SITE_URL } from "@/lib/blog";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const items = publishedPosts()
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
      <author>noreply@njmtech.co.za (${esc(authorOf(p).name)})</author>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NJM Tech Security Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Website security in plain English for South African businesses.</description>
    <language>en-za</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
