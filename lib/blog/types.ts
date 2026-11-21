export type Author = { id: string; name: string; role: string; bio: string; url?: string };

export type BlogPost = {
  slug: string;
  title: string;
  /** Meta description / card summary (≈150 chars). */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  publishedAt: string;
  updatedAt?: string;
  authorId: string;
  /** Cluster this post belongs to (see docs/blog-strategy.md). */
  pillar: "website-security-check" | "fix-guides" | "hacked-website" | "popia" | "ecommerce";
  tags: string[];
  /** Scanner finding keys this post explains/fixes: reports link here as "How to fix this →". */
  fixesFindings?: string[];
  /** Drafts render in dev and preview only (never listed, indexed or linked in production). */
  draft?: boolean;
  /** Markdown body. Use {{SCAN_CTA}} on its own line to place the inline scan call-to-action. */
  body: string;
};
