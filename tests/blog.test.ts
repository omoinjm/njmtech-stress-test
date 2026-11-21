import { describe, expect, it } from "vitest";
import { allPostsForAdmin, fixGuideFor, fixGuideMap, getPost, publishedPosts } from "@/lib/blog";
import { CATALOG } from "@/lib/findings/catalog";
import { readingMinutes, renderPost } from "@/lib/blog/render";

describe("blog registry", () => {
  it("drafts never appear in public lists, fix links, or public lookups", () => {
    const drafts = allPostsForAdmin().filter((p) => p.draft);
    for (const d of drafts) {
      expect(publishedPosts().some((p) => p.slug === d.slug)).toBe(false);
      expect(getPost(d.slug, { includeDrafts: false })).toBeNull();
      expect(getPost(d.slug, { includeDrafts: true })?.slug).toBe(d.slug);
      for (const k of d.fixesFindings ?? []) {
        expect(fixGuideFor(k)?.slug).not.toBe(d.slug);
        expect(fixGuideMap()[k]?.slug).not.toBe(d.slug);
      }
    }
  });
  it("every fixesFindings key exists in the scanner catalog", () => {
    for (const p of allPostsForAdmin()) for (const k of p.fixesFindings ?? []) expect(CATALOG[k], `${p.slug}: ${k}`).toBeDefined();
  });
  it("every post has a meta description of sensible length and a CTA marker", () => {
    for (const p of allPostsForAdmin()) {
      expect(p.description.length, p.slug).toBeGreaterThan(70);
      expect(p.description.length, p.slug).toBeLessThan(200);
      expect(p.body, p.slug).toContain("{{SCAN_CTA}}");
    }
  });
});

describe("renderPost", () => {
  const { chunks, toc } = renderPost(
    "Intro with [ext](https://example.com) and [own](https://security.njmtech.co.za/blog).\n\n## First section\n\ntext\n\n{{SCAN_CTA}}\n\n## Second: **bold** & more\n\n| a | b |\n|---|---|\n| 1 | 2 |",
  );
  it("splits at the CTA marker", () => expect(chunks).toHaveLength(2));
  it("gives h2s stable ids and builds a TOC", () => {
    expect(toc.map((t) => t.id)).toEqual(["first-section", "second-bold-more"]);
    expect(chunks[0]).toContain('<h2 id="first-section">');
  });
  it("opens external links safely, keeps own links in-tab", () => {
    expect(chunks[0]).toContain('href="https://example.com" target="_blank" rel="noopener"');
    expect(chunks[0]).not.toContain('href="https://security.njmtech.co.za/blog" target');
  });
  it("renders GFM tables", () => expect(chunks[1]).toContain("<table>"));
  it("estimates reading time", () => expect(readingMinutes("word ".repeat(1100))).toBe(5));
});
