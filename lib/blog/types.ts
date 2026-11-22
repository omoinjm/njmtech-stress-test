import type { PortableTextBlock } from "@portabletext/react";

export type PostCard = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string | null;
  isDraft: boolean;
  author: { name: string; role?: string | null } | null;
  category: { title: string; slug: string } | null;
  chars: number | null;
  mainImage?: { alt?: string; asset?: { _ref: string } } | null;
};

export type Post = Omit<PostCard, "author"> & {
  seoTitle?: string | null;
  tags?: string[] | null;
  fixesFindings?: string[] | null;
  author: { name: string; role?: string | null; bio?: string | null; sameAs?: string[] | null; slug?: string } | null;
  body: PortableTextBlock[];
};

export type FixGuide = { slug: string; title: string };
