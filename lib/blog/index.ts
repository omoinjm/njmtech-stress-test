import { AUTHORS } from "./authors";
import { post as blackFriday } from "./posts/black-friday-online-store-readiness";
import type { BlogPost } from "./types";

export type { BlogPost } from "./types";

/** Register new posts here (newest first is not required; lists are sorted by date). */
const ALL: BlogPost[] = [blackFriday];

export const SITE_URL = "https://security.njmtech.co.za";

const byDateDesc = (a: BlogPost, b: BlogPost) => b.publishedAt.localeCompare(a.publishedAt);

/** Published posts only: what the public index, sitemap, RSS and report links ever see. */
export const publishedPosts = () => ALL.filter((p) => !p.draft).sort(byDateDesc);

/** Drafts are visible to admins (on any environment) and in local dev, never listed publicly. */
export function getPost(slug: string, opts: { includeDrafts: boolean }): BlogPost | null {
  const p = ALL.find((x) => x.slug === slug);
  if (!p || (p.draft && !opts.includeDrafts)) return null;
  return p;
}

export const allPostsForAdmin = () => [...ALL].sort(byDateDesc);

export const authorOf = (p: BlogPost) => AUTHORS[p.authorId] ?? AUTHORS.founder;

/** "How to fix this →" target for a scanner finding: the newest published post that covers it. */
export function fixGuideFor(findingKey: string): { slug: string; title: string } | null {
  const p = publishedPosts().find((x) => x.fixesFindings?.includes(findingKey));
  return p ? { slug: p.slug, title: p.title } : null;
}

/** Map of finding key → guide for every key that has one (small; safe to send to the client). */
export function fixGuideMap(): Record<string, { slug: string; title: string }> {
  const out: Record<string, { slug: string; title: string }> = {};
  for (const p of publishedPosts().slice().reverse()) for (const k of p.fixesFindings ?? []) out[k] = { slug: p.slug, title: p.title };
  return out;
}

/** Validate registry at import time: unique slugs, URL-safe, valid dates. */
const seen = new Set<string>();
for (const p of ALL) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) throw new Error(`Bad blog slug: ${p.slug}`);
  if (seen.has(p.slug)) throw new Error(`Duplicate blog slug: ${p.slug}`);
  if (Number.isNaN(Date.parse(p.publishedAt))) throw new Error(`Bad publishedAt for ${p.slug}`);
  seen.add(p.slug);
}
