import { sanityFetch } from "../sanity/client";
import { ADMIN_POSTS_QUERY, FIX_GUIDES_QUERY, POST_QUERY, POSTS_QUERY, SITEMAP_QUERY } from "./queries";
import type { FixGuide, Post, PostCard } from "./types";

export type { FixGuide, Post, PostCard } from "./types";

export const SITE_URL = "https://security.njmtech.co.za";

/** Published posts only: public index, sitemap and RSS. */
export const publishedPosts = () => sanityFetch<PostCard[]>(POSTS_QUERY);

/** Admins (and local dev) also see drafts, served fresh with the read token. */
export async function getPost(slug: string, opts: { includeDrafts: boolean }): Promise<Post | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const post = await sanityFetch<Post | null>(POST_QUERY, { slug }, { preview: opts.includeDrafts });
  if (!post) return null;
  if (!opts.includeDrafts && (post.isDraft || Date.parse(post.publishedAt) > Date.now())) return null;
  return post;
}

export type AdminPostStatus = "draft" | "scheduled" | "live";

/** Every post (drafts included) with a computed status for the admin list. */
export async function allPostsForAdmin(): Promise<(PostCard & { status: AdminPostStatus })[]> {
  const now = Date.now();
  const posts = await sanityFetch<PostCard[]>(ADMIN_POSTS_QUERY, {}, { preview: true });
  return posts.map((p) => ({ ...p, status: p.isDraft ? "draft" : Date.parse(p.publishedAt) > now ? "scheduled" : "live" }));
}

export const sitemapPosts = () =>
  sanityFetch<{ slug: string; publishedAt: string; updatedAt?: string | null }[]>(SITEMAP_QUERY);

/** Newest published post wins for each finding key. Pure: easy to test. */
export function buildFixGuideMap(rows: { slug: string; title: string; fixesFindings: string[] | null }[]): Record<string, FixGuide> {
  const out: Record<string, FixGuide> = {};
  for (const r of rows) for (const k of r.fixesFindings ?? []) if (!out[k]) out[k] = { slug: r.slug, title: r.title };
  return out;
}

/**
 * finding key → published fix guide. Never throws: reports must keep working if Sanity is
 * unreachable (the links just don't show).
 */
export async function fixGuideMap(): Promise<Record<string, FixGuide>> {
  try {
    return buildFixGuideMap(await sanityFetch<{ slug: string; title: string; fixesFindings: string[] | null }[]>(FIX_GUIDES_QUERY));
  } catch (e) {
    console.error("fix guide lookup failed", e);
    return {};
  }
}

/** Rough reading time (~5.5 chars/word, 220 words/min). */
export const readingMinutes = (chars: number | null | undefined) => Math.max(1, Math.round((chars ?? 0) / 5.5 / 220));
